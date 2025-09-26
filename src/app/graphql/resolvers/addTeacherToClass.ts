import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getClassesCollection, getUsersCollection } from '@/lib/models'

export default async function addTeacherToClassResolver(
    _parent: unknown, 
    args: { 
        class_id: ObjectId
        user_id: ObjectId
    }, 
    context: Context
) {
    const { class_id, user_id } = args
    const { user, db } = context

    if (!user) {
        throw new Error('Non sei autenticato')
    }

    // Verifica che la classe esista e che l'utente sia il proprietario
    const existingClass = await getClassesCollection(db).findOne({ 
        _id: new ObjectId(class_id)
    })

    if (!existingClass) {
        throw new Error('Classe non trovata')
    }

    if (!existingClass.owner_id.equals(new ObjectId(user._id))) {
        throw new Error('Solo il proprietario può aggiungere insegnanti alla classe')
    }

    // Verifica che l'utente da aggiungere esista
    const targetUser = await getUsersCollection(db).findOne({ 
        _id: new ObjectId(user_id)
    })

    if (!targetUser) {
        throw new Error('Utente non trovato')
    }

    // Verifica che l'utente non sia già il proprietario
    if (existingClass.owner_id.equals(new ObjectId(user_id))) {
        throw new Error('Il proprietario è già automaticamente insegnante')
    }

    // Verifica che l'utente non sia già insegnante
    const isAlreadyTeacher = existingClass.teachers.some((teacherId: ObjectId) => 
        teacherId.equals(new ObjectId(user_id))
    )

    if (isAlreadyTeacher) {
        throw new Error('L\'utente è già insegnante in questa classe')
    }

    // Rimuovi l'utente dalla lista studenti se presente
    await getClassesCollection(db).updateOne(
        { _id: new ObjectId(class_id) },
        { $pull: { students: new ObjectId(user_id) } }
    )

    // Aggiungi l'utente alla lista insegnanti
    await getClassesCollection(db).updateOne(
        { _id: new ObjectId(class_id) },
        { $addToSet: { teachers: new ObjectId(user_id) } }
    )

    return true
}