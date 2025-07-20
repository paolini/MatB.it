import { ObjectId } from 'mongodb'
import type { MutationUpdateNoteArgs } from './generated'
import type { MutationNewNoteArgs } from './generated'

import { Context } from './types'
import { ObjectIdType, JSONType } from './types'
import { Resolvers, Note } from './generated'
import { getNotesCollection, getDeletedNotesCollection, getNoteVersionsCollection } from '@/lib/models'

const NOTES_PIPELINE = [
  { $sort: { created_on: -1 } }, // Ordina per data di creazione della Note
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
  {
    // Aggiungiamo updated_on basato sulla versione corrente
    $lookup: {
      from: 'note_versions',
      localField: 'note_version_id',
      foreignField: '_id',
      as: 'version'
    }
  },
  {
    $unwind: '$version'
  },
  {
    $addFields: {
      updated_on: '$version.created_on', // L'ultima modifica è quando è stata creata l'ultima versione
      variant: '$version.variant' // Includiamo la variant dalla note_version
    }
  }
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
          // Mostra la nota se non è privata, oppure se l'utente autenticato è l'autore
          { $match: {
              $or: [
                { private: { $ne: true } },
                ...(context.user ? [{ author_id: context.user._id }] : [])
              ]
            }
          },
          ...NOTES_PIPELINE
        ]).toArray()

      if (notes.length === 0) throw new Error('Note not found')
      if (notes.length > 1) throw new Error('Multiple notes found')
      const note = notes[0]
      return note as Note
    },

    profile: async (_parent: unknown, _args: unknown, context: Context) => {
      return context.user || null
    }
  },

  Mutation: {
    newNote: async (
      _parent: unknown,
      args: MutationNewNoteArgs,
      context: Context
    ): Promise<Note | null> => {
      if (!context.user) throw new Error('Not authenticated')
      const notesCollection = getNotesCollection(context.db)
      const versionsCollection = getNoteVersionsCollection(context.db)
      const now = new Date()
      
      // Prima crea la versione con il contenuto
      const noteVersion = {
        title: args.title,
        delta: args.delta || { ops: [{ insert: '\n' }] }, // Delta passato o vuoto
        author_id: context.user._id,
        created_on: now
      }
      const versionResult = await versionsCollection.insertOne(noteVersion)
      
      // Poi crea la nota che punta alla versione
      const note = {
        title: args.title, // title dell'ultima versione
        delta: args.delta || { ops: [{ insert: '\n' }] }, // delta dell'ultima versione
        author_id: context.user._id,
        note_version_id: versionResult.insertedId,
        contributors: [{
          user_id: context.user._id,
          contribution_count: 1,
          first_contribution: now,
          last_contribution: now
        }],
        private: typeof args.private === 'boolean' ? args.private : false,
        created_on: now
      }
      const result = await notesCollection.insertOne(note)
      const notes = await notesCollection.aggregate<Note>([
        { $match: { _id: result.insertedId } },
        ...NOTES_PIPELINE
      ]).toArray()
      return notes[0] || null
    },
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
      
      const update: Partial<Note> = {}
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
    deleteNote: async (
      _parent: unknown,
      args: { _id: ObjectId },
      context: Context
    ): Promise<boolean> => {
      const { _id } = args
      const notesCollection = getNotesCollection(context.db)
      const note = await notesCollection.findOne({ _id })
      if (!note) throw new Error('Note not found')
      if (!context.user) throw new Error('Not authenticated')
      if (!note.author_id.equals(context.user._id)) throw new Error('Not authorized')
      
      // Sposta la nota nella collection deletedNotes
      const deletedNotesCollection = getDeletedNotesCollection(context.db)
      const deletedNote = {
        ...note,
        deleted_on: new Date(),
        deleted_by: context.user._id
      }
      
      await deletedNotesCollection.insertOne(deletedNote)
      await notesCollection.deleteOne({ _id })
      return true
    },
  }
} satisfies Partial<Resolvers<Context>>

