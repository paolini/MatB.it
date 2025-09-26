import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getClassesCollection } from '@/lib/models'

export default async function removeStudentFromClassResolver(
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

    // Verifica che l'utente sia il proprietario, un insegnante, o lo studente stesso
    const isOwner = existingClass.owner_id.equals(new ObjectId(user._id))
    const isTeacher = existingClass.teachers.some((teacherId: ObjectId) => 
        teacherId.equals(new ObjectId(user._id))
    )
    const isSelf = new ObjectId(user._id).equals(new ObjectId(user_id))

    if (!isOwner && !isTeacher && !isSelf) {
        throw new Error('Solo il proprietario, un insegnante o lo studente stesso possono rimuovere uno studente dalla classe')
    }

    // Verifica che l'utente sia effettivamente studente
    const isStudent = existingClass.students.some((studentId: ObjectId) => 
        studentId.equals(new ObjectId(user_id))
    )

    if (!isStudent) {
        throw new Error('L\'utente non è studente in questa classe')
    }

    // Rimuovi l'utente dalla lista studenti
    await getClassesCollection(db).updateOne(
        { _id: new ObjectId(class_id) },
        { $pull: { students: new ObjectId(user_id) } }
    )

    return true
}