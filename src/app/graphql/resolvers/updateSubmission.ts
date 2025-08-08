import { Context } from '../types'
import { getSubmissionsCollection, MongoAnswer, MongoSubmission } from '@/lib/models'
import { Submission, MutationUpdateSubmissionArgs } from '../generated'

import { SUBMISSION_PIPELINE } from '@/lib/models'
import { compute_test_score, merge_answers } from '@/lib/answer'

const updateSubmission = async function (
  _parent: unknown,
  args: MutationUpdateSubmissionArgs,
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

