import { MongoClient } from 'mongodb';
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

export async function setupTestDb() {
  const mongoServer = await MongoMemoryServer.create();
  const client = await MongoClient.connect(mongoServer.getUri(), {});
  const db = client.db();
  return { mongoServer, client, db };
}

export async function seedTestData(db: any) {
  await db.collection('notes').deleteMany({});
  await db.collection('classes').deleteMany({});
  await db.collection('tests').deleteMany({});
  await db.collection('users').deleteMany({});
  await db.collection('note_versions').deleteMany({});
  await db.collection('submissions').deleteMany({});
  await db.collection('notes').insertMany(mockNotes);
  await db.collection('classes').insertOne(mockClass);
  await db.collection('tests').insertMany(mockTests);
  await db.collection('users').insertMany(mockUsers);
  await db.collection('note_versions').insertMany(mockNoteVersions);
}

export { userId, teacherId, classId, testId, studentId };
