import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { Submission, Test } from '../generated'
import { getSubmissionsCollection } from '@/lib/models'

const SUBMISSION_PIPELINE = [
  // inserisce i dati dell'autore
  {
    $lookup: {
      from: 'users',
      localField: 'author_id',
      foreignField: '_id',
      as: 'author'
    }
  }, {
    $unwind: { path: '$author', preserveNullAndEmptyArrays: true }
  },
]

export default async function (_parent: unknown, {_id}: { _id: ObjectId }, context: Context): Promise<Submission | null> {
    const user = context.user
    const collection = getSubmissionsCollection(context.db)
    const items = await collection.aggregate<Submission>([
        { $match: { _id } },
        ...SUBMISSION_PIPELINE,
    ]).toArray()

    if (items.length === 0) throw new Error('Submission not found')
    const submission = items[0]

    return submission
}
