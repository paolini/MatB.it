import { ObjectId } from 'mongodb'
import type { MutationNewSubmissionArgs } from '../generated'

import { Context} from '../types'
import { getSubmissionsCollection, getTestsCollection } from '@/lib/models'

const newSubmission = async function (
    _parent: unknown,
    args: MutationNewSubmissionArgs,
    context: Context
): Promise<ObjectId> {
    const now = new Date()
    if (!context.user) throw new Error('Not authenticated')
    const testsCollection = getTestsCollection(context.db)
    const tests = await testsCollection.aggregate([
        { $match: { _id: args.test_id } },
        // Verifica che il test sia accessibile all'utente (non privato o utente è l'autore)
        { $match: {
            $or: [
            { private: { $ne: true } },
            { author_id: context.user._id }
            ]
        }},
    ]).toArray()
    if (tests.length === 0) throw new Error('Test not found')
    const test = tests[0]
    if (test.open_on && test.open_on > now) throw new Error('Test not yet open')
    if (test.close_on && test.close_on < now) throw new Error('Test already closed')

    const collection = getSubmissionsCollection(context.db)
    // Controllo: non permettere più di una submission per test/utente
    const existing = await collection.findOne({ test_id: test._id, author_id: context.user._id })
    if (existing) throw new Error('Already submitted for this test')
    const doc = {
        test_id: test._id,
        author_id: context.user._id,
        started_on: now,
        completed_on: null,
        answers: [],
    }
    const res = await collection.insertOne(doc)
    return res.insertedId
}

export default newSubmission