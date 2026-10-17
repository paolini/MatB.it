import { ObjectId } from 'mongodb'
import { GraphQLError } from 'graphql'

import { Context } from '../types'
import { MutationNewAccessTokenArgs } from '../generated'
import { getAccessTokensCollection, getNotesCollection, getTestsCollection, generateSecret, MongoAccessToken } from '@/lib/models'

export default async function newAccessToken (_parent: unknown, args: MutationNewAccessTokenArgs, context: Context): Promise<MongoAccessToken> {
    if (!context.user) {
        throw new GraphQLError('Must be authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
    }
    
    const { resource_id, permission } = args
    
    // Valida il permesso
    if (permission !== 'read' && permission !== 'write') {
        throw new GraphQLError('Permission must be "read" or "write"', { extensions: { code: 'BAD_USER_INPUT' } })
    }
    
    // Verifica che l'utente sia l'autore della risorsa
    // Prima controlla se è una nota
    const notesCollection = getNotesCollection(context.db)
    const note = await notesCollection.findOne({ _id: resource_id, author_id: context.user._id })
    
    if (!note) {
        // Se non è una nota, controlla se è un test
        const testsCollection = getTestsCollection(context.db)
        const test = await testsCollection.findOne({ _id: resource_id, author_id: context.user._id })
        
        if (!test) {
            throw new GraphQLError('You can only create tokens for resources you own', { extensions: { code: 'FORBIDDEN' } })
        }
    }
    
    // Crea il nuovo token
    const newToken: Omit<MongoAccessToken, '_id'> = {
        resource_id,
        secret: generateSecret(),
        permission: permission as 'read' | 'write',
        created_on: new Date()
    }
    
    const tokensCollection = getAccessTokensCollection(context.db)
    const result = await tokensCollection.insertOne(newToken)
    
    return {
        _id: result.insertedId,
        ...newToken
    }
}
