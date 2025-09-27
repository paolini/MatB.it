import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../typedefs';
import { resolvers } from '../resolvers';
import { ObjectId } from 'mongodb';

// Mock del contesto con db fittizio e ObjectId reali
const userId = new ObjectId();
const noteId = new ObjectId();
const versionId = new ObjectId();
const classId = new ObjectId();
const testId = new ObjectId();

const mockNotes = [
  { _id: noteId, title: 'Nota mock', hide_title: false, delta: {}, author_id: userId, note_version_id: versionId, contributors: [], private: false, class_id: classId, created_on: new Date(), description: '' }
];

const mockClass = {
  _id: classId,
  name: 'Classe mock',
  description: 'Classe di test',
  owner_id: userId,
  owner: { _id: userId, name: 'User', email: 'user@example.com', image: '' },
  teachers: [],
  students: [],
  notes: [],
  tests: [],
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

const mockDb = {
  collection: (name: string) => {
    if (name === 'classes') {
      return {
        findOne: async () => mockClass,
        aggregate: () => ({ toArray: async () => [mockClass] })
      };
    }
    if (name === 'tests') {
      return {
        findOne: async () => mockTest,
        aggregate: () => ({ toArray: async () => [mockTest] })
      };
    }
    return {
      findOne: async () => ({ owner_id: userId, teachers: [], students: [] }),
      aggregate: () => ({ toArray: async () => mockNotes })
    };
  }
};

const mockContext = {
  db: mockDb,
  user: { _id: userId }
};

describe('GraphQL Notes Query (real resolvers)', () => {
  let server: ApolloServer;

  beforeAll(() => {
    server = new ApolloServer({ typeDefs, resolvers });
  });

  it('should return notes from real resolver', async () => {
    const result = await server.executeOperation({
      query: `
        query {
          notes(limit: 1) {
            _id
            title
          }
        }
      `,
    }, { contextValue: mockContext });
    const body = result.body;
    if ('singleResult' in body) {
      const singleResult = body.singleResult;
      expect(singleResult.errors).toBeUndefined();
      const notes = singleResult.data?.notes as Array<{ _id: string; title: string }>;
      expect(notes).toBeInstanceOf(Array);
      expect(notes[0].title).toBe('Nota mock');
    } else {
      throw new Error('Risposta GraphQL non valida: non è singleResult');
    }
  });

  it('should NOT return notes for user not in class', async () => {
    const outsiderId = new ObjectId();
    const outsiderContext = {
      db: mockDb,
      user: { _id: outsiderId }
    };
    const result = await server.executeOperation({
      query: `
        query {
          notes(class_id: "${classId}") {
            _id
            title
          }
        }
      `,
    }, { contextValue: outsiderContext });
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
    const outsiderContext = {
      db: mockDb,
      user: { _id: outsiderId }
    };
    const result = await server.executeOperation({
      query: `
        query {
          tests {
            _id
            title
          }
        }
      `,
    }, { contextValue: outsiderContext });
    const body = result.body;
    if ('singleResult' in body) {
      const singleResult = body.singleResult;
      // Deve restituire errore oppure array vuoto
      if (singleResult.errors) {
        expect(singleResult.errors?.[0].message).toMatch(/permessi|accesso|autorizzazione/i);
        expect(singleResult.data?.tests).toBeUndefined();
      } else {
        const tests = singleResult.data?.tests as Array<{ _id: ObjectId; title: string }>;
        expect(tests).toBeInstanceOf(Array);
        // Controlla che nessun test abbia l'id testId
        const found = tests.some(t => t._id.toString() === testId.toString());
        expect(found).toBe(false);
      }
    } else {
      throw new Error('Risposta GraphQL non valida: non è singleResult');
    }
  });
});
