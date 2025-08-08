import { Context } from '../types'
import { getNotesCollection } from '@/lib/models'
import { Note, QueryNotesArgs } from '../generated'

export const NOTES_PIPELINE = [
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
      updated_on: '$version.created_on' // L'ultima modifica è quando è stata creata l'ultima versione
    }
  }
]

export default async function notes (_parent: unknown, args: QueryNotesArgs, context: Context) {
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
        { $match: {
            ...(args.mine ? { author_id: userId } : {}),
            ...(args.private ? { private: true } : {}),
        }},
        ...(args.limit ? [{ $limit: args.limit }] : []),
        ...NOTES_PIPELINE
    ])
    .toArray()
}

