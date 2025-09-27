import { ObjectId } from 'mongodb'
import newSubmission from '../resolvers/newSubmission'

// Mock context and db
const mockUserId = new ObjectId()
const mockTestId = new ObjectId()
const mockDb: any = {
  collection: jest.fn(() => ({
    aggregate: jest.fn(() => ({ toArray: jest.fn(() => [{ _id: mockTestId, open_on: null, close_on: null, private: false, author_id: mockUserId }]) })),
    findOne: jest.fn(),
    insertOne: jest.fn(() => ({ insertedId: new ObjectId() }))
  }))
}

describe('newSubmission regression', () => {
  it('should allow first submission and block duplicate', async () => {
    const context: any = { user: { _id: mockUserId }, db: mockDb }
    // First call: no existing submission
    mockDb.collection().findOne.mockResolvedValueOnce(null)
    const id = await newSubmission(null, { test_id: mockTestId }, context)
    expect(id).toBeInstanceOf(ObjectId)
    // Second call: existing submission found
    mockDb.collection().findOne.mockResolvedValueOnce({ _id: new ObjectId() })
    await expect(newSubmission(null, { test_id: mockTestId }, context)).rejects.toThrow('Already submitted for this test')
  })
})
