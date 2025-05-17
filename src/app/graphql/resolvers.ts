import { ObjectId } from 'mongodb'

import { Context } from './types'
import { ObjectIdType, JSONType } from './types'
import { Resolvers } from './generated'
import { getNotesCollection } from '@/lib/models'

export const resolvers = {
  ObjectId: ObjectIdType,
  JSON: JSONType,

  Query: {
    hello: async (_parent: any, _args: any, context: Context) => {
      return "Hello world!"
    },

    notes: async (_parent: any, _args: any, context: Context) => {
      return await getNotesCollection(context.db).find().toArray()
    },

    note: async (_parent: any, args: { _id: ObjectId }, context: Context) => {
      const collection = getNotesCollection(context.db)
      const note = await collection.findOne({ _id: args._id })
      if (!note) {
        throw new Error('Note not found')
      }
      return note
    }
  },
} satisfies Partial<Resolvers<Context>>
