import { ObjectId } from 'mongodb'
import { getAccessTokensCollection, getClassesCollection, getUserClassRole } from '@/lib/models'
import { Context } from '../types'

export default async function deleteEnrollmentCodeResolver(_parent: unknown, args: { class_id: ObjectId, role: string }, context: Context) {
  const { db, user } = context
  const { class_id, role } = args

  if (!user) throw new Error('Non autenticato')
  if (role !== 'student' && role !== 'teacher') throw new Error('Ruolo non valido')

  const userRole = await getUserClassRole(db, user._id, class_id)
  if (userRole !== 'owner' && userRole !== 'teacher') {
    throw new Error('Non hai i permessi per cancellare il codice di arruolamento')
  }

  const result = await getAccessTokensCollection(db)
    .deleteMany({ 
        class_id, 
        permission: role === 'student' ? 'student_enrollment' : 'teacher_enrollment' 
    })

  return true
}
