import { ObjectId } from 'mongodb';
import { userId, teacherId, studentId } from './ids.mock';

export const mockUsers = [
  { _id: userId, name: 'User', email: 'user@example.com', image: '' },
  { _id: teacherId, name: 'Teacher', email: 'teacher@example.com', image: '' },
  { _id: studentId, name: 'Student', email: 'student@example.com', image: '' }
];
