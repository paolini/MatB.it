import { Context } from '../types'
import { getTestsCollection } from '@/lib/models'
import { Test } from '../generated'

export const TESTS_PIPELINE = [
  { $sort: { created_on: -1 } }, // Ordina per data di creazione del Test
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

export default async function tests (_parent: unknown, _args: unknown, context: Context) {
    const userId = context.user?._id
    return await getTestsCollection(context.db)
        .aggregate<Test>([
            { $match: {
                $or: [
                { private: { $ne: true } },
                ...(userId ? [{ author_id: userId }] : [])
                ]
            }
            },
            ...TESTS_PIPELINE
        ])
        .toArray()
}

