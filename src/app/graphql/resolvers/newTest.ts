import type { MutationNewTestArgs } from '../generated'

import { Context } from '../types'
import { getNotesCollection, getTestsCollection } from '@/lib/models'

export default async function resolver (
    _parent: unknown,
    args: MutationNewTestArgs,
    context: Context
): Promise<boolean> {
    if (!context.user) throw new Error('Not authenticated')
    const notesCollection = getNotesCollection(context.db)
    const note = await notesCollection.findOne({ _id: args.note_id })
    if (!note) throw new Error('Note not found')
    if (note.private && !note.author_id.equals(context.user._id)) {
    throw new Error('Not authorized to create test for this note')
    }
    const testsCollection = getTestsCollection(context.db)
    const now = new Date()
    const testDoc = {
    note_id: args.note_id,
    author_id: context.user._id,
    created_on: now,
    title: args.title || '',
    open_on: null,
    close_on: null
    }
    await testsCollection.insertOne(testDoc)
    return true
}
