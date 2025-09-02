import type { MutationUpdateTestArgs } from '../generated'

import { Context } from '../types'
import { Test } from '../generated'
import { getTestsCollection, TEST_PIPELINE } from '@/lib/models'

const updateTest = async function (
      _parent: unknown,
      args: MutationUpdateTestArgs,
      context: Context
    ): Promise<Test | null> {
    const { _id, title, open_on, close_on, private: isPrivate } = args
    const collection = getTestsCollection(context.db)
    const test = await collection.findOne({ _id })
    if (!test) throw new Error('Test not found')
    
    if (!context.user) throw new Error('Not authenticated')
    
    if (!test.author_id.equals(context.user._id)) throw new Error('Not authorized')
    
    const update: Partial<{
      title: string
      open_on: Date | null
      close_on: Date | null
      private: boolean
    }> = {}
    
    if (typeof title === 'string') update.title = title
    if (open_on !== undefined) update.open_on = open_on
    if (close_on !== undefined) update.close_on = close_on
    if (typeof isPrivate === 'boolean') update.private = isPrivate
    
    if (Object.keys(update).length === 0) throw new Error('No fields to update')
    
    await collection.updateOne({ _id }, { $set: update })
    
    // restituisci il test aggiornato
    const tests = await collection.aggregate<Test>([
        { $match: { _id } },
        ...TEST_PIPELINE
    ]).toArray()
    
    return tests[0] || null
}

updateTest.displayName = 'updateTest'
export default updateTest
