import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getSubmissionsCollection, MongoAnswer, MongoSubmission } from '@/lib/models'
import { Submission, AnswerItemInput } from '../generated'

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
  if (submission.completed_on) throw new Error('Submission already completed')
  
  const $set: {
    answers?: MongoAnswer[],
    completed_on?: Date,
    score?: number,
  } = {}

  
  const answers = args.answers
  ? merge_answers(submission.answers, args.answers)
  : submission.answers || []

  console.log(JSON.stringify({answers}, null, 2))
  
  if (args.answers) $set['answers'] = answers

  if (args.completed === true) {
    $set['completed_on'] = now
    $set['score'] = compute_test_score(answers)
  } else if (args.completed === false) {
    $set['completed_on'] = undefined
  }

  await collection.updateOne({ _id: args._id }, { $set })
  return true
}

export default updateSubmission

function merge_answers(db_answers: MongoAnswer[], input_answers: AnswerItemInput[]): MongoAnswer[] {
  const answers_map = Object.fromEntries(input_answers.map(a => [a.note_id.toString(),a.answer]))

  // submission.answers: MongoAnswer[]
  return db_answers.map(a => {
    const note_id = a.note_id
    const new_answer: number|undefined = answers_map[note_id.toString()]

    if (!a.permutation) return a
    if (!Array.isArray(a.permutation)) return a
    if (new_answer === undefined) return a
    if (typeof new_answer !== 'number') return a
    if (Math.floor(new_answer) !== new_answer) return a
    if (new_answer < 0 || new_answer >= a.permutation.length) return a

    return { ...a, answer: new_answer }
  })
}

export function compute_test_score(answers: MongoAnswer[]): number {
  console.log("compute_test_score", JSON.stringify({answers}, null, 2))
  return answers.reduce(
    (score, answer) => score + compute_answer_score(answer), 
    0)
}

export function compute_answer_score(answer: MongoAnswer): number {
  if (answer.permutation) {
    if (answer.answer == null) return 2/(1+answer.permutation.length) // risposta non data
    if (answer.permutation[answer.answer] === 0) return 1 // risposta corretta
    return 0 // risposta sbagliata
  }
  return 0
} 