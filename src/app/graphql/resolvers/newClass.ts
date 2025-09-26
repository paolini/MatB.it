import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getClassesCollection } from '@/lib/models'

export default async function newClassResolver(
    _parent: unknown, 
    args: { 
        name: string
        description?: string
        subject?: string
        academic_year?: string
    }, 
    context: Context
) {
    const { name, description, subject, academic_year } = args
    const { user, db } = context

    if (!user) {
        throw new Error('Non sei autenticato')
    }

    // Validazioni
    if (!name || name.trim().length === 0) {
        throw new Error('Il nome della classe è obbligatorio')
    }

    // Crea la nuova classe
    const newClass = {
        name: name.trim(),
        description: description?.trim() || undefined,
        owner_id: new ObjectId(user._id),
        teachers: [],
        students: [],
        created_on: new Date(),
        academic_year: academic_year?.trim() || undefined,
        subject: subject?.trim() || undefined,
        active: true
    }

    const result = await getClassesCollection(db).insertOne(newClass)
    return result.insertedId
}