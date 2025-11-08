import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { MutationFixSubmissionsArgs } from '../generated'
import { getClassesCollection, getSubmissionsCollection, getTestsCollection, MongoAnswer, MongoSubmission, MongoTest } from '@/lib/models'
import { compute_test_score } from '@/lib/answer'

const fixSubmissions = async function (
  _parent: unknown,
  args: MutationFixSubmissionsArgs,
  context: Context
): Promise<number> {
  if (!context.user) throw new Error('Not authenticated')

  const { test_id, question_index } = args
  if (question_index < 0) throw new Error('question_index must be non-negative')

  const hasOldAnswer = Object.prototype.hasOwnProperty.call(args, 'old_answer')
  const hasNewAnswer = Object.prototype.hasOwnProperty.call(args, 'new_answer')
  if (!hasOldAnswer) throw new Error('old_answer is required')
  if (!hasNewAnswer) throw new Error('new_answer is required')

  const oldAnswer = args.old_answer ?? null
  const newAnswer = args.new_answer ?? null

  const testsCollection = getTestsCollection(context.db)
  const test = await testsCollection.findOne({ _id: test_id }) as MongoTest | null
  if (!test) throw new Error('Test not found')

  const currentUserId = new ObjectId(context.user._id)
  const isAuthor = test.author_id.equals(currentUserId)
  let isTeacher = false

  if (test.class_id) {
    const classDoc = await getClassesCollection(context.db).findOne({ _id: test.class_id })
    if (classDoc) {
      isTeacher = classDoc.teachers.some((teacherId: ObjectId) => teacherId.equals(currentUserId))
    }
  }

  if (!isAuthor && !isTeacher) throw new Error('Not authorized to update submissions for this test')

  const submissionsCollection = getSubmissionsCollection(context.db)
  const submissionsCursor = submissionsCollection.find<MongoSubmission>({ test_id })

  let updatedCount = 0

  // Apply the correction to every submission linked to the test
  for await (const submission of submissionsCursor) {
    if (!submission.completed_on) continue

    const originalAnswers = submission.answers ?? []
    if (question_index >= originalAnswers.length) continue

    const answers: MongoAnswer[] = originalAnswers.map(answer => ({ ...answer }))
    const targetAnswer = answers[question_index]
    if (!targetAnswer) continue

    if (oldAnswer !== null) {
      if (!Number.isInteger(oldAnswer)) throw new Error('old_answer must be an integer')
      if (oldAnswer < 0) throw new Error('old_answer must be non-negative')
      if (Array.isArray(targetAnswer.permutation) && oldAnswer >= targetAnswer.permutation.length) {
        throw new Error('old_answer out of range')
      }
    }

    const matchesOld = oldAnswer === null
      ? targetAnswer.answer == null
      : targetAnswer.answer === oldAnswer
    if (!matchesOld) continue

    if (newAnswer !== null) {
      if (!Number.isInteger(newAnswer)) throw new Error('new_answer must be an integer')
      if (newAnswer < 0) throw new Error('new_answer must be non-negative')
      if (Array.isArray(targetAnswer.permutation) && newAnswer >= targetAnswer.permutation.length) {
        throw new Error('new_answer out of range')
      }
    }

    answers[question_index] = { ...targetAnswer, answer: newAnswer ?? null }

    const updateDocument: { answers: MongoAnswer[]; score?: number } = { answers }

    if (submission.completed_on) {
      updateDocument.score = compute_test_score(answers)
    }

    await submissionsCollection.updateOne(
      { _id: submission._id },
      { $set: updateDocument }
    )

    updatedCount += 1
  }

  return updatedCount
}

export default fixSubmissions
