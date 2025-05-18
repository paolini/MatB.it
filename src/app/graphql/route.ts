import { ApolloServer } from '@apollo/server'
import { startServerAndCreateNextHandler } from '@as-integrations/next'
// import { getToken } from "next-auth/jwt"
// import { ObjectId } from 'mongodb'
import { NextApiRequest } from 'next'

import clientPromise from '@/lib/mongodb'
import { Context } from './types'
import { resolvers } from './resolvers'
import { typeDefs } from './typedefs'

const server = new ApolloServer<Context>({
  resolvers,
  typeDefs,
})

const handler = startServerAndCreateNextHandler<NextApiRequest,Context>(server, {
    context: async (req, res): Promise<Context> => { 
      const db = (await clientPromise).db()
      const ctx: Context = { req, res, db, user: null }
      return ctx
      /*
      try {
        const token = await getToken({ req })
        
        if (!token || !token.dbUser) {
          return ctx
        }

        const db_user = token.dbUser
        const user = {
          ...db_user,
          _id: new ObjectId(db_user._id),
        }
        return { 
          ...ctx,
          user,
        }
      } catch (err) {
        throw err;
      }
      */
  }
});

// export default handler;

export { handler as GET, handler as POST };
