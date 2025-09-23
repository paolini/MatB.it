import { Context } from './types'
import { ObjectIdType, JSONType } from './types'
import { Resolvers, TestResolvers } from './generated'

import notes from './resolvers/notes'
import note from './resolvers/note'
import tests from './resolvers/tests'
import test from './resolvers/test'
import submission from './resolvers/submission'
import testStats from './resolvers/testStats'

import newNote from './resolvers/newNote'
import updateNote from './resolvers/updateNote'
import deleteNote from './resolvers/deleteNote'

import newTest from './resolvers/newTest'
import updateTest from './resolvers/updateTest'
import deleteTest from './resolvers/deleteTest'
import newSubmission from './resolvers/newSubmission'
import updateSubmission from './resolvers/updateSubmission'
import deleteSubmission from './resolvers/deleteSubmission'

import accessTokens from './resolvers/accessTokens'
import newAccessToken from './resolvers/newAccessToken'
import deleteAccessToken from './resolvers/deleteAccessToken'

// Nota: usiamo 'any' qui perché GraphQL Code Generator genera tipi molto rigidi
// che richiedono la definizione completa di tutti i field resolvers per ogni tipo.
// Questo è un problema comune nella community GraphQL/TypeScript.
// Gli altri campi vengono risolti automaticamente dai dati restituiti dalle query.
// Vedi: https://github.com/dotansimha/graphql-code-generator/issues (tipo safety con field resolvers parziali)
export const resolvers: any = {
  ObjectId: ObjectIdType,
  JSON: JSONType,

  Query: {
    hello: async (_parent: unknown, _args: unknown, _context: Context) => "Hello world!",

    profile: async (_parent: unknown, _args: unknown, context: Context) => context.user || null,

    notes,
    note,

    test,
    tests,

    submission,

    accessTokens,
  },

  Test: {
    stats: testStats,
  },

  Mutation: {
    newNote,
    updateNote,
    deleteNote,    
    
    newTest,
    updateTest,
    deleteTest,

    newSubmission,
    updateSubmission,
    deleteSubmission,

    newAccessToken,
    deleteAccessToken,
  }
}

