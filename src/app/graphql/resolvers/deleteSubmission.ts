import { UserInputError, ForbiddenError, AuthenticationError } from 'apollo-server-errors'

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
    
    if (items.length == 0) throw new UserInputError('Item not found')
    const item = items[0]
    if (!context.user) throw new AuthenticationError('Not authenticated')
    if (!item.test.author_id.equals(context.user._id)) throw new ForbiddenError('Not authorized')
    
    // Sposta la nota nella collection deletedNotes
    const deletedItem = {
        ...item,
        deleted_on: new Date(),
        deleted_by: context.user._id
    }
    
    await deletedCollection.insertOne(deletedItem)
    await collection.deleteOne({ _id })
    return true
}

export default deleteSubmission

