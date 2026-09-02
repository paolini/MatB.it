import { ApolloServer } from '@apollo/server'
import { startServerAndCreateNextHandler } from '@as-integrations/next'
import { ObjectId, WithId } from 'mongodb'
import { NextApiRequest } from 'next'
import { GraphQLRequestContext, GraphQLRequestContextWillSendResponse } from '@apollo/server';

import clientPromise from '@/lib/mongodb'
import { Context } from './types'
import { resolvers } from './resolvers'
import { typeDefs } from './typedefs'
import { MongoUser, logAction } from '@/lib/models'
import { auth } from '@/lib/auth'

export const dynamic = "force-dynamic";

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

function toHeaders(headers: NextApiRequest["headers"] | Headers) {
  if (headers instanceof Headers) return headers;

  const result = new Headers()
  for (const [name, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      result.set(name, value)
    } else if (Array.isArray(value)) {
      result.set(name, value.join(", "))
    }
  }
  return result
}

const handler = startServerAndCreateNextHandler<NextApiRequest,Context>(server, {
    context: async (req, res): Promise<Context> => { 
      const db = (await clientPromise).db()
      
      // Estrai il token dagli headers (gestisce sia Headers Web API che NextApiRequest)
      const accessToken = (req.headers as any).get ? 
                         (req.headers as any).get('x-access-token') : 
                         req.headers['x-access-token'] as string || undefined
      
      const ctx: Context = { req, res, db, user: null, accessToken }
      try {
        const session = await auth.api.getSession({
          headers: toHeaders(req.headers),
        })
        if (!session?.user.email) return ctx

        const dbUser = await db.collection('users').findOne<WithId<MongoUser>>({
          email: session.user.email,
        })
        if (dbUser) {
          const legacyUser = await db.collection('users').findOne<WithId<MongoUser>>({
            email: session.user.email + '_',
          })
          if (legacyUser) {
            // Riassocia le note provenienti dal vecchio indirizzo email con underscore.
            await db.collection('notes').updateMany(
              { author_id: legacyUser._id },
              { $set: { author_id: dbUser._id  } }
            )
            if (legacyUser.pro && !dbUser?.pro) {
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
