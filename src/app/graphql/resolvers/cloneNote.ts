import { ObjectId } from 'bson'
import { Context } from '../types'
import { getNotesCollection } from '@/lib/models'

const cloneNote = async function (
    _parent: unknown,
    args: { note_id: string },
    context: Context
): Promise<ObjectId> {
    if (!context.user) throw new Error('Not authenticated')
    const notesCollection = getNotesCollection(context.db)
    const now = new Date()
    const { note_id } = args

    // Carica la nota originale
    const originalNote = await notesCollection.findOne({ _id: new ObjectId(note_id) })
    if (!originalNote) throw new Error('Nota originale non trovata')

    // Controllo permessi di accesso
    const userId = context.user._id.toString()
    let canAccess = false
    if (originalNote.author_id.toString() === userId) {
        canAccess = true
    } else if (originalNote.class_id) {
        // Nota collegata a una classe
        const classDoc = await context.db.collection('classes').findOne({ _id: originalNote.class_id })
        if (classDoc) {
            const isTeacher = classDoc.teachers.some((t: any) => t.toString() === userId)
            const isOwner = classDoc.owner_id.toString() === userId
            const isStudent = classDoc.students.some((s: any) => s.toString() === userId)
            if (isTeacher || isOwner || isStudent) {
                canAccess = true
            }
        } else {
        throw new Error('Classe associata alla nota non trovata')
        }
    } else if (!originalNote.private) {
        // Nota pubblica senza classe: accessibile a tutti
        canAccess = true
    }
    if (!canAccess) throw new Error('Non hai i permessi per clonare questa nota')

    // Espandi la lista dei contributors
    // La lista dei contributors è una copia esatta di quella originale
    let contributors = Array.isArray(originalNote.contributors) ? [...originalNote.contributors] : []
    const newNote = {
        title: originalNote.title + ' (copia)',
        hide_title: originalNote.hide_title,
        delta: originalNote.delta,
        variant: originalNote.variant,
        author_id: context.user._id,
        note_version_id: originalNote.note_version_id,
        contributors,
        private: originalNote.private,
        class_id: originalNote.class_id,
        created_on: now
    }
    const noteResult = await notesCollection.insertOne(newNote)
    if (!noteResult.acknowledged) throw new Error('Failed to clone note')
    return noteResult.insertedId
}

export default cloneNote
