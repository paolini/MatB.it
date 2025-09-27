import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getClassesCollection, getUserClassRole, CLASS_PIPELINE, getAccessTokensCollection } from '@/lib/models'
import { NOTE_PIPELINE, TEST_PIPELINE } from '@/lib/models'

export default async function classResolver(_parent: unknown, args: { _id: ObjectId }, context: Context) {
    console.log('classResolver args._id:', args._id, 'typeof:', typeof args._id, 'instanceof ObjectId:', args._id instanceof ObjectId)
    const { _id } = args
    const { user, db } = context
    console.log('user._id:', user?._id, 'typeof:', typeof user?._id, 'instanceof ObjectId:', user?._id instanceof ObjectId)

    if (!user) throw new Error('Non sei autenticato')

    // Step 1: Find the class document by _id
    const classDoc = await getClassesCollection(db).findOne({ _id })
    if (!classDoc) throw new Error('Classe non trovata')

    // Step 2: Check user privileges
    const userRole = await getUserClassRole(db, user._id, _id)
    if (!userRole) throw new Error('Non hai i permessi per accedere a questa classe')

    const isTeacher = userRole === 'owner' || userRole === 'teacher'

    // Step 3: Run aggregation with privilege-based filters
    const match = isTeacher
        ? { $expr: { $eq: ['$class_id', '$$class_id'] } }
        : { $expr: { $and: [
                { $eq: ['$class_id', '$$class_id'] },
                { $eq: ['$private', false] }
            ] } }

    const classAgg = await getClassesCollection(db)
        .aggregate([
            { $match: { _id } },
            ...CLASS_PIPELINE,
            {
                $lookup: {
                    from: 'notes',
                    let: { class_id: '$_id' },
                    pipeline: [
                        { $match: match },
                        ...NOTE_PIPELINE
                    ],
                    as: 'notes'
                }
            },
            {
                $lookup: {
                    from: 'tests',
                    let: { class_id: '$_id' }, // fix: use class_id for consistency
                    pipeline: [
                        { $match: match },
                        ...TEST_PIPELINE
                    ],
                    as: 'tests'
                }
            }
        ])
        .toArray()

    if (classAgg.length !== 1) throw new Error('Classe non trovata dopo aggregazione')

    let student_enrollment_url = null
    let teacher_enrollment_url = null

    if (isTeacher) {
        const tokens = await getAccessTokensCollection(db).find({
            resource_id: _id,
            permission: { $in: ['student_enrollment', 'teacher_enrollment'] },
        }).toArray()

        for (const token of tokens) {
            if (token.permission === 'student_enrollment') {
                student_enrollment_url = `${process.env.NEXT_PUBLIC_BASE_URL}/u/${token.secret}`
            } else if (token.permission === 'teacher_enrollment') {
                teacher_enrollment_url = `${process.env.NEXT_PUBLIC_BASE_URL}/u/${token.secret}`
            }
        }
    }

    return {
        ...classAgg[0],
        student_enrollment_url,
        teacher_enrollment_url
    }
}
