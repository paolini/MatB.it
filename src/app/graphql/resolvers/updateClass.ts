import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getClassesCollection, CLASS_PIPELINE } from '@/lib/models'

export default async function updateClassResolver(
    _parent: unknown, 
    args: { 
        _id: ObjectId
        name?: string
        description?: string
        active?: boolean
    }, 
    context: Context
) {
    const { _id, name, description, active } = args
    const { user, db } = context

    if (!user) {
        throw new Error('Non sei autenticato')
    }

    // Verifica che la classe esista e che l'utente sia il proprietario
    const existingClass = await getClassesCollection(db).findOne({ 
        _id: new ObjectId(_id)
    })

    if (!existingClass) {
        throw new Error('Classe non trovata')
    }

    if (!existingClass.owner_id.equals(new ObjectId(user._id))) {
        throw new Error('Solo il proprietario può modificare la classe')
    }

    // Prepara l'update
    const updateFields: any = {}

    if (name !== undefined) {
        if (!name || name.trim().length === 0) {
            throw new Error('Il nome della classe è obbligatorio')
        }
        if (name.trim().length > 100) {
            throw new Error('Il nome della classe non può superare i 100 caratteri')
        }
        
        // Verifica che non esista già un'altra classe con lo stesso nome
        if (name.trim() !== existingClass.name) {
            const duplicateClass = await getClassesCollection(db).findOne({
                owner_id: new ObjectId(user._id),
                name: name.trim(),
                active: true,
                _id: { $ne: new ObjectId(_id) }
            })

            if (duplicateClass) {
                throw new Error('Hai già una classe attiva con questo nome')
            }
        }

        updateFields.name = name.trim()
    }

    if (description !== undefined) {
        updateFields.description = description?.trim() || undefined
    }

    if (active !== undefined) {
        updateFields.active = active
    }

    if (Object.keys(updateFields).length === 0) {
        throw new Error('Nessun campo da aggiornare')
    }

    // Aggiorna la classe
    await getClassesCollection(db).updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateFields }
    )

    // Restituisci la classe aggiornata con la pipeline
    const updatedClass = await getClassesCollection(db)
        .aggregate([
            { $match: { _id: new ObjectId(_id) } },
            ...CLASS_PIPELINE
        ])
        .toArray()

    return updatedClass[0]
}