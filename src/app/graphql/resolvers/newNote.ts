import type { MutationNewNoteArgs } from '../generated'

import { Context } from '../types'
import { Note } from '../generated'
import { getNotesCollection, getNoteVersionsCollection, NOTE_PIPELINE } from '@/lib/models'

export default async function (
    _parent: unknown,
    args: MutationNewNoteArgs,
    context: Context
): Promise<Note | null> {
    if (!context.user) throw new Error('Not authenticated')
    const collection = getNotesCollection(context.db)
    const versionsCollection = getNoteVersionsCollection(context.db)
    const now = new Date()
    
    // Prima crea la versione con il contenuto
    const noteVersion = {
        title: args.title,
        delta: args.delta || { ops: [{ insert: '\n' }] }, // Delta passato o vuoto
        variant: args.variant || 'default', // Variant passato o default
        author_id: context.user._id,
        created_on: now
    }
    const versionResult = await versionsCollection.insertOne(noteVersion)
    
    // Poi crea la nota che punta alla versione
    const note = {
        title: args.title, // title dell'ultima versione
        delta: args.delta || { ops: [{ insert: '\n' }] }, // delta dell'ultima versione
        variant: args.variant || 'default', // variant dell'ultima versione
        author_id: context.user._id,
        note_version_id: versionResult.insertedId,
        contributors: [{
            user_id: context.user._id,
            contribution_count: 1,
            first_contribution: now,
            last_contribution: now
        }],
        private: typeof args.private === 'boolean' ? args.private : false,
        created_on: now
    }
    const result = await collection.insertOne(note)
    const notes = await collection.aggregate<Note>([
    { $match: { _id: result.insertedId } },
    ...NOTE_PIPELINE
    ]).toArray()
    return notes[0] || null
}
