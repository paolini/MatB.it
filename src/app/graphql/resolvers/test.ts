import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { Note, Test } from '../generated'
import { getNotesCollection, getTestsCollection } from '@/lib/models'

const TEST_PIPELINE = [
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
]

export default async function test (_parent: unknown, {_id}: { _id: ObjectId }, context: Context): Promise<Test | null> {
    const collection = getTestsCollection(context.db)
    const tests = await collection.aggregate<Test>([
        { $match: { _id } },
        // Mostra la nota se non è privata, oppure se l'utente autenticato è l'autore
        { $match: {
            $or: [
            { private: { $ne: true } },
            ...(context.user ? [{ author_id: context.user._id }] : [])
            ]
        }
        },
        ...TEST_PIPELINE,
        { // estrai elemento 0 dell'array
          $replaceRoot: { newRoot: { $mergeObjects: [ { $arrayElemAt: ['$note', 0] }, '$$ROOT' ] } }
        }
    ]).toArray()

    if (tests.length === 0) throw new Error('Test not found')

    return tests[0]
}
