import { ObjectId } from 'mongodb'
import { AuthenticationError, ForbiddenError } from 'apollo-server-errors'

import { Context } from '../types'
import { MutationDeleteAccessTokenArgs } from '../generated'
import { getAccessTokensCollection, getNotesCollection, getTestsCollection } from '@/lib/models'

export default async function deleteAccessToken (_parent: unknown, args: MutationDeleteAccessTokenArgs, context: Context): Promise<boolean> {
    if (!context.user) {
        throw new AuthenticationError('Must be authenticated')
    }
    
    const { _id } = args
    
    // Trova il token
    const tokensCollection = getAccessTokensCollection(context.db)
    const token = await tokensCollection.findOne({ _id })
    
    if (!token) {
        throw new ForbiddenError('Token not found')
    }
    
    // Verifica che l'utente sia l'autore della risorsa associata al token
    // Prima controlla se è una nota
    const notesCollection = getNotesCollection(context.db)
    const note = await notesCollection.findOne({ _id: token.resource_id, author_id: context.user._id })
    
    if (!note) {
        // Se non è una nota, controlla se è un test
        const testsCollection = getTestsCollection(context.db)
        const test = await testsCollection.findOne({ _id: token.resource_id, author_id: context.user._id })
        
        if (!test) {
            throw new ForbiddenError('You can only delete tokens for resources you own')
        }
    }
    
    // Elimina il token
    const result = await tokensCollection.deleteOne({ _id })
    return result.deletedCount === 1
}
