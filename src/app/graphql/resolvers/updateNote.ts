import type { MutationUpdateNoteArgs } from '../generated'

import { Context } from '../types'
import { Note } from '../generated'
import { getNotesCollection, NOTE_PIPELINE } from '@/lib/models'

const updateNote = async function (
      _parent: unknown,
      args: MutationUpdateNoteArgs,
      context: Context
    ): Promise<Note | null> {
    const { _id, title, hide_title, delta, private: isPrivate, variant } = args
    const collection = getNotesCollection(context.db)
    const note = await collection.findOne({ _id })
    if (!note) throw new Error('Note not found')
    
    if (!context.user) throw new Error('Not authenticated')
    
    if (!note.author_id.equals(context.user._id)) throw new Error('Not authorized')
    
    const update: Partial<{
      title: string
      hide_title: boolean
      delta: object
      private: boolean
      variant: string
    }> = {}
    if (typeof title === 'string') update.title = title
    if (typeof hide_title === 'boolean') update.hide_title = hide_title
    if (delta) update.delta = delta
    if (typeof isPrivate === 'boolean') update.private = isPrivate
    if (typeof variant === 'string') update.variant = variant
    if (Object.keys(update).length === 0) throw new Error('No fields to update')
    await collection.updateOne({ _id }, { $set: update })
    // restituisci la nota aggiornata
    const notes = await collection.aggregate<Note>([
    { $match: { _id } },
    ...NOTE_PIPELINE
    ]).toArray()
    return notes[0] || null
}

updateNote.displayName = 'updateNote'
export default updateNote