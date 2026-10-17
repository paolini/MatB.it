import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../typedefs';
import { resolvers } from '../resolvers';
import { ObjectId } from 'mongodb';
import { setupTestDb, seedTestData, userId, classId, teacherId, studentId } from './testUtils';
import { mockNotes } from './mocks';
import fs from 'node:fs';
import path from 'node:path';

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
  describe('reference modal class inheritance (issue #96)', () => {
    function modalMutation() {
      const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/NoteReferenceModal.tsx'), 'utf8');
      const match = source.match(/const NewNoteMutation = gql`([\s\S]*?)`/);
      if (!match) throw new Error('NewNoteMutation not found in NoteReferenceModal');
      return match[1];
    }

    it.each([false, true])('keeps the editor class when creating a note with private=%s', async (isPrivate) => {
      const result = await server.executeOperation({
        query: modalMutation(),
        variables: {
          title: 'Nota referenziata della classe', delta: { ops: [] },
          private: isPrivate, variant: 'lemma', class_id: classId.toHexString(),
        },
      }, { contextValue: { db, user: { _id: teacherId } } });
      if (!('singleResult' in result.body)) throw new Error('Expected single result');
      expect(result.body.singleResult.errors).toBeUndefined();
      const id = result.body.singleResult.data?.newNote as string;
      const created = await db.collection('notes').findOne({ _id: new ObjectId(id) });
      expect(created?.class_id?.toHexString()).toBe(classId.toHexString());
      expect(created?.private).toBe(isPrivate);
      expect(created?.author_id.toHexString()).toBe(teacherId.toHexString());
    });

    it('rejects creation in a class by a student instead of creating a note outside the class', async () => {
      const countBefore = await db.collection('notes').countDocuments();
      const versionsBefore = await db.collection('note_versions').countDocuments();
      const result = await server.executeOperation({
        query: modalMutation(),
        variables: {
          title: 'Nota non consentita', private: false, variant: 'lemma', class_id: classId.toHexString(),
        },
      }, { contextValue: { db, user: { _id: studentId } } });
      if (!('singleResult' in result.body)) throw new Error('Expected single result');
      expect(result.body.singleResult.errors?.[0].message).toBe('Solo il proprietario o un insegnante possono creare note in questa classe');
      expect(await db.collection('notes').countDocuments()).toBe(countBefore);
      expect(await db.collection('note_versions').countDocuments()).toBe(versionsBefore);
    });
  });

  it('creates a note with the reference modal mutation and returns its scalar ID (issue #93)', async () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/NoteReferenceModal.tsx'), 'utf8');
    const match = source.match(/const NewNoteMutation = gql`([\s\S]*?)`/);
    if (!match) throw new Error('NewNoteMutation not found in NoteReferenceModal');
    const countBefore = await db.collection('notes').countDocuments();
    const delta = { ops: [] };
    const result = await server.executeOperation({
      query: match[1],
      variables: { title: 'Nuova nota referenziata', delta, private: true, variant: 'lemma' },
    }, { contextValue: { db, user: { _id: userId } } });
    if (!('singleResult' in result.body)) throw new Error('Expected single result');
    expect(result.body.singleResult.errors).toBeUndefined();
    const id = result.body.singleResult.data?.newNote;
    expect(typeof id).toBe('string');
    expect(ObjectId.isValid(id as string)).toBe(true);
    expect(await db.collection('notes').countDocuments()).toBe(countBefore + 1);
    const created = await db.collection('notes').findOne({ _id: new ObjectId(id as string) });
    expect(created).toMatchObject({
      title: 'Nuova nota referenziata', delta, private: true, variant: 'lemma', author_id: userId,
    });
    expect(await db.collection('note_versions').findOne({ _id: created.note_version_id })).not.toBeNull();
  });

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
