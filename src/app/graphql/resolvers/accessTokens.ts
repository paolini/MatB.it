import { AuthenticationError, ForbiddenError } from 'apollo-server-errors'

import { Context } from '../types'
import { AccessToken, QueryAccessTokensArgs } from '../generated'
import { getAccessTokensCollection, getNotesCollection, getTestsCollection } from '@/lib/models'

export default async function accessTokens (_parent: unknown, args: QueryAccessTokensArgs, context: Context): Promise<AccessToken[]> {
    if (!context.user) {
        throw new AuthenticationError('Must be authenticated')
    }
    
    const { resource_id } = args
    
    // Verifica che l'utente sia l'autore della risorsa
    // Prima controlla se è una nota
    const notesCollection = getNotesCollection(context.db)
    const note = await notesCollection.findOne({ _id: resource_id, author_id: context.user._id })
    
    if (!note) {
        // Se non è una nota, controlla se è un test
        const testsCollection = getTestsCollection(context.db)
        const test = await testsCollection.findOne({ _id: resource_id, author_id: context.user._id })
        
        if (!test) {
            throw new ForbiddenError('You can only view tokens for resources you own')
        }
    }
    
    // Restituisci tutti i token per questa risorsa
    const tokensCollection = getAccessTokensCollection(context.db)
    return await tokensCollection.find({ resource_id }).toArray() as AccessToken[]
}
