import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { Note, Test } from '../generated'
import { getNotesCollection, getTestsCollection, 
  TEST_PIPELINE, NOTE_PIPELINE, verifyAccessToken } from '@/lib/models'

export default async function note (_parent: unknown, {_id}: { _id: ObjectId }, context: Context): Promise<Note | null> {
    const collection = getNotesCollection(context.db)
    
    // Costruisci le condizioni di autorizzazione
    const authConditions: any[] = [
        { private: { $ne: true } }, // note pubbliche
        ...(context.user ? [{ author_id: context.user._id }] : []) // note dell'autore
    ]
    
    // Se c'è un token di accesso, verifica se è valido per questa risorsa
    if (context.accessToken) {
        const hasTokenAccess = await verifyAccessToken(
            context.db, 
            _id, 
            context.accessToken, 
            'read'
        )
        if (hasTokenAccess) {
            // Se il token è valido, permetti l'accesso anche se privata
            authConditions.push({ _id })
        }
    }
    
    const notes = await collection.aggregate<Note>([
        { $match: { _id } },
        { $match: { $or: authConditions } },
        ...NOTE_PIPELINE
    ]).toArray()

    if (notes.length === 0) throw new Error('Note not found')
    if (notes.length > 1) throw new Error('Multiple notes found')
    const note = notes[0]
    // Carica i test collegati
    const testsCollection = getTestsCollection(context.db)
    const tests = await testsCollection.aggregate<Test>([
      { $match: { note_id: _id } },
      ...TEST_PIPELINE,
    ]).toArray()
    return { ...note, tests }
}
