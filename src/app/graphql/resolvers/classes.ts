import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getClassesCollection, CLASS_PIPELINE } from '@/lib/models'

export default async function classesResolver(_parent: unknown, _args: unknown, context: Context) {
    const { user, db } = context;
    if (!user) throw new Error('Non sei autenticato');

    // Solo classi attive dove l'utente ha un ruolo
    const matchCondition = {
        active: true,
        $or: [
            { owner_id: user._id },
            { teachers: user._id },
            { students: user._id }
        ]
    };

    const classes = await getClassesCollection(db)
        .aggregate([
            { $match: matchCondition },
            ...CLASS_PIPELINE,
            { $sort: { created_on: -1 } }
        ])
        .toArray();

    return classes;
}