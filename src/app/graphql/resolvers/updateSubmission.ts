import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getSubmissionsCollection, MongoAnswer, MongoSubmission } from '@/lib/models'
import { Submission } from '../generated'

import { SUBMISSION_PIPELINE } from '@/lib/models'

const updateSubmission = async function (
  _parent: unknown,
  args: { 
    _id: ObjectId, 
    answers?: { note_id: ObjectId, answer: number|null }[],
    completed?: boolean,
  },
  context: Context
): Promise<boolean> {
  if (!context.user) throw new Error('Not authenticated')
  const collection = getSubmissionsCollection(context.db)
  const submissions = await collection.aggregate<Submission & MongoSubmission>([
    { $match: { _id: args._id } }, 
    ...SUBMISSION_PIPELINE
  ]).toArray()
  if (submissions.length === 0) throw new Error('Submission not found')
  const submission = submissions[0]
  if (!submission.author_id.equals(context.user._id)) throw new Error('Not authorized')

  const now = new Date()
  if (submission.test.open_on && submission.test.open_on>now) throw new Error('Test not yet open')
  if (submission.test.close_on && submission.test.close_on<now) throw new Error('Test is closed')

  const $set: {
    answers?: MongoAnswer[],
    completed_on?: Date,
  } = {}

  if (args.answers) {
    const answers_map = Object.fromEntries(args.answers.map(a => [a.note_id.toString(),a.answer]))

    // submission.answers: MongoAnswer[]
    const answers = (submission.answers as import('@/lib/models').MongoAnswer[]).map(a => {
      const note_id = a.note_id
      const new_answer: number|null = answers_map[note_id.toString()]
      if (new_answer === null) return { ...a, answer: null }
      if (a.permutation && Array.isArray(a.permutation)) {
          const inv = inverse_permutation(a.permutation)
          return { ...a, answer: inv[new_answer] }
      }
      return a
    })
    $set['answers'] = answers
  }

  if (args.completed === true) {
    $set['completed_on'] = now
  } else if (args.completed === false) {
    $set['completed_on'] = undefined
  }

  await collection.updateOne({ _id: args._id }, { $set })
  return true
}

export default updateSubmission

function inverse_permutation(array: number[]) {
  const inv = new Array(array.length)
  for (let i = 0; i < array.length; i++) {
    inv[array[i]] = i
  }
  return inv
}