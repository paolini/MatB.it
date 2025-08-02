import { Context } from './types'
import { ObjectIdType, JSONType } from './types'
import { Resolvers } from './generated'

import notes from './resolvers/notes'
import note from './resolvers/note'
import test from './resolvers/test'
import submission from './resolvers/submission'

import newNote from './resolvers/newNote'
import updateNote from './resolvers/updateNote'
import deleteNote from './resolvers/deleteNote'

import newTest from './resolvers/newTest'
import deleteTest from './resolvers/deleteTest'
import newSubmission from './resolvers/newSubmission'

export const resolvers = {
  ObjectId: ObjectIdType,
  JSON: JSONType,

  Query: {
    hello: async (_parent: unknown, _args: unknown, _context: Context) => "Hello world!",

    profile: async (_parent: unknown, _args: unknown, context: Context) => context.user || null,

    notes,
    note,

    test,

    submission,
  },

  Mutation: {
    newNote,
    updateNote,
    deleteNote,    
    
    newTest,
    deleteTest,

    newSubmission,
  }
} satisfies Partial<Resolvers<Context>>

