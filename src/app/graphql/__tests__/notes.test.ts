import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../typedefs';
import { resolvers } from '../resolvers';
import { ObjectId } from 'mongodb';
import { setupTestDb, seedTestData, userId, classId, teacherId, studentId } from './testUtils';
import { mockNotes } from './mocks';

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
  describe('noteBacklinks', () => {
    const targetId = new ObjectId();
    const reference = { insert: { 'note-ref': { note_id: targetId.toHexString() } } };

    beforeEach(async () => {
      await db.collection('notes').insertOne({
        ...mockNotes[0], _id: targetId, title: 'Target', delta: { ops: [reference] },
      });
      // Repeated references must yield a single backlink per source note.
      await db.collection('notes').updateMany(
        { _id: { $ne: targetId } }, { $set: { delta: { ops: [reference, reference] } } },
      );
    });

    async function backlinks(user?: ObjectId, target = targetId) {
      const result = await server.executeOperation({
        query: `query($id: ObjectId!) { noteBacklinks(_id: $id) { _id title } }`,
        variables: { id: target.toHexString() },
      }, { contextValue: { db, user: user ? { _id: user } : null } });
      if (!('singleResult' in result.body)) throw new Error('Expected single result');
      return result.body.singleResult;
    }

    it.each([
      ['anonymous', undefined, [0]],
      ['author', userId, [0, 1]],
      ['student', studentId, [0, 2]],
      ['teacher', teacherId, [0, 2, 3]],
    ] as const)('only returns readable source notes for %s', async (_role, user, indices) => {
      const result = await backlinks(user);
      expect(result.errors).toBeUndefined();
      const notes = result.data?.noteBacklinks as Array<{ _id: string; title: string }>;
      expect(notes.map(n => n._id).sort()).toEqual(indices.map(i => mockNotes[i]._id.toHexString()).sort());
      expect(notes.map(n => n.title)).toEqual([...notes.map(n => n.title)].sort());
    });

    it('uses current content and supports ObjectId references', async () => {
      await db.collection('notes').updateOne({ _id: mockNotes[0]._id }, {
        $set: { delta: { ops: [{ insert: { 'note-ref': { note_id: targetId } } }] } },
      });
      expect((await backlinks()).data?.noteBacklinks).toHaveLength(1);
      await db.collection('notes').updateOne({ _id: mockNotes[0]._id }, {
        $set: { delta: { ops: [{ insert: 'Reference removed\n' }] } },
      });
      expect((await backlinks()).data?.noteBacklinks).toEqual([]);
    });

    it('rejects inaccessible target notes', async () => {
      await db.collection('notes').updateOne({ _id: targetId }, { $set: { private: true } });
      expect((await backlinks()).errors?.[0].message).toBe('Not authorized');
    });
  });

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
