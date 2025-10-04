import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../typedefs';
import { resolvers } from '../resolvers';
import { ObjectId } from 'mongodb';
import { setupTestDb, seedTestData, teacherId, classId, testId, studentId } from './testUtils';

let mongoServer: any;
let client: any;
let db: any;
let server: ApolloServer;

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
});

describe('Tests GraphQL', () => {
  it('should return tests for teacher in class', async () => {
    const contextValue = { db, user: { _id: teacherId } };
    const result = await server.executeOperation({
      query: `
        query {
          tests(class_id: "${classId}") {
            _id
            title
            private
            class_id
          }
        }
      `,
    }, { contextValue });
    const body = result.body;
    if ('singleResult' in body) {
      const singleResult = body.singleResult;
      expect(singleResult.errors).toBeUndefined();
      const tests = singleResult.data?.tests as Array<{ _id: string; title: string; private?: boolean; class_id?: string }>;
      expect(tests).toBeInstanceOf(Array);
      const titles = tests.map((t: any) => t.title);
      expect(titles).toContain('Test pubblico con classe');
      expect(titles).toContain('Test privato con classe');
      expect(titles).not.toContain('Test pubblico senza classe');
      expect(titles).not.toContain('Test privato senza classe');
    } else {
      throw new Error('Risposta GraphQL non valida: non è singleResult');
    }
  });

  it('should return tests for student in class', async () => {
    const contextValue = { db, user: { _id: studentId } };
    const result = await server.executeOperation({
      query: `
        query {
          tests(class_id: "${classId}") {
            _id
            title
            private
            class_id
          }
        }
      `,
    }, { contextValue });
    const body = result.body;
    if ('singleResult' in body) {
      const singleResult = body.singleResult;
      expect(singleResult.errors).toBeUndefined();
      const tests = singleResult.data?.tests as Array<{ _id: string; title: string; private?: boolean; class_id?: string }>;
      expect(tests).toBeInstanceOf(Array);
      const titles = tests.map((t: any) => t.title);
      expect(titles).toContain('Test pubblico con classe');
      expect(titles).not.toContain('Test privato con classe');
      expect(titles).not.toContain('Test pubblico senza classe');
      expect(titles).not.toContain('Test privato senza classe');
    } else {
      throw new Error('Risposta GraphQL non valida: non è singleResult');
    }
  });
});
