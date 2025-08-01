import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { Test } from '../generated'
import { getTestsCollection, TEST_PIPELINE } from '@/lib/models'

export default async function test (_parent: unknown, {_id}: { _id: ObjectId }, context: Context): Promise<Test | null> {
    const user = context.user
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
        {
            // Aggiunge le sottomissioni dell'utente corrente
            $lookup: {
                from: 'submissions',
                let: { test_id: '$_id', user_id: user?._id },
                pipeline: [
                    { $match: { $expr: { $and: [ 
                        { $eq: ['$test_id', '$$test_id'] },
                        { $eq: ['$author_id', '$$user_id'] } ] } } },
                    { $sort: { started_on: -1 } }
                ],
                as: 'my_submissions'
            }
        }
    ]).toArray()

    if (tests.length === 0) throw new Error('Test not found')
    const test = tests[0]

    return test
}
