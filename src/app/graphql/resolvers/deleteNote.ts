import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { getNotesCollection, getDeletedNotesCollection } from '@/lib/models'

export default async function (
      _parent: unknown,
      args: { _id: ObjectId },
      context: Context
    ): Promise<boolean> {
    const { _id } = args
    const notesCollection = getNotesCollection(context.db)
    const note = await notesCollection.findOne({ _id })
    if (!note) throw new Error('Note not found')
    if (!context.user) throw new Error('Not authenticated')
    if (!note.author_id.equals(context.user._id)) throw new Error('Not authorized')
    
    // Sposta la nota nella collection deletedNotes
    const deletedNotesCollection = getDeletedNotesCollection(context.db)
    const deletedNote = {
    ...note,
    deleted_on: new Date(),
    deleted_by: context.user._id
    }
    
    await deletedNotesCollection.insertOne(deletedNote)
    await notesCollection.deleteOne({ _id })
    return true
}

