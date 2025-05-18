import { ObjectId } from 'mongodb'

import { Context } from './types'
import { ObjectIdType, JSONType } from './types'
import { Resolvers } from './generated'
import { getNotesCollection } from '@/lib/models'

const NOTES_PIPELINE = [
  { $match: { private: { $ne: true } } },
  { $sort: { updated_on: -1 } },
  {
    $lookup: {
      from: 'users',
      localField: 'author_id',
      foreignField: '_id',
      as: 'author'
    }
  },
  {
    // da array a oggetto singolo
    $unwind: '$author'
  },
]

export const resolvers = {
  ObjectId: ObjectIdType,
  JSON: JSONType,

  Query: {
    hello: async (_parent: any, _args: any, context: Context) => {
      return "Hello world!"
    },

    notes: async (_parent: any, _args: any, context: Context) => {
      return await getNotesCollection(context.db)
        .aggregate(NOTES_PIPELINE)
        .toArray() as any
    },

    note: async (_parent: any, {_id}: { _id: ObjectId }, context: Context) => {
      const collection = getNotesCollection(context.db)
      const notes = await collection.aggregate([
          { $match: { _id } },
          ...NOTES_PIPELINE
        ]).toArray()

      if (notes.length === 0) throw new Error('Note not found')
      if (notes.length > 1) throw new Error('Multiple notes found')
      const note = notes[0] as any
      return note
    }
  },
} satisfies Partial<Resolvers<Context>>

