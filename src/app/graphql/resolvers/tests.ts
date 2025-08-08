import { Context } from '../types'
import { getTestsCollection } from '@/lib/models'
import { Test, QueryTestsArgs } from '../generated'

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

export default async function tests (_parent: unknown, args: QueryTestsArgs, context: Context) {
    const userId = context.user?._id
    const now = new Date()
    return await getTestsCollection(context.db)
        .aggregate<Test>([
            { $match: {
                $or: [
                { private: { $ne: true } },
                ...(userId ? [{ author_id: userId }] : [])
                ]
            }},
            { $match: {
                ...(args.mine ? { author_id: userId } : {}),
                ...(args.open
                  ? {
                      $and: [
                        {
                          $or: [
                            { open_on: null },
                            { open_on: { $lte: now } }
                          ]
                        },
                        {
                          $or: [
                            { close_on: null },
                            { close_on: { $gte: now } }
                          ]
                        }
                      ]
                    }
                  : {}),  
            }},
            { $sort: { created_on: -1 } },
            ...(args.limit ? [{ $limit: args.limit }] : []),
            ...TESTS_PIPELINE
        ])
        .toArray()
}

