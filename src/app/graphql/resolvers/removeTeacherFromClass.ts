import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getClassesCollection } from '@/lib/models'

export default async function removeTeacherFromClassResolver(
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
        throw new Error('Solo il proprietario può rimuovere insegnanti dalla classe')
    }

    // Verifica che l'utente non sia il proprietario (non può rimuovere se stesso)
    if (existingClass.owner_id.equals(new ObjectId(user_id))) {
        throw new Error('Il proprietario non può essere rimosso dalla classe')
    }

    // Verifica che l'utente sia effettivamente insegnante
    const isTeacher = existingClass.teachers.some((teacherId: ObjectId) => 
        teacherId.equals(new ObjectId(user_id))
    )

    if (!isTeacher) {
        throw new Error('L\'utente non è insegnante in questa classe')
    }

    // Rimuovi l'utente dalla lista insegnanti
    await getClassesCollection(db).updateOne(
        { _id: new ObjectId(class_id) },
        { $pull: { teachers: new ObjectId(user_id) } }
    )

    return true
}