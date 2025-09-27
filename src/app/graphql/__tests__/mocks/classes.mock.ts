import { ObjectId } from 'mongodb';
import { userId, teacherId, classId, studentId, testId } from './ids.mock';

export const mockClass = {
  _id: classId,
  name: 'Classe mock',
  description: 'Classe di test',
  owner_id: teacherId,
  owner: { _id: userId, name: 'User', email: 'user@example.com', image: '' },
  teachers: [teacherId],
  students: [studentId],
  notes: [], // da popolare nel test se serve
  tests: [testId],
  created_on: new Date(),
  academic_year: '2025/2026',
  active: true,
  student_enrollment_url: '',
  teacher_enrollment_url: ''
};
