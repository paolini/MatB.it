import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { Note, Test } from '../generated'
import { getNotesCollection, getTestsCollection, 
  TEST_PIPELINE, NOTE_PIPELINE, verifyAccessToken, getClassesCollection } from '@/lib/models'

export default async function note (_parent: unknown, {_id}: { _id: ObjectId }, context: Context): Promise<Note | null> {
    const collection = getNotesCollection(context.db)
    
    // Recupera la nota con pipeline
    const notes = await collection.aggregate<Note>([
        { $match: { _id } },
        ...NOTE_PIPELINE,
    ]).toArray()
    if (notes.length === 0) throw new Error('Note not found')
    if (notes.length > 1) throw new Error('Multiple notes found')
    const note = notes[0]
    let classRole: 'owner'|'teacher'|'student'|null = null
    let class_id = note?.class_id ?? null
    if (class_id && context.user) {
        const classesCollection = getClassesCollection(context.db)
        const classe = await classesCollection.findOne({ _id: class_id })
        if (classe && context.user) {
            if (classe.owner_id.equals(context.user._id)) classRole = 'owner'
            if (classe.teachers.some(t => t.equals(context.user!._id))) classRole = 'teacher'
            if (classe.students.some(s => s.equals(context.user!._id))) classRole = 'student'
        }
    }
    // Verifica permessi direttamente
    function throwAuthError() {
        throw new Error('Not authorized')
    }

    if (note.class_id) {
        if (note.private) {
            // Solo owner/teacher della classe
            if (classRole !== 'owner' && classRole !== 'teacher') throwAuthError()
        } else {
            // Chiunque della classe
            if (!classRole) throwAuthError()
        }
    } else if (note.private) {
        // Solo autore
        if (!context.user || !note.author_id.equals(context.user._id)) throwAuthError()
    }
    
    // Carica i test collegati
    const testsCollection = getTestsCollection(context.db)
    const tests = await testsCollection.aggregate<Test>([
      { $match: { note_id: _id } },
      ...TEST_PIPELINE,
    ]).toArray()
    return { ...note, tests }
}
