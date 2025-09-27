import { UserInputError } from 'apollo-server-errors';
import { Context } from '../types';
import { AccessToken, QueryAccessTokenArgs } from '../generated';
import { getAccessTokensCollection, getClassesCollection } from '@/lib/models';

export default async function accessToken(_parent: unknown, {secret}: QueryAccessTokenArgs, context: Context): Promise<AccessToken> {
  const tokensCollection = getAccessTokensCollection(context.db);
  const token = await tokensCollection.findOne({ secret });
  if (!token) {
    throw new UserInputError('AccessToken not found');
  }
  let classSummary = null;
  if (["teacher_enrollment", "student_enrollment"].includes(token.permission)) {
    const classesCollection = getClassesCollection(context.db);
    const classData = await classesCollection.findOne({ _id: token.resource_id });
    if (classData) {
      classSummary = {
        name: classData.name||'',
        academic_year: classData.academic_year||'',
        description: classData.description||'',
      };
    }
  }
  return { ...token, class: classSummary };
}
