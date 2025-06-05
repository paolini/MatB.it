import { ObjectId } from 'mongodb'
import type { MutationUpdateNoteArgs } from './generated'

import { Context } from './types'
import { ObjectIdType, JSONType } from './types'
import { Resolvers, Note } from './generated'
import { getNotesCollection } from '@/lib/models'

const NOTES_PIPELINE = [
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
      const userId = context.user?._id
      console.log
      return await getNotesCollection(context.db)
        .aggregate<Note>([
          { $match: {
              $or: [
                { private: { $ne: true } },
                ...(userId ? [{ author_id: userId }] : [])
              ]
            }
          },
          ...NOTES_PIPELINE
        ])
        .toArray()
    },

    note: async (_parent: unknown, {_id}: { _id: ObjectId }, context: Context) => {
      const collection = getNotesCollection(context.db)
      const notes = await collection.aggregate<Note>([
          { $match: { _id } },
          { $match: { private: { $ne: true } } },
          ...NOTES_PIPELINE
        ]).toArray()

      if (notes.length === 0) throw new Error('Note not found')
      if (notes.length > 1) throw new Error('Multiple notes found')
      const note = notes[0]
      return note
    },

    profile: async (_parent: unknown, _args: unknown, context: Context) => {
      return context.user || null
    }
  },

  Mutation: {
    newNote: async () => { throw new Error('Not implemented') },
    updateNote: async (
      _parent: unknown,
      args: MutationUpdateNoteArgs,
      context: Context
    ): Promise<Note | null> => {
      const { _id, title, delta, private: isPrivate } = args
      const collection = getNotesCollection(context.db)
      const note = await collection.findOne({ _id })
      if (!note) throw new Error('Note not found')
      
      if (!context.user) throw new Error('Not authenticated')
      
      if (!note.author_id.equals(context.user._id)) throw new Error('Not authorized')
      
      const update: any = {}
      if (typeof title === 'string') update.title = title
      if (delta) update.delta = delta
      if (typeof isPrivate === 'boolean') update.private = isPrivate
      if (Object.keys(update).length === 0) throw new Error('No fields to update')
      await collection.updateOne({ _id }, { $set: update })
      // restituisci la nota aggiornata
      const notes = await collection.aggregate<Note>([
        { $match: { _id } },
        ...NOTES_PIPELINE
      ]).toArray()
      return notes[0] || null
    },
  }
} satisfies Partial<Resolvers<Context>>

