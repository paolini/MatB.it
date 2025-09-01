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
    
    // Costruiamo la pipeline
    const pipeline: any[] = []
    
    // Match per visibilità (pubbliche + mie se autenticato)
    pipeline.push({
        $match: {
            $or: [
                { private: { $ne: true } },
                ...(userId ? [{ author_id: userId }] : [])
            ]
        }
    })
    
    // Match per filtri specifici
    const additionalMatch: any = {}
    
    // Se vengono richiesti filtri che richiedono autenticazione ma l'utente non è autenticato,
    // ritorna array vuoto
    if ((args.mine || args.private) && !userId) {
        return []
    }
    
    if (args.mine && userId) {
        additionalMatch.author_id = userId
    }
    
    if (args.private && userId) {
        additionalMatch.private = true
        additionalMatch.author_id = userId
    }
    
    if (args.title && args.title.trim() !== '') {
        additionalMatch.title = { $regex: args.title.trim(), $options: 'i' }
    }
    
    if (args.variant && args.variant.trim() !== '') {
        additionalMatch.variant = args.variant.trim()
    }
    
    if (Object.keys(additionalMatch).length > 0) {
        pipeline.push({ $match: additionalMatch })
    }
    
    // Ordinamento
    pipeline.push({ $sort: { created_on: -1 } })
    
    // Paginazione
    if (args.skip) {
        pipeline.push({ $skip: args.skip })
    }
    if (args.limit) {
        pipeline.push({ $limit: args.limit })
    }
    
    // Aggiungi le operazioni per i lookup
    pipeline.push(...NOTES_PIPELINE)
    
    return await getNotesCollection(context.db)
        .aggregate<Note>(pipeline)
        .toArray()
}

