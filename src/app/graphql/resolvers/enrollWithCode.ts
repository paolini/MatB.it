import { ObjectId } from 'mongodb';
import { GraphQLError } from 'graphql'
import type { MutationEnrollWithCodeArgs } from '../generated';
import { Context } from '../types';
import { getAccessTokensCollection, getClassesCollection } from '@/lib/models';

export default async function enrollWithCode(_parent: unknown, args: MutationEnrollWithCodeArgs, context: Context): Promise<ObjectId> {
  if (!context.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'BAD_USER_INPUT' } });
  const { code } = args;
  const tokensCollection = getAccessTokensCollection(context.db);
  const token = await tokensCollection.findOne({ secret: code });
  if (!token) throw new GraphQLError('Token not found', { extensions: { code: 'BAD_USER_INPUT' } });
  if (!['teacher_enrollment', 'student_enrollment'].includes(token.permission)) {
    throw new GraphQLError('Invalid token permission', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const classesCollection = getClassesCollection(context.db);
  const classDoc = await classesCollection.findOne({ _id: token.resource_id });
  if (!classDoc) throw new GraphQLError('Class not found', { extensions: { code: 'BAD_USER_INPUT' } });
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
