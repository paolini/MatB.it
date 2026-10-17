import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getClassesCollection, getNotesCollection, NOTE_PIPELINE } from '@/lib/models'
import note from './note'

export default async function noteBacklinks(
    parent: unknown, { _id }: { _id: ObjectId }, context: Context
) {
    // Apply the same access check as opening the target note itself.
    await note(parent, { _id }, context)

    const userId = context.user?._id
    const visibility: Record<string, unknown>[] = [
        { class_id: null, private: { $ne: true } },
    ]
    if (userId) {
        visibility.push({ class_id: null, author_id: userId })
        const classes = await getClassesCollection(context.db).find({
            $or: [{ owner_id: userId }, { teachers: userId }, { students: userId }],
        }).toArray()
        const teachingClasses = classes.filter(cls =>
            cls.owner_id.equals(userId) || cls.teachers.some(id => id.equals(userId))
        )
        visibility.push(
            { class_id: { $in: classes.map(cls => cls._id) }, private: { $ne: true } },
            { class_id: { $in: teachingClasses.map(cls => cls._id) } },
        )
    }

    return getNotesCollection(context.db).aggregate([
        { $match: {
            _id: { $ne: _id },
            'delta.ops.insert.note-ref.note_id': { $in: [_id.toHexString(), _id] },
            $or: visibility,
        } },
        ...NOTE_PIPELINE,
        { $sort: { title: 1, _id: 1 } },
    ]).toArray()
}
