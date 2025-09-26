import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getClassesCollection, getUsersCollection } from '@/lib/models'

export default async function addStudentToClassResolver(
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

    // Verifica che la classe esista
    const existingClass = await getClassesCollection(db).findOne({ 
        _id: new ObjectId(class_id)
    })

    if (!existingClass) {
        throw new Error('Classe non trovata')
    }

    // Verifica che l'utente sia il proprietario o un insegnante
    const isOwner = existingClass.owner_id.equals(new ObjectId(user._id))
    const isTeacher = existingClass.teachers.some((teacherId: ObjectId) => 
        teacherId.equals(new ObjectId(user._id))
    )

    if (!isOwner && !isTeacher) {
        throw new Error('Solo il proprietario o un insegnante possono aggiungere studenti alla classe')
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
        throw new Error('Il proprietario non può essere studente della propria classe')
    }

    // Verifica che l'utente non sia già insegnante
    const isAlreadyTeacher = existingClass.teachers.some((teacherId: ObjectId) => 
        teacherId.equals(new ObjectId(user_id))
    )

    if (isAlreadyTeacher) {
        throw new Error('L\'utente è già insegnante in questa classe')
    }

    // Verifica che l'utente non sia già studente
    const isAlreadyStudent = existingClass.students.some((studentId: ObjectId) => 
        studentId.equals(new ObjectId(user_id))
    )

    if (isAlreadyStudent) {
        throw new Error('L\'utente è già studente in questa classe')
    }

    // Aggiungi l'utente alla lista studenti
    await getClassesCollection(db).updateOne(
        { _id: new ObjectId(class_id) },
        { $addToSet: { students: new ObjectId(user_id) } }
    )

    return true
}