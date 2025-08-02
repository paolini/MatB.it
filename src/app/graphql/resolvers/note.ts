import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { Note, Test } from '../generated'
import { getNotesCollection, getTestsCollection, 
  TEST_PIPELINE, NOTE_PIPELINE } from '@/lib/models'

export default async function note (_parent: unknown, {_id}: { _id: ObjectId }, context: Context): Promise<Note | null> {
    const collection = getNotesCollection(context.db)
    const notes = await collection.aggregate<Note>([
        { $match: { _id } },
        // Mostra la nota se non è privata, oppure se l'utente autenticato è l'autore
        { $match: {
            $or: [
            { private: { $ne: true } },
            ...(context.user ? [{ author_id: context.user._id }] : [])
            ]
        }
        },
        ...NOTE_PIPELINE
    ]).toArray()

    if (notes.length === 0) throw new Error('Note not found')
    if (notes.length > 1) throw new Error('Multiple notes found')
    const note = notes[0]
    // Carica i test collegati
    const testsCollection = getTestsCollection(context.db)
    const tests = await testsCollection.aggregate<Test>([
      { $match: { note_id: _id } },
      ...TEST_PIPELINE,
    ]).toArray()
    return { ...note, tests }
}
