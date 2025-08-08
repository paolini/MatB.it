import { AnswerItemInput } from '@/app/graphql/generated'
import { MongoAnswer } from './models'

export function merge_answers(db_answers: MongoAnswer[], input_answers: AnswerItemInput[]): MongoAnswer[] {
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
