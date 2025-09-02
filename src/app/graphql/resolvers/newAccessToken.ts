import { ObjectId } from 'mongodb'
import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-errors'

import { Context } from '../types'
import { MutationNewAccessTokenArgs } from '../generated'
import { getAccessTokensCollection, getNotesCollection, getTestsCollection, generateSecret, MongoAccessToken } from '@/lib/models'

export default async function newAccessToken (_parent: unknown, args: MutationNewAccessTokenArgs, context: Context): Promise<MongoAccessToken> {
    if (!context.user) {
        throw new AuthenticationError('Must be authenticated')
    }
    
    const { resource_id, permission } = args
    
    // Valida il permesso
    if (permission !== 'read' && permission !== 'write') {
        throw new UserInputError('Permission must be "read" or "write"')
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
            throw new ForbiddenError('You can only create tokens for resources you own')
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
