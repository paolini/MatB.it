import { AuthenticationError, UserInputError } from 'apollo-server-errors';
import { Context } from '../types';
import { AccessToken, QueryAccessTokenArgs } from '../generated';
import { getAccessTokensCollection } from '@/lib/models';

export default async function accessToken(_parent: unknown, {secret}: QueryAccessTokenArgs, context: Context): Promise<AccessToken> {
  // opzionale: puoi richiedere autenticazione
  // if (!context.user) {
  //   throw new AuthenticationError('Must be authenticated');
  // }

  const tokensCollection = getAccessTokensCollection(context.db);
  const token = await tokensCollection.findOne({ secret });
  if (!token) {
    throw new UserInputError('AccessToken not found');
  }
  return token as AccessToken;
}
