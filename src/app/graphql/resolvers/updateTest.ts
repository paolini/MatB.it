import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { getTestsCollection, TEST_PIPELINE, getClassesCollection } from '@/lib/models'

const updateTest = async function (
      _parent: unknown,
      args: any, // Usando any per evitare problemi con i tipi generati
      context: Context
    ): Promise<any> {
    const { _id, title, open_on, close_on, private: isPrivate, class_id } = args
    const collection = getTestsCollection(context.db)
    const test = await collection.findOne({ _id: new ObjectId(_id) })
    if (!test) throw new Error('Test not found')
    
    if (!context.user) throw new Error('Not authenticated')
    
    if (!test.author_id.equals(new ObjectId(context.user._id))) throw new Error('Not authorized')
    
    const update: any = {}
    
    if (typeof title === 'string') update.title = title
    if (open_on !== undefined) update.open_on = open_on
    if (close_on !== undefined) update.close_on = close_on
    if (typeof isPrivate === 'boolean') update.private = isPrivate
    
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
                throw new Error('Solo il proprietario o un insegnante possono spostare test in questa classe')
            }
            
            update.class_id = classId
        }
    }
    
    if (Object.keys(update).length === 0) throw new Error('No fields to update')
    
    await collection.updateOne({ _id: new ObjectId(_id) }, { $set: update })
    
    // restituisci il test aggiornato
    const tests = await collection.aggregate<any>([
        { $match: { _id: new ObjectId(_id) } },
        ...TEST_PIPELINE
    ]).toArray()
    
    return tests[0] || null
}

updateTest.displayName = 'updateTest'
export default updateTest
