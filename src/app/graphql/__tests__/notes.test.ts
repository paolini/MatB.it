import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../typedefs';
import { resolvers } from '../resolvers';
import { ObjectId } from 'mongodb';
import { setupTestDb, seedTestData, userId, classId } from './testUtils';

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

describe('Notes GraphQL', () => {
  it('should return notes from real resolver', async () => {
    const contextValue = { db, user: { _id: userId } };
    const result = await server.executeOperation({
      query: `
        query {
          notes(limit: 1) {
            _id
            title
            class_id
            private
            author_id
          }
        }
      `,
    }, { contextValue });
    const body = result.body;
    if ('singleResult' in body) {
      const singleResult = body.singleResult;
      expect(singleResult.errors).toBeUndefined();
      const notes = singleResult.data?.notes as Array<{ _id: string; title: string; class_id?: string; private?: boolean; author_id?: string }>;
      expect(notes).toBeInstanceOf(Array);
      // tutte le note devono avere class_id === null
      const hasClassId = notes.some(n => n.class_id && n.class_id.toString() === classId.toString());
      expect(hasClassId).toBe(false);
      // Se la nota è privata, l'utente deve essere l'autore
      const privateNotes = notes.filter(n => n.private === true);
      privateNotes.forEach(n => {
        expect(n.author_id?.toString()).toBe(userId.toString());
      });
    } else {
      throw new Error('Risposta GraphQL non valida: non è singleResult');
    }
  });
});
