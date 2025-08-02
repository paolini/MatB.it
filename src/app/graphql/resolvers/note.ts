import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { Note } from '../generated'
import { getNotesCollection, getTestsCollection } from '@/lib/models'

export const NOTE_PIPELINE = [
  {
    $lookup: {
      from: 'users',
      localField: 'author_id',
      foreignField: '_id',
      as: 'author'
    }
  },
  {
    // da array a oggetto singolo
    $unwind: '$author'
  },
  {
    // Aggiungiamo updated_on basato sulla versione corrente
    $lookup: {
      from: 'note_versions',
      localField: 'note_version_id',
      foreignField: '_id',
      as: 'version'
    }
  },
  {
    $unwind: '$version'
  },
  {
    $addFields: {
      updated_on: '$version.created_on' // L'ultima modifica è quando è stata creata l'ultima versione
    }
  }
]

    
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
    const tests = await testsCollection.find({ note_id: _id }).toArray()
    return { ...note, tests }
}
