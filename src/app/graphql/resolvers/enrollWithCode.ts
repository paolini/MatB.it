import { ObjectId } from 'mongodb';
import { UserInputError } from 'apollo-server-errors';
import type { MutationEnrollWithCodeArgs } from '../generated';
import { Context } from '../types';
import { getAccessTokensCollection, getClassesCollection } from '@/lib/models';

export default async function enrollWithCode(_parent: unknown, args: MutationEnrollWithCodeArgs, context: Context): Promise<ObjectId> {
  if (!context.user) throw new UserInputError('Not authenticated');
  const { code } = args;
  const tokensCollection = getAccessTokensCollection(context.db);
  const token = await tokensCollection.findOne({ secret: code });
  if (!token) throw new UserInputError('Token not found');
  if (!['teacher_enrollment', 'student_enrollment'].includes(token.permission)) {
    throw new UserInputError('Invalid token permission');
  }
  const classesCollection = getClassesCollection(context.db);
  const classDoc = await classesCollection.findOne({ _id: token.resource_id });
  if (!classDoc) throw new UserInputError('Class not found');
  // Iscrivi l'utente come docente o studente
  if (token.permission === 'teacher_enrollment') {
    await classesCollection.updateOne(
      { _id: token.resource_id },
      { $addToSet: { teachers: context.user._id } }
    );
  } else {
    await classesCollection.updateOne(
      { _id: token.resource_id },
      { $addToSet: { students: context.user._id } }
    );
  }
  return token.resource_id;
}
