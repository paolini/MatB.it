import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../typedefs';
import { resolvers } from '../resolvers';
import { setupTestDb, seedTestData, teacherId, testId, studentId } from './testUtils';
import newSubmission from '../resolvers/newSubmission';
import { ObjectId } from 'mongodb';

let mongoServer: any;
let client: any;
let db: any;
let server: ApolloServer;
let submissionId: string;

beforeAll(async () => {
  const setup = await setupTestDb();
  mongoServer = setup.mongoServer;
  client = setup.client;
  db = setup.db;
  server = new ApolloServer({ typeDefs, resolvers });
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  await seedTestData(db);
  // Crea la submission una sola volta per tutti i test che la usano
  const contextStudent = { db, user: { _id: studentId } };
  const mutationResult = await server.executeOperation({
    query: `mutation { newSubmission(test_id: "${testId}") }`,
  }, { contextValue: contextStudent });
  if ('singleResult' in mutationResult.body) {
    submissionId = mutationResult.body.singleResult.data?.newSubmission as string;
  }
});

describe('Submissions GraphQL', () => {
  it('should allow first submission and block duplicate (real db)', async () => {
    // Prova a creare una seconda submission tramite mutation GraphQL
    const contextStudent = { db, user: { _id: studentId } };
    const mutationResult = await server.executeOperation({
      query: `mutation { newSubmission(test_id: "${testId}") }`,
    }, { contextValue: contextStudent });
    if ('singleResult' in mutationResult.body) {
      const singleResult = mutationResult.body.singleResult;
      expect(singleResult.errors).toBeDefined();
      expect(singleResult.errors?.[0].message).toMatch(/Already submitted for this test/i);
    } else {
      throw new Error('Risposta GraphQL non valida: non è singleResult');
    }
  });

  it('should allow teacher to get submissions for a test in their class', async () => {
    // Query come teacher per recuperare la submission
    const contextTeacher = { db, user: { _id: teacherId } };
    const result = await server.executeOperation({
      query: `
        query {
          submission(_id: "${submissionId}") {
            _id
            test_id
            author_id
          }
        }
      `,
    }, { contextValue: contextTeacher });
    const body = result.body;
    if ('singleResult' in body) {
      const singleResult = body.singleResult;
      expect(singleResult.errors).toBeUndefined();
      const submission = singleResult.data?.submission as { test_id: string; author_id: string };
      expect(submission).toBeDefined();
      expect(submission.test_id.toString()).toBe(testId.toString());
      expect(submission.author_id.toString()).toBe(studentId.toString());
    } else {
      throw new Error('Risposta GraphQL non valida: non è singleResult');
    }
  });
});

describe('newSubmission regression (real db)', () => {
  let testId: ObjectId;
  let userId: ObjectId;

  beforeEach(async () => {
    await db.collection('tests').deleteMany({});
    await db.collection('submissions').deleteMany({});
    userId = new ObjectId();
    testId = new ObjectId();
    await db.collection('tests').insertOne({ _id: testId, open_on: null, close_on: null, private: false, author_id: userId });
  });

  it('should allow first submission and block duplicate', async () => {
    const context: any = { user: { _id: userId }, db }
    // First call: no existing submission
    const id = await newSubmission(null, { test_id: testId }, context)
    expect(id).toBeInstanceOf(ObjectId)
    // Second call: existing submission found
    await expect(newSubmission(null, { test_id: testId }, context)).rejects.toThrow('Already submitted for this test')
  })
})
