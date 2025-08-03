import { ObjectId } from 'mongodb'
import type { MutationNewSubmissionArgs, Submission } from '../generated'

import { Context} from '../types'
import { getNotesCollection, getSubmissionsCollection, getTestsCollection, MongoNote } from '@/lib/models'
import document_from_delta from '@/lib/myquill/document_from_delta'
import { Delta } from '@/lib/myquill/myquill'

export default async function (
    _parent: unknown,
    args: MutationNewSubmissionArgs,
    context: Context
): Promise<ObjectId> {
    const now = new Date()
    if (!context.user) throw new Error('Not authenticated')
    const testsCollection = getTestsCollection(context.db)
    const tests = await testsCollection.aggregate([
        { $match: { _id: args.test_id } },
        // Join con la nota collegata
        { $lookup: {
            from: 'notes',
            localField: 'note_id',
            foreignField: '_id',
            as: 'note'
        }}, { $unwind: '$note' },
    ]).toArray()
    if (tests.length === 0) throw new Error('Test not found')
    const test = tests[0]
    if (test.open_on && test.open_on > now) throw new Error('Test not yet open')
    if (test.close_on && test.close_on < now) throw new Error('Test already closed')

    const notesCollection = getNotesCollection(context.db)

    const document = await document_from_delta(test.note.delta, {
            submission: true,
            note_loader: async function(note_id: string) {
                const note = await notesCollection.findOne({ _id: new ObjectId(note_id) })
                return note ? {
                    delta: note.delta as Delta,
                    variant: note.variant,
                    title: note.title
                } : null
            }
        })

    const collection = getSubmissionsCollection(context.db)
    const doc = {
        test_id: test._id,
        note_version_id: test.note.note_version_id,
        author_id: context.user._id,
        started_on: now,
        completed_on: null,
        document,
    }
    const res = await collection.insertOne(doc)
    return res.insertedId
}