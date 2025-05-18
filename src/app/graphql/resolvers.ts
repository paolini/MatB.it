import { ObjectId } from 'mongodb'

import { Context } from './types'
import { ObjectIdType, JSONType } from './types'
import { Resolvers, Note } from './generated'
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
    hello: async (_parent: unknown, _args: unknown, _context: Context) => {
      return "Hello world!"
    },

    notes: async (_parent: unknown, _args: unknown, context: Context) => {
      return await getNotesCollection(context.db)
        .aggregate<Note>(NOTES_PIPELINE)
        .toArray()
    },

    note: async (_parent: unknown, {_id}: { _id: ObjectId }, context: Context) => {
      const collection = getNotesCollection(context.db)
      const notes = await collection.aggregate<Note>([
          { $match: { _id } },
          ...NOTES_PIPELINE
        ]).toArray()

      if (notes.length === 0) throw new Error('Note not found')
      if (notes.length > 1) throw new Error('Multiple notes found')
      const note = notes[0]
      return note
    }
  },
} satisfies Partial<Resolvers<Context>>

