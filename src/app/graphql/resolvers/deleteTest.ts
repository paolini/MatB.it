import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { getTestsCollection, getDeletedTestsCollection } from '@/lib/models'

export default async function (
      _parent: unknown,
      args: { _id: ObjectId },
      context: Context
    ): Promise<boolean> {
    const { _id } = args
    const collection = getTestsCollection(context.db)
    const deletedCollection = getDeletedTestsCollection(context.db)
    const item = await collection.findOne({ _id })
    
    if (!item) throw new Error('Item not found')
    if (!context.user) throw new Error('Not authenticated')
    if (!item.author_id.equals(context.user._id)) throw new Error('Not authorized')
    
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

