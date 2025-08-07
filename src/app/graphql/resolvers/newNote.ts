import type { MutationNewNoteArgs } from '../generated'

import { Context } from '../types'
import { getNotesCollection, getNoteVersionsCollection } from '@/lib/models'

const newNote = async function (
    _parent: unknown,
    args: MutationNewNoteArgs,
    context: Context
): Promise<object> {
    if (!context.user) throw new Error('Not authenticated')
    const collection = getNotesCollection(context.db)
    const versionsCollection = getNoteVersionsCollection(context.db)
    const now = new Date()
    const title = args.title || ''
    const delta = args.delta || {ops: []}
    const variant = args.variant || 'default'
    const author_id = context.user._id
    
    // Prima crea la versione con il contenuto
    const noteVersion = {
        title, delta, variant, author_id, 
        created_on: now,
    }
    const versionResult = await versionsCollection.insertOne(noteVersion)
    
    // Poi crea la nota che punta alla versione
    const note = {
        ...noteVersion,
        note_version_id: versionResult.insertedId,
        contributors: [{
            user_id: author_id,
            contribution_count: 1,
            first_contribution: now,
            last_contribution: now
        }],
        private: typeof args.private === 'boolean' ? args.private : false,
        created_on: now
    }
    const result = await collection.insertOne(note)
    if (!result.acknowledged) throw new Error('Failed to create note')
    return result.insertedId
}

export default newNote
