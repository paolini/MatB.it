import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getTestsCollection, getUserClassRole, canUserAccessContent } from '@/lib/models'

export const TESTS_PIPELINE = [
  { $sort: { created_on: -1 } }, // Ordina per data di creazione del Test
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
  // ✨ NUOVO: Aggiungi informazioni sulla classe
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

export default async function tests(_parent: unknown, args: any, context: Context) {
    const userId = context.user?._id
    const now = new Date()
    
    let match: any = {}
    if (args.class_id) {
        const classId = new ObjectId(args.class_id)
        if (!userId) {
            throw new Error('Devi essere autenticato per accedere ai test di una classe')
        }
        const userRole = await getUserClassRole(context.db, new ObjectId(userId), classId)
        if (!userRole) {
            throw new Error('Non hai i permessi per accedere a questa classe')
        }
        match.class_id = classId
        if (userRole === 'student') {
            match.private = { $ne: true }
        }
    } else {
        // Filtra sempre per class_id
        match.class_id = null
        if (userId) {
            match.$or = [
                { private: { $ne: true } },
                { author_id: new ObjectId(userId) }
            ]
        } else {
            match.private = { $ne: true }
        }
    }
    const pipeline: any[] = [
        { $match: match },
        { $match: {
            ...(args.mine && userId ? { author_id: new ObjectId(userId) } : {}),
            ...(args.open
              ? {
                  $and: [
                    {
                      $or: [
                        { open_on: null },
                        { open_on: { $lte: now } }
                      ]
                    },
                    {
                      $or: [
                        { close_on: null },
                        { close_on: { $gte: now } }
                      ]
                    }
                  ]
                }
              : {}),  
        }},
        { $sort: { created_on: -1 } },
        ...(args.limit ? [{ $limit: args.limit }] : []),
        ...TESTS_PIPELINE,
        // ...existing code...
    ]
    
    const tests = await getTestsCollection(context.db)
        .aggregate<any>(pipeline)
        .toArray()
    
    // ✨ NUOVO: Filtraggio finale per classi (necessario per verificare i ruoli)
    if (userId) {
        const filteredTests = []
        
        for (const test of tests) {
            if (test.class_id) {
                const userRole = await getUserClassRole(context.db, new ObjectId(userId), new ObjectId(test.class_id))
                const canAccess = canUserAccessContent(
                    context.user,
                    { class_id: new ObjectId(test.class_id), private: test.private, author_id: new ObjectId(test.author_id) },
                    userRole
                )
                if (canAccess) {
                    filteredTests.push(test)
                }
            } else {
                filteredTests.push(test)
            }
        }
        
        return filteredTests
    }
    
    return tests
}

