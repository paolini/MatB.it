import type { MutationNewNoteArgs } from '../generated'
import { ObjectId } from 'bson'

import { Context } from '../types'
import { getNotesCollection, getNoteVersionsCollection, validateContentCreation, getClassesCollection } from '@/lib/models'

const newNote = async function (
    _parent: unknown,
    args: MutationNewNoteArgs,
    context: Context
): Promise<object> {
    if (!context.user) throw new Error('Not authenticated')
    
    const collection = getNotesCollection(context.db)
    const versionsCollection = getNoteVersionsCollection(context.db)
    const now = new Date()
    const title = args.title || ''
    const delta = args.delta || {ops: []}
    const variant = args.variant || 'default'
    const author_id = context.user._id
    
    const class_id = args.class_id || null
    if (class_id) {
        // Verifica che la classe esista e che l'utente abbia i permessi
        const classDoc = await getClassesCollection(context.db).findOne({ _id: class_id })
        if (!classDoc) throw new Error('Classe non trovata')
        
        const isOwner = classDoc.owner_id.equals(author_id)
        const isTeacher = classDoc.teachers.some(teacherId => teacherId.equals(author_id))
        
        if (!isOwner && !isTeacher) throw new Error('Solo il proprietario o un insegnante possono creare note in questa classe')
    }
    
    // Prima crea la versione con il contenuto
    const noteVersion = {
        title, delta, variant, author_id, 
        created_on: now,
    }
    const versionResult = await versionsCollection.insertOne(noteVersion)
    
    // Poi crea la nota che punta alla versione
    const note = {
        ...noteVersion,
        note_version_id: versionResult.insertedId,
        contributors: [{
            user_id: author_id,
            contribution_count: 1,
            first_contribution: now,
            last_contribution: now
        }],
        private: !!args.private,
        hide_title: !!args.hide_title,
        class_id: class_id || null,
        created_on: now
    }
    const result = await collection.insertOne(note)
    if (!result.acknowledged) throw new Error('Failed to create note')
    return result.insertedId
}

export default newNote
