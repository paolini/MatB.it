const { ObjectId } = require('mongodb')

module.exports = {
  async up(db, client) {
    const notesColl = db.collection('notes')
    const versionsColl = db.collection('note_versions')

    const cursor = notesColl.find({})
    let processed = 0
    while (await cursor.hasNext()) {
      const note = await cursor.next()

      // If note has no version pointer, fallback to author-only contributor
      if (!note.note_version_id) {
        const authorId = note.author_id || null
        const now = note.created_on || new Date()
        const contributors = authorId ? [{ user_id: authorId, contribution_count: 1, first_contribution: now, last_contribution: now }] : (note.contributors || [])
        await notesColl.updateOne({ _id: note._id }, { $set: { contributors } })
        processed++
        continue
      }

      // Traverse version graph (parents) starting from head
      const stack = [note.note_version_id]
      const seen = new Set()
      const perUser = {}

      while (stack.length) {
        const vid = stack.pop()
        const key = vid.toString()
        if (seen.has(key)) continue
        seen.add(key)

        const version = await versionsColl.findOne({ _id: vid })
        if (!version) continue

        const authorId = version.author_id ? version.author_id.toString() : null
        const created = version.created_on || new Date()
        if (authorId) {
          if (!perUser[authorId]) perUser[authorId] = { count: 0, first: created, last: created }
          perUser[authorId].count += 1
          if (created && perUser[authorId].first > created) perUser[authorId].first = created
          if (created && perUser[authorId].last < created) perUser[authorId].last = created
        }

        if (version.parent_version_id) stack.push(version.parent_version_id)
        if (version.second_parent_version_id) stack.push(version.second_parent_version_id)
      }

      // Build contributors array
      const contributors = Object.keys(perUser).map(uid => ({
        user_id: new ObjectId(uid),
        contribution_count: perUser[uid].count,
        first_contribution: perUser[uid].first,
        last_contribution: perUser[uid].last
      }))

      // If no contributors found (weird), fallback to existing contributors or author
      if (contributors.length === 0) {
        if (Array.isArray(note.contributors) && note.contributors.length > 0) {
          // keep existing
          await notesColl.updateOne({ _id: note._id }, { $set: { contributors: note.contributors } })
        } else if (note.author_id) {
          const now = note.created_on || new Date()
          await notesColl.updateOne({ _id: note._id }, { $set: { contributors: [{ user_id: note.author_id, contribution_count: 1, first_contribution: now, last_contribution: now }] } })
        }
      } else {
        await notesColl.updateOne({ _id: note._id }, { $set: { contributors } })
      }

      processed++
      if (processed % 100 === 0) {
        // progress log
        // eslint-disable-next-line no-console
        console.log(`recompute-contributors: processed ${processed} notes`)
      }
    }

    // Final log
    // eslint-disable-next-line no-console
    console.log(`recompute-contributors: done, processed ${processed} notes`)
  },

  async down(db, client) {
    // No-op: no backup, cannot restore
    return
  }
}
