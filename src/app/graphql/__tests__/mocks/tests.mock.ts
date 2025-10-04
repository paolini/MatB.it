import { ObjectId } from 'mongodb';
import { userId, teacherId, classId, testId } from './ids.mock';
import { mockNotes } from './notes.mock';
import { mockClass } from './classes.mock';

export const anotherUserId = new ObjectId(); // nuovo autore del test

export const mockTests = [
  { _id: new ObjectId(), title: 'Test pubblico senza classe', note_id: mockNotes[0]._id, note: mockNotes[0], created_on: new Date(), author_id: userId, author: { _id: userId, name: 'User', email: 'user@example.com', image: '' }, open_on: null, close_on: null, class_id: null, private: false, submissions: [], stats: {} },
  { _id: new ObjectId(), title: 'Test privato senza classe', note_id: mockNotes[1]._id, note: mockNotes[1], created_on: new Date(), author_id: userId, author: { _id: userId, name: 'User', email: 'user@example.com', image: '' }, open_on: null, close_on: null, class_id: null, private: true, submissions: [], stats: {} },
  { _id: testId, title: 'Test pubblico con classe', note_id: mockNotes[2]._id, note: mockNotes[2], created_on: new Date(), author_id: userId, author: { _id: userId, name: 'User', email: 'user@example.com', image: '' }, open_on: null, close_on: null, class_id: classId, private: false, submissions: [], stats: {} },
  { _id: new ObjectId(), title: 'Test privato con classe', note_id: mockNotes[3]._id, note: mockNotes[3], created_on: new Date(), author_id: teacherId, author: { _id: teacherId, name: 'Teacher', email: 'teacher@example.com', image: '' }, open_on: null, close_on: null, class_id: classId, private: true, submissions: [], stats: {} }
];
