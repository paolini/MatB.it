import { ObjectId } from 'mongodb';
import { testId, studentId } from './ids.mock';

export const mockSubmissions = [
  {
    _id: new ObjectId(),
    test_id: testId, // deve essere lo stesso test pubblico con classe
    author_id: studentId, // lo studente
    started_on: new Date(),
    // ...altri campi necessari...
  }
];