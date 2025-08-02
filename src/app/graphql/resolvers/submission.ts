import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { Submission, Test } from '../generated'
import { getSubmissionsCollection, SUBMISSION_PIPELINE } from '@/lib/models'

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
