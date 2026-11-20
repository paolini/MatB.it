import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getClassesCollection, CLASS_PIPELINE } from '@/lib/models'

export default async function updateClassResolver(
    _parent: unknown, 
    args: { 
        _id: ObjectId
        name?: string
        description?: string
        academic_year?: string
        active?: boolean
    }, 
    context: Context
) {
    const { _id, name, description, academic_year, active } = args
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
    const unsetFields: Record<string, ''> = {}

    if (name !== undefined) {
        if (!name || name.trim().length === 0) {
            throw new Error('Il nome della classe è obbligatorio')
        }
        if (name.trim().length > 100) {
            throw new Error('Il nome della classe non può superare i 100 caratteri')
        }
        updateFields.name = name.trim()
    }

    if (description !== undefined && description !== null) {
        if (description.trim().length > 500) {
            throw new Error('La descrizione non può superare i 500 caratteri')
        }
        if (description.trim()) updateFields.description = description.trim()
        else unsetFields.description = ''
    }

    if (academic_year !== undefined && academic_year !== null) {
        if (academic_year.trim().length > 20) {
            throw new Error('L\'anno accademico non può superare i 20 caratteri')
        }
        if (academic_year.trim()) updateFields.academic_year = academic_year.trim()
        else unsetFields.academic_year = ''
    }

    if (active !== undefined && active !== null) {
        updateFields.active = active
    }

    if (Object.keys(updateFields).length === 0 && Object.keys(unsetFields).length === 0) {
        throw new Error('Nessun campo da aggiornare')
    }

    // Aggiorna la classe
    const update: any = {}
    if (Object.keys(updateFields).length > 0) update.$set = updateFields
    if (Object.keys(unsetFields).length > 0) update.$unset = unsetFields
    await getClassesCollection(db).updateOne(
        { _id: new ObjectId(_id) },
        update
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