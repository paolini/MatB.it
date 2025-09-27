import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../typedefs';
import { resolvers } from '../resolvers';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  mockNotes,
  mockClass,
  mockTests,
  mockNoteVersions,
  mockUsers,
  userId,
  teacherId,
  classId,
  testId,
  studentId
} from './mocks';
import newSubmission from '../resolvers/newSubmission';

let mongoServer: MongoMemoryServer;
let client: MongoClient;
let db: any;

describe('GraphQL Notes Query (real resolvers, mongodb-memory-server)', () => {
  let server: ApolloServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongoServer.getUri(), {});
    db = client.db();
    server = new ApolloServer({ typeDefs, resolvers });
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await db.collection('notes').deleteMany({});
    await db.collection('classes').deleteMany({});
    await db.collection('tests').deleteMany({});
    await db.collection('users').deleteMany({});
    await db.collection('note_versions').deleteMany({});
    await db.collection('notes').insertMany(mockNotes);
    await db.collection('classes').insertOne(mockClass);
    await db.collection('tests').insertMany(mockTests);
    await db.collection('users').insertMany(mockUsers);
    await db.collection('note_versions').insertMany(mockNoteVersions);
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

  it('should NOT return notes for user not in class', async () => {
    const outsiderId = new ObjectId();
    const contextValue = { db, user: { _id: outsiderId } };
    const result = await server.executeOperation({
      query: `
        query {
          notes(class_id: "${classId}") {
            _id
            title
          }
        }
      `,
    }, { contextValue });
    const body = result.body;
    if ('singleResult' in body) {
      const singleResult = body.singleResult;
      expect(singleResult.errors).toBeDefined();
      expect(singleResult.errors?.[0].message).toMatch(/permessi|accesso|autorizzazione/i);
      expect(singleResult.data?.notes).toBeUndefined();
    } else {
      throw new Error('Risposta GraphQL non valida: non è singleResult');
    }
  });

  it('should NOT return tests for user not in class', async () => {
    const outsiderId = new ObjectId();
    const contextValue = { db, user: { _id: outsiderId } };
    const result = await server.executeOperation({
      query: `
        query {
          tests {
            _id
            title
          }
        }
      `,
    }, { contextValue });
    const body = result.body;
    if ('singleResult' in body) {
      const singleResult = body.singleResult;
      if (singleResult.errors) {
        expect(singleResult.errors?.[0].message).toMatch(/permessi|accesso|autorizzazione/i);
        expect(singleResult.data?.tests).toBeUndefined();
      } else {
        const tests = singleResult.data?.tests as Array<{ _id: ObjectId; title: string }>;
        expect(tests).toBeInstanceOf(Array);
        const found = tests.some(t => t._id.toString() === testId.toString());
        expect(found).toBe(false);
      }
    } else {
      throw new Error('Risposta GraphQL non valida: non è singleResult');
    }
  });

  it('should return notes for teacher in class', async () => {
    const contextValue = { db, user: { _id: teacherId } };
    const result = await server.executeOperation({
      query: `
        query {
          notes(class_id: "${classId}") {
            _id
            title
            private
            author_id
            class_id
          }
        }
      `,
    }, { contextValue });
    const body = result.body;
    if ('singleResult' in body) {
      const singleResult = body.singleResult;
      expect(singleResult.errors).toBeUndefined();
      const notes = singleResult.data?.notes as Array<{ _id: string; title: string; private?: boolean; author_id?: string; class_id?: string }>;
      expect(notes).toBeInstanceOf(Array);
      const titles = notes.map((n: any) => n.title);
      expect(titles).toContain('Pubblica con classe');
      expect(titles).toContain('Privata con classe');
      expect(titles).not.toContain('Pubblica senza classe');
      expect(titles).not.toContain('Privata senza classe');
    } else {
      throw new Error('Risposta GraphQL non valida: non è singleResult');
    }
  });

  it('should return notes for student in class', async () => {
    const contextValue = { db, user: { _id: studentId } };
    const result = await server.executeOperation({
      query: `
        query {
          notes(class_id: "${classId}") {
            _id
            title
            private
            author_id
            class_id
          }
        }
      `,
    }, { contextValue });
    const body = result.body;
    if ('singleResult' in body) {
      const singleResult = body.singleResult;
      expect(singleResult.errors).toBeUndefined();
      const notes = singleResult.data?.notes as Array<{ _id: string; title: string; private?: boolean; author_id?: string; class_id?: string }>;
      expect(notes).toBeInstanceOf(Array);
      const titles = notes.map((n: any) => n.title);
      expect(titles).toContain('Pubblica con classe');
      expect(titles).not.toContain('Privata con classe');
      expect(titles).not.toContain('Pubblica senza classe');
      expect(titles).not.toContain('Privata senza classe');
    } else {
      throw new Error('Risposta GraphQL non valida: non è singleResult');
    }
  });

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

  it('should allow first submission and block duplicate (real db)', async () => {
    const context = { db, user: { _id: studentId } }
    // Prima submission: deve andare a buon fine
    const id = await newSubmission(null, { test_id: testId }, context)
    expect(id).toBeInstanceOf(ObjectId)
    // Seconda submission: deve fallire
    await expect(newSubmission(null, { test_id: testId }, context)).rejects.toThrow('Already submitted for this test')
  })
});
