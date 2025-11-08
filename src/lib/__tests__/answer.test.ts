import { ObjectId } from 'mongodb'
import { compute_answer_score, compute_test_score, toOriginalIndex, toDisplayedIndex } from '../answer'
import { MongoAnswer } from '../models'

describe('answer helpers', () => {
  const permutation = [2, 0, 1]

  it('converts displayed index to original and back', () => {
    const original = toOriginalIndex(permutation, 1)
    expect(original).toBe(0)
    const displayed = toDisplayedIndex(permutation, original ?? undefined)
    expect(displayed).toBe(1)
  })

  it('scores correct, wrong, and blank answers', () => {
    const correct: MongoAnswer = {
      note_id: new ObjectId(),
      permutation,
      answer: 0,
    }
    expect(compute_answer_score(correct)).toBe(1)

    const wrong: MongoAnswer = { ...correct, answer: 2 }
    expect(compute_answer_score(wrong)).toBe(0)

    const blank: MongoAnswer = { ...correct, answer: null }
    expect(compute_answer_score(blank)).toBeCloseTo(2 / (1 + permutation.length))
  })

  it('computes total test score as sum of answers', () => {
    const answers: MongoAnswer[] = [
      { note_id: new ObjectId(), permutation, answer: 0 },
      { note_id: new ObjectId(), permutation, answer: 2 },
      { note_id: new ObjectId(), permutation, answer: null },
    ]
    const total = compute_test_score(answers)
    expect(total).toBeCloseTo(1 + 0 + 2 / (1 + permutation.length))
  })
})
