import { ApolloServer } from '@apollo/server'
import { startServerAndCreateNextHandler } from '@as-integrations/next'
import { getToken } from "next-auth/jwt"
import { ObjectId, WithId } from 'mongodb'
import { NextApiRequest } from 'next'
import { GraphQLRequestContext, GraphQLRequestContextWillSendResponse } from '@apollo/server';

import clientPromise from '@/lib/mongodb'
import { Context } from './types'
import { resolvers } from './resolvers'
import { typeDefs } from './typedefs'
import { MongoUser, logAction } from '@/lib/models'

// Plugin Apollo per logging
const loggingPlugin = {
  async requestDidStart(requestContext: GraphQLRequestContext<Context>) {
    const start = Date.now();
    return {
      async willSendResponse(ctx: GraphQLRequestContextWillSendResponse<Context>) {
        try {
          const db = ctx.contextValue?.db;
          if (!db) return;
          const user = ctx.contextValue?.user;
          const req = ctx.contextValue?.req;
          const ip = typeof req?.headers['x-forwarded-for'] === 'string'
            ? req.headers['x-forwarded-for']
            : Array.isArray(req?.headers['x-forwarded-for'])
              ? req.headers['x-forwarded-for'][0]
              : req?.socket?.remoteAddress;
          const userAgent = typeof req?.headers['user-agent'] === 'string'
            ? req.headers['user-agent']
            : Array.isArray(req?.headers['user-agent'])
              ? req.headers['user-agent'][0]
              : undefined;
          await logAction(db, {
            user_id: user?._id || null,
            action: 'graphql',
            ip: ip || undefined,
            userAgent,
            metadata: {
              operationName: ctx.operationName,
              variables: ctx.request?.variables,
              query: ctx.request?.query,
              durationMs: Date.now() - start,
              success: !ctx.errors,
              errors: ctx.errors?.map((e: Error) => e.message),
            },
          });
        } catch (e) {
          // Non bloccare la risposta in caso di errore di logging
          console.error('Errore logging GraphQL:', e);
        }
      }
    }
  }
};

const server = new ApolloServer<Context>({
  resolvers,
  typeDefs,
  plugins: [loggingPlugin],
})

const handler = startServerAndCreateNextHandler<NextApiRequest,Context>(server, {
    context: async (req, res): Promise<Context> => { 
      const db = (await clientPromise).db()
      
      // Estrai il token dagli headers (gestisce sia Headers Web API che NextApiRequest)
      const accessToken = (req.headers as any).get ? 
                         (req.headers as any).get('x-access-token') : 
                         req.headers['x-access-token'] as string || undefined
      
      const ctx: Context = { req, res, db, user: null, accessToken }
      try {
        const token = await getToken({ req })
        if (!token || !token.sub) {
          return ctx
        }
        
        // Cerca l'utente tramite _id (preferibile) o email come fallback
        const dbUser = await db.collection('users').findOne<WithId<MongoUser>>({ _id: new ObjectId(token.sub) })
        if (dbUser && token.email) {
          const legacyUser = await db.collection('users').findOne<WithId<MongoUser>>({ email: token.email + '_' })
          if (legacyUser) {            
            // i vecchi utenti non vengono più autenticati da next-auth perché
            // non hanno un "account" associato.
            // Ora che abbiamo il nuovo utente con collegato l'account, possiamo
            // riappropriarci delle note del vecchio utente, se c'era.

            // tutte le Note rimpiazza legacyUser._id con dbUser._id
            // nel campo author_id:
            await db.collection('notes').updateMany(
              { author_id: legacyUser._id },
              { $set: { author_id: dbUser._id  } }
            )
            // e aggiorna l'utente dbUser con le informazioni del legacyUser
            if (legacyUser.pro && !dbUser?.pro) {
              // se legacyUser era pro, rendi dbUser pro
              await db.collection('users').updateOne(
                { _id: dbUser._id },
                { $set: { pro: true } }
              )
              dbUser.pro = true
            }
          }
        }
        if (!dbUser) {
          return ctx
        }
        return {
          ...ctx,
          user: dbUser,
        }
      } catch (err) {
        console.error(err)
        return ctx
      }
  }
});

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
