import { ObjectId } from 'mongodb'
import { getNoteVersionsCollection } from '@/lib/models'

export async function noteVersion(_parent: unknown, args: { _id: ObjectId }, context: any) {
    const collection = getNoteVersionsCollection(context.db)
    return await collection.findOne({ _id: new ObjectId(args._id) })
}

export async function parentVersions(_parent: unknown, args: { _id: ObjectId }, context: any) {
    const collection = getNoteVersionsCollection(context.db)
    let versions = []
    let current = await collection.findOne({ _id: new ObjectId(args._id) })
    while (current && current.parent_version_id) {
        const parent = await collection.findOne({ _id: current.parent_version_id })
        if (!parent) break
        versions.push(parent)
        current = parent
    }
    return versions
}
