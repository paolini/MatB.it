import { ObjectId } from 'mongodb';
import { userId, teacherId, classId } from './ids.mock';

export const mockNotes = [
  { _id: new ObjectId(), title: 'Pubblica senza classe', hide_title: false, delta: {}, author_id: userId, note_version_id: new ObjectId(), contributors: [], private: false, class_id: null, created_on: new Date(), description: '' },
  { _id: new ObjectId(), title: 'Privata senza classe', hide_title: false, delta: {}, author_id: userId, note_version_id: new ObjectId(), contributors: [], private: true, class_id: null, created_on: new Date(), description: '' },
  { _id: new ObjectId(), title: 'Pubblica con classe', hide_title: false, delta: {}, author_id: teacherId, note_version_id: new ObjectId(), contributors: [], private: false, class_id: classId, created_on: new Date(), description: '' },
  { _id: new ObjectId(), title: 'Privata con classe', hide_title: false, delta: {}, author_id: teacherId, note_version_id: new ObjectId(), contributors: [], private: true, class_id: classId, created_on: new Date(), description: '' }
];
