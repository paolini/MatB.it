import { ApolloServer } from '@apollo/server'
import { ObjectId } from 'mongodb'
import { typeDefs } from '../typedefs'
import { resolvers } from '../resolvers'

describe('GraphQL error compatibility', () => {
    const server = new ApolloServer({ typeDefs, resolvers })
    const resourceId = new ObjectId().toHexString()
    const user = { _id: new ObjectId() }
    const mutation = `mutation($permission: String!) {
        newAccessToken(resource_id: "${resourceId}", permission: $permission) { _id }
    }`

    afterAll(async () => server.stop())

    it.each([
        ['UNAUTHENTICATED', 'Must be authenticated', null, 'read'],
        ['BAD_USER_INPUT', 'Permission must be "read" or "write"', user, 'delete'],
        ['FORBIDDEN', 'You can only create tokens for resources you own', user, 'read'],
    ] as const)('preserves %s when creating access tokens', async (code, message, currentUser, permission) => {
        // An unknown resource must remain inaccessible and never create a token.
        const insertOne = jest.fn()
        const db = { collection: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue(null), insertOne })) }
        const result = await server.executeOperation({
            query: mutation, variables: { permission },
        }, { contextValue: { db, user: currentUser } })
        if (!('singleResult' in result.body)) throw new Error('Expected single result')
        expect(result.body.singleResult.errors).toHaveLength(1)
        expect(result.body.singleResult.errors?.[0]).toMatchObject({ message, extensions: { code } })
        expect(insertOne).not.toHaveBeenCalled()
        if (code !== 'FORBIDDEN') expect(db.collection).not.toHaveBeenCalled()
    })
})
