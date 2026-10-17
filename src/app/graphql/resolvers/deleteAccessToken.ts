import { ObjectId } from 'mongodb'
import { GraphQLError } from 'graphql'

import { Context } from '../types'
import { MutationDeleteAccessTokenArgs } from '../generated'
import { getAccessTokensCollection, getNotesCollection, getTestsCollection } from '@/lib/models'

export default async function deleteAccessToken (_parent: unknown, args: MutationDeleteAccessTokenArgs, context: Context): Promise<boolean> {
    if (!context.user) {
        throw new GraphQLError('Must be authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
    }
    
    const { _id } = args
    
    // Trova il token
    const tokensCollection = getAccessTokensCollection(context.db)
    const token = await tokensCollection.findOne({ _id })
    
    if (!token) {
        throw new GraphQLError('Token not found', { extensions: { code: 'FORBIDDEN' } })
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
            throw new GraphQLError('You can only delete tokens for resources you own', { extensions: { code: 'FORBIDDEN' } })
        }
    }
    
    // Elimina il token
    const result = await tokensCollection.deleteOne({ _id })
    return result.deletedCount === 1
}
