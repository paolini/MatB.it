import { GraphQLError } from 'graphql'

import { Context } from '../types'
import { getSubmissionsCollection, getDeletedSubmissionsCollection, SUBMISSION_PIPELINE } from '@/lib/models'
import { MutationDeleteSubmissionArgs, Submission } from '../generated'

const deleteSubmission = async function (
      _parent: unknown,
      args: MutationDeleteSubmissionArgs,
      context: Context
    ): Promise<boolean> {
    const { _id } = args
    const collection = getSubmissionsCollection(context.db)
    const deletedCollection = getDeletedSubmissionsCollection(context.db)
    const items = await collection.aggregate<Submission>([
        { $match: {_id} },
        ...SUBMISSION_PIPELINE,
    ]).toArray()
    
    if (items.length == 0) throw new GraphQLError('Item not found', { extensions: { code: 'BAD_USER_INPUT' } })
    const item = items[0]
    if (!context.user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
    if (!item.test.author_id.equals(context.user._id)) throw new GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } })
    
    // Sposta la submission nella collection deletedSubmissions
    const deletedItem = {
        ...item,
        score: item.score ?? undefined, // Converti null in undefined per compatibilità con MongoSubmission
        deleted_on: new Date(),
        deleted_by: context.user._id
    }
    
    await deletedCollection.insertOne(deletedItem)
    await collection.deleteOne({ _id })
    return true
}

export default deleteSubmission

