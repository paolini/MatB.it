import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getNotesCollection, getUserClassRole, canUserAccessContent } from '@/lib/models'
import { Note, QueryNotesArgs } from '../generated'

export const NOTES_LOOKUP_PIPELINE = [
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
  },
  {
    $lookup: {
      from: 'classes',
      localField: 'class_id',
      foreignField: '_id',
      as: 'class'
    }
  }, {
    $unwind: { path: '$class', preserveNullAndEmptyArrays: true }
  }
]

export default async function notes(_parent: unknown, args: any, context: Context) {
    console.log('notes resolver called', { args, userId: context.user?._id });
    const userId = context.user?._id
    
    // Costruiamo la pipeline
    const pipeline: any[] = []
    
    // Semplificato: usa solo il campo private per la visibilità
    let match: any;
    const classId = args.class_id ? new ObjectId(args.class_id) : null;

    if (classId) {
        if (!userId) throw new Error('Devi essere autenticato per accedere alle note di una classe');
        const cls = await context.db.collection('classes').findOne({ _id: classId });
        const userObjectId = new ObjectId(userId);
        let userRole: 'owner' | 'teacher' | 'student' | null = null;
        if (cls) {
            userRole = cls.owner_id.equals(userObjectId)
                ? 'owner'
                : cls.teachers?.some((t: any) => t.equals(userObjectId))
                ? 'teacher'
                : cls.students?.some((s: any) => s.equals(userObjectId))
                ? 'student'
                : null;
        }
        if (!userRole) throw new Error('Non hai i permessi per accedere a questa classe');
        match = {
            class_id: classId,
            ...(userRole === 'student' ? { private: { $ne: true } } : {})
        };
    } else {
        match = userId ? {
            $or: [
                { private: { $ne: true }, class_id: null },
                { author_id: new ObjectId(userId) }
            ]
        } : {
            private: { $ne: true },
            class_id: null
        };
    }
    pipeline.push({ $match: match })
    
    // Match per filtri specifici
    const additionalMatch: any = {}
    
    // Se vengono richiesti filtri che richiedono autenticazione ma l'utente non è autenticato,
    // ritorna array vuoto
    if ((args.mine || args.private) && !userId) {
        return []
    }
    
    if (args.mine && userId) {
        additionalMatch.author_id = new ObjectId(userId)
    }
    
    if (args.private && userId) {
        additionalMatch.private = true
        additionalMatch.author_id = new ObjectId(userId)
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
    
    // Aggiungi le operazioni per i lookup PRIMA dell'ordinamento e paginazione
    pipeline.push(...NOTES_LOOKUP_PIPELINE)
    
    // ...existing code...
    
    // Ordinamento finale (dopo aver calcolato updated_on)
    pipeline.push({ $sort: { updated_on: -1 } })
    
    // Paginazione
    if (args.skip) {
        pipeline.push({ $skip: args.skip })
    }
    if (args.limit) {
        pipeline.push({ $limit: args.limit })
    }
    
    const notes = await getNotesCollection(context.db)
        .aggregate<any>(pipeline)
        .toArray()

    // ...existing code...
    return notes;
}

