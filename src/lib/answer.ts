import { AnswerItemInput } from '@/app/graphql/generated'
import { MongoAnswer } from './models'

export function toOriginalIndex(
  permutation: number[] | null | undefined,
  displayedIndex: number | null | undefined
): number | null | undefined {
  if (displayedIndex === undefined) return undefined
  if (displayedIndex === null) return null
  if (!Array.isArray(permutation)) {
    if (!Number.isInteger(displayedIndex)) throw new Error('Answer index must be an integer')
    return displayedIndex
  }
  if (!Number.isInteger(displayedIndex)) throw new Error('Answer index must be an integer')
  if (displayedIndex < 0 || displayedIndex >= permutation.length) {
    throw new Error('Answer index out of range')
  }
  const original = permutation[displayedIndex]
  if (!Number.isInteger(original)) {
    throw new Error('Invalid permutation value')
  }
  return original
}

export function toDisplayedIndex(
  permutation: number[] | null | undefined,
  originalIndex: number | null | undefined
): number | null | undefined {
  if (originalIndex === undefined) return undefined
  if (originalIndex === null) return null
  if (!Array.isArray(permutation)) return originalIndex
  const idx = permutation.indexOf(originalIndex)
  return idx >= 0 ? idx : null
}

export function merge_answers(db_answers: MongoAnswer[], input_answers: AnswerItemInput[]): MongoAnswer[] {
  const answersMap = new Map<string, number | null | undefined>(
    input_answers.map(a => [a.note_id.toString(), a.answer])
  )

  return db_answers.map(answer => {
    const noteId = answer.note_id.toString()
    if (!answersMap.has(noteId)) return answer

    const rawInput = answersMap.get(noteId)
    if (rawInput === undefined) return answer // nessun aggiornamento richiesto

    if (rawInput === null) {
      if (answer.answer === null) return answer
      return { ...answer, answer: null }
    }

    try {
      const normalized = toOriginalIndex(answer.permutation, rawInput)
      if (normalized === undefined) return answer
      if (normalized === answer.answer) return answer
      return { ...answer, answer: normalized }
    } catch (_error) {
      return answer
    }
  })
}

export function compute_test_score(answers: MongoAnswer[]): number {
  console.log('compute_test_score', JSON.stringify({ answers }, null, 2))
  return answers.reduce(
    (score, answer) => score + compute_answer_score(answer),
    0
  )
}

export function compute_answer_score(answer: MongoAnswer): number {
  if (Array.isArray(answer.permutation)) {
    if (answer.answer == null) {
      return 2 / (1 + answer.permutation.length)
    }
    return answer.answer === 0 ? 1 : 0
  }
  return 0
}
