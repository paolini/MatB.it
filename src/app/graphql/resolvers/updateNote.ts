import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { getNotesCollection, NOTE_PIPELINE, getClassesCollection } from '@/lib/models'
import { QuillDelta } from '@/lib/myquill/document'

const updateNote = async function (
      _parent: unknown,
      args: any, // Usando any per evitare problemi con i tipi generati
      context: Context
    ): Promise<any> {
    const { _id, title, hide_title, delta, private: isPrivate, variant, class_id } = args
    const collection = getNotesCollection(context.db)
    const note = await collection.findOne({ _id: new ObjectId(_id) })
    if (!note) throw new Error('Note not found')
    
    if (!context.user) throw new Error('Not authenticated')
    
    if (!note.author_id.equals(new ObjectId(context.user._id))) throw new Error('Not authorized')
    
    const update: any = {}
    if (typeof title === 'string') update.title = title
    if (typeof hide_title === 'boolean') update.hide_title = hide_title
    if (delta) update.delta = delta as QuillDelta
    if (typeof isPrivate === 'boolean') update.private = isPrivate
    if (typeof variant === 'string') update.variant = variant
    
    // ✨ NUOVO: Gestione class_id
    if (class_id !== undefined) {
        if (class_id === null) {
            // Rimuovi dalla classe
            update.class_id = undefined
        } else {
            // Assegna a una classe
            const classId = new ObjectId(class_id)
            
            // Verifica che la classe esista e che l'utente abbia i permessi
            const classDoc = await getClassesCollection(context.db).findOne({ _id: classId })
            if (!classDoc) {
                throw new Error('Classe non trovata')
            }
            
            const userId = new ObjectId(context.user._id)
            const isOwner = classDoc.owner_id.equals(userId)
            const isTeacher = classDoc.teachers.some((teacherId: ObjectId) => teacherId.equals(userId))
            
            if (!isOwner && !isTeacher) {
                throw new Error('Solo il proprietario o un insegnante possono spostare note in questa classe')
            }
            
            update.class_id = classId
        }
    }
    
    if (Object.keys(update).length === 0) throw new Error('No fields to update')
    
    await collection.updateOne({ _id: new ObjectId(_id) }, { $set: update })
    
    // restituisci la nota aggiornata
    const notes = await collection.aggregate<any>([
        { $match: { _id: new ObjectId(_id) } },
        ...NOTE_PIPELINE
    ]).toArray()
    
    return notes[0] || null
}

updateNote.displayName = 'updateNote'
export default updateNote