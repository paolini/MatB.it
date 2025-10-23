import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { getSubmissionsCollection, getTestsCollection, getClassesCollection, MongoSubmission, MongoTest } from '@/lib/models'
import { compute_test_score } from '@/lib/answer'
import { SUBMISSION_PIPELINE } from '@/lib/models'

const recalculateTestScores = async function (
  _parent: unknown,
  args: any,
  context: Context
): Promise<number> {
  if (!context.user) throw new Error('Not authenticated')
  
  // Verifica che l'utente abbia i permessi per modificare il test
  const testsCollection = getTestsCollection(context.db)
  const test = await testsCollection.findOne({ _id: args._id }) as MongoTest | null
  if (!test) throw new Error('Test not found')
  
  // Verifica che l'utente sia l'autore del test o un insegnante della classe
  const isOwner = test.author_id.equals(new ObjectId(context.user._id))
  let isTeacher = false
  
  if (test.class_id) {
    const classDoc = await getClassesCollection(context.db).findOne({ _id: test.class_id })
    if (classDoc) {
      const userId = new ObjectId(context.user._id)
      isTeacher = classDoc.teachers.some((teacherId: ObjectId) => teacherId.equals(userId))
    }
  }
  
  if (!isOwner && !isTeacher) {
    throw new Error('Not authorized to recalculate scores for this test')
  }
  
  // Recupera tutte le submission completate per questo test
  const submissionsCollection = getSubmissionsCollection(context.db)
  const submissions = await submissionsCollection.aggregate<MongoSubmission>([
    { $match: { test_id: args._id, completed_on: { $exists: true, $ne: null } } },
    ...SUBMISSION_PIPELINE
  ]).toArray()
  
  // Ricalcola il punteggio per ogni submission
  let updatedCount = 0
  for (const submission of submissions) {
    const newScore = compute_test_score(submission.answers || [])
    
    // Aggiorna solo se il punteggio è cambiato
    if (submission.score !== newScore) {
      await submissionsCollection.updateOne(
        { _id: submission._id },
        { $set: { score: newScore } }
      )
      updatedCount++
    }
  }
  
  return updatedCount
}

export default recalculateTestScores
