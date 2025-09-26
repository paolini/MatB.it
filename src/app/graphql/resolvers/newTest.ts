import type { MutationNewTestArgs } from '../generated'
import { ObjectId } from 'bson'

import { Context } from '../types'
import { getNotesCollection, getTestsCollection, getClassesCollection } from '@/lib/models'

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

    const class_id = args.class_id || null
    if (class_id) {
        // Verifica che la classe esista e che l'utente abbia i permessi
        const classDoc = await getClassesCollection(context.db).findOne({ _id: class_id })
        if (!classDoc) throw new Error('Classe non trovata')
        
        const userId = new ObjectId(context.user._id)
        const isOwner = classDoc.owner_id.equals(userId)
        const isTeacher = classDoc.teachers.some((teacherId: ObjectId) => teacherId.equals(userId))
        
        if (!isOwner && !isTeacher) {
            throw new Error('Solo il proprietario o un insegnante possono creare test in questa classe')
        }
    }
    
    const testsCollection = getTestsCollection(context.db)
    const now = new Date()
    const testDoc = {
        note_id: new ObjectId(args.note_id),
        author_id: new ObjectId(context.user._id),
        created_on: now,
        title: args.title || '',
        open_on: null,
        close_on: null,
        private: args.private || false,
        class_id
    }
    await testsCollection.insertOne(testDoc)
    return true
}
