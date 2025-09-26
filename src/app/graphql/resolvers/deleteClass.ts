import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getClassesCollection, getDeletedClassesCollection, getNotesCollection, getTestsCollection } from '@/lib/models'

export default async function deleteClassResolver(
    _parent: unknown, 
    args: { _id: ObjectId }, 
    context: Context
) {
    const { _id } = args
    const { user, db } = context

    if (!user) {
        throw new Error('Non sei autenticato')
    }

    // Verifica che la classe esista e che l'utente sia il proprietario
    const existingClass = await getClassesCollection(db).findOne({ 
        _id: new ObjectId(_id)
    })

    if (!existingClass) {
        throw new Error('Classe non trovata')
    }

    if (!existingClass.owner_id.equals(new ObjectId(user._id))) {
        throw new Error('Solo il proprietario può eliminare la classe')
    }

    // Verifica se ci sono note o test associati alla classe
    const [notesCount, testsCount] = await Promise.all([
        getNotesCollection(db).countDocuments({ class_id: new ObjectId(_id) }),
        getTestsCollection(db).countDocuments({ class_id: new ObjectId(_id) })
    ])

    if (notesCount > 0 || testsCount > 0) {
        throw new Error(`Non puoi eliminare la classe perché contiene ${notesCount} note e ${testsCount} test. Rimuovi prima tutto il contenuto o disattiva la classe.`)
    }

    // Sposta la classe in deleted_classes
    await getDeletedClassesCollection(db).insertOne({
        ...existingClass,
        deleted_on: new Date(),
        deleted_by: new ObjectId(user._id)
    } as any)

    // Rimuovi la classe originale
    await getClassesCollection(db).deleteOne({ _id: new ObjectId(_id) })

    return true
}