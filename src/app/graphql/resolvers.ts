import { Context } from './types'
import { ObjectIdType, JSONType } from './types'
import { Resolvers, TestResolvers } from './generated'

import notes from './resolvers/notes'
import note from './resolvers/note'
import { noteVersion, parentVersions } from './resolvers/noteVersion'
import tests from './resolvers/tests'
import test from './resolvers/test'
import submission from './resolvers/submission'
import testStats from './resolvers/testStats'

import newNote from './resolvers/newNote'
import updateNote from './resolvers/updateNote'
import deleteNote from './resolvers/deleteNote'
import cloneNote from './resolvers/cloneNote'

import newTest from './resolvers/newTest'
import updateTest from './resolvers/updateTest'
import deleteTest from './resolvers/deleteTest'
import recalculateTestScores from './resolvers/recalculateTestScores'
import newSubmission from './resolvers/newSubmission'
import updateSubmission from './resolvers/updateSubmission'
import deleteSubmission from './resolvers/deleteSubmission'
import fixSubmissions from './resolvers/fixSubmissions'
import reopenAllSubmissions from './resolvers/reopenAllSubmissions'

import accessTokens from './resolvers/accessTokens'
import accessToken from './resolvers/accessToken' 
import newAccessToken from './resolvers/newAccessToken'
import deleteAccessToken from './resolvers/deleteAccessToken'

import classResolver from './resolvers/class'
import classes from './resolvers/classes'
import newClass from './resolvers/newClass'
import updateClass from './resolvers/updateClass'
import deleteClass from './resolvers/deleteClass'
import addTeacherToClass from './resolvers/addTeacherToClass'
import removeTeacherFromClass from './resolvers/removeTeacherFromClass'
import addStudentToClass from './resolvers/addStudentToClass'
import removeStudentFromClass from './resolvers/removeStudentFromClass'
import generateEnrollmentCode from './resolvers/generateEnrollmentCode'
import deleteEnrollmentCode from './resolvers/deleteEnrollmentCode'
import enrollWithCode from './resolvers/enrollWithCode'

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
    noteVersion,
    parentVersions,

    test,
    tests,

    submission,

    accessToken,
    accessTokens,

    class: classResolver,
    classes,
  },

  Test: {
    stats: testStats,
  },

  Mutation: {
    newNote,
    updateNote,
    deleteNote,
    cloneNote,

    newTest,
    updateTest,
    deleteTest,
    recalculateTestScores,
    fixSubmissions,
    reopenAllSubmissions,

    newSubmission,
    updateSubmission,
    deleteSubmission,

    newAccessToken,
    deleteAccessToken,

    newClass,
    updateClass,
    deleteClass,

    addTeacherToClass,
    removeTeacherFromClass,
    addStudentToClass,
    removeStudentFromClass,
    generateEnrollmentCode,
    deleteEnrollmentCode,
    enrollWithCode,
  }
}

