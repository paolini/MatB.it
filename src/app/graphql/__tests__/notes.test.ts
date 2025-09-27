import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../typedefs';
import { resolvers } from '../resolvers';
import { ObjectId, MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;
let client: MongoClient;
let db: any;

const userId = new ObjectId();
const noteId = new ObjectId();
const versionId = new ObjectId();
const classId = new ObjectId();
const testId = new ObjectId();

const mockNotes = [
  { 
    _id: noteId, 
    title: 'Nota mock', 
    hide_title: false, 
    delta: {}, 
    author_id: userId, 
    note_version_id: versionId, 
    contributors: [], 
    private: false, 
    class_id: classId, 
    created_on: new Date(), 
    description: '' 
  }
];

const mockClass = {
  _id: classId,
  name: 'Classe mock',
  description: 'Classe di test',
  owner_id: userId,
  owner: { _id: userId, name: 'User', email: 'user@example.com', image: '' },
  teachers: [userId], // aggiungi userId come teacher
  students: [userId], // aggiungi userId anche come studente
  notes: [noteId], // collega la nota alla classe
  tests: [testId], // collega il test alla classe
  created_on: new Date(),
  academic_year: '2025/2026',
  active: true,
  student_enrollment_url: '',
  teacher_enrollment_url: ''
};

const mockTest = {
  _id: testId,
  note_id: noteId,
  note: mockNotes[0],
  title: 'Test mock',
  created_on: new Date(),
  author_id: userId,
  author: { _id: userId, name: 'User', email: 'user@example.com', image: '' },
  open_on: null,
  close_on: null,
  class_id: classId,
  class: mockClass,
  private: false,
  submissions: [],
  stats: {
    completed_submissions: 0,
    incompleted_submissions: 0,
    exercises: [],
    min_submissions_for_stats: 0,
    score_distribution: []
  }
};

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
    await db.collection('notes').insertMany(mockNotes);
    await db.collection('classes').insertOne(mockClass);
    await db.collection('tests').insertOne(mockTest);
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
});
