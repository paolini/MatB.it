import { ObjectId } from 'mongodb'
import { getClassesCollection, generateSecret, getUserClassRole, getAccessTokensCollection } from '@/lib/models'
import { Context } from '../types'

export default async function generateEnrollmentCodeResolver(_parent: unknown, args: { class_id: ObjectId, role: string }, context: Context) {
  const { db, user } = context
  const { class_id, role } = args

  if (!user) throw new Error('Non autenticato')
  if (role !== 'student' && role !== 'teacher') throw new Error('Ruolo non valido')

  const userRole = await getUserClassRole(db, user._id, class_id)
  if (userRole !== 'owner' && userRole !== 'teacher') {
    throw new Error('Non hai i permessi per generare il codice di arruolamento')
  }

  const secret = generateSecret()

  const tokens = getAccessTokensCollection(db).insertOne({
    resource_id: class_id,
    secret,
    permission: role === 'student' ? 'student_enrollment' : 'teacher_enrollment',
    created_on: new Date()
  })

  return secret
}
