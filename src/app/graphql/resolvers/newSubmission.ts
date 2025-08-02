import { ObjectId } from 'mongodb'
import type { MutationNewSubmissionArgs, Submission } from '../generated'

import { Context} from '../types'
import { getSubmissionsCollection, getTestsCollection } from '@/lib/models'

export default async function (
    _parent: unknown,
    args: MutationNewSubmissionArgs,
    context: Context
): Promise<ObjectId> {
    const now = new Date()
    if (!context.user) throw new Error('Not authenticated')
    const testsCollection = getTestsCollection(context.db)
    const test = await testsCollection.findOne({ _id: args.test_id })
    if (!test) throw new Error('Test not found')
    if (test.open_on && test.open_on > now) throw new Error('Test not yet open')
    if (test.close_on && test.close_on < now) throw new Error('Test already closed')
    const collection = getSubmissionsCollection(context.db)
    const doc = {
        test_id: test._id,
        author_id: context.user._id,
        started_on: now,
        completed_on: null,
        answers: null,
        score: null
    }
    const res = await collection.insertOne(doc)
    return res.insertedId
}
