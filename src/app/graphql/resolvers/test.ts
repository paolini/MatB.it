import { ObjectId } from 'mongodb'
import { UserInputError, ForbiddenError, AuthenticationError } from 'apollo-server-errors'

import { Context } from '../types'
import { Test } from '../generated'
import { getTestsCollection, TEST_PIPELINE, verifyAccessToken } from '@/lib/models'
import { toDisplayedIndex } from '@/lib/answer'

export default async function test (_parent: unknown, {_id}: { _id: ObjectId }, context: Context): Promise<Test | null> {
    const user = context.user
    const collection = getTestsCollection(context.db)
    
    // Costruisci le condizioni di autorizzazione
    const authConditions: any[] = [
        { private: { $ne: true } }, // test pubblici
        ...(context.user ? [{ author_id: context.user._id }] : []), // test dell'autore
        ...(context.user ? [{ 'class.teachers': context.user._id }] : []), // test per teacher della classe
        ...(context.user ? [{ 'class.students': context.user._id }] : []) // test per studenti della classe
    ]
    
    // Se c'è un token di accesso, verifica se è valido per questa risorsa
    let hasValidToken = false
    if (context.accessToken) {
        hasValidToken = await verifyAccessToken(
            context.db, 
            _id, 
            context.accessToken, 
            'read'
        )
        if (hasValidToken) {
            // Se il token è valido, permetti l'accesso anche se privato
            authConditions.push({ _id })
        }
    }
    
    const tests = await collection.aggregate<Test>([
        { $match: { _id } },
        { $match: { $or: authConditions } },
        ...TEST_PIPELINE,
        // Popola i teacher della classe
        {
            $lookup: {
                from: 'users',
                localField: 'class.teachers',
                foreignField: '_id',
                as: 'class.teachers'
            }
        },
        {
            // Aggiunge le sottomissioni
            $lookup: {
                from: 'submissions',
                let: { 
                    test_id: '$_id', 
                    user_id: user?._id,
                    test_author_id: '$author_id',
                    has_valid_token: hasValidToken,
                    class_teacher_ids: '$class.teachers'
                },
                pipeline: [
                    { $match: { $expr: { $and: [ 
                        { $eq: ['$test_id', '$$test_id'] },
                        { $or: [
                                { $eq: ['$author_id', '$$user_id'] },
                                { $eq: ['$$test_author_id', '$$user_id'] },
                                { $eq: ['$$has_valid_token', true] },
                                { $in: [
                                    '$$user_id',
                                    { $map: { input: '$$class_teacher_ids', as: 't', in: '$$t._id' } }
                                ] } // controllo teacher solo se teachers è array di {_id}
                                ] }, 
                        ]}}}, 
                    { $sort: { started_on: -1 } },
                    { $lookup: {
                        from: 'users',
                        localField: 'author_id',
                        foreignField: '_id',
                        as: 'author'
                    }},
                    { $unwind: '$author' }
                ],
                as: 'submissions'
            }
        }
    ]).toArray()

    if (tests.length === 0) {
        throw new UserInputError('Test not found')
    }
    const test = tests[0]

    if (Array.isArray((test as any).submissions)) {
        (test as any).submissions = (test as any).submissions.map((submission: any) => {
            if (!Array.isArray(submission?.answers)) return submission
            const formattedAnswers = submission.answers.map((answer: any) => {
                if (!answer) return answer
                if (!Array.isArray(answer.permutation)) {
                    return {
                        ...answer,
                        answer: answer.answer ?? null,
                    }
                }
                const displayed = toDisplayedIndex(answer.permutation, answer.answer)
                return {
                    ...answer,
                    answer: displayed ?? null,
                }
            })
            return {
                ...submission,
                answers: formattedAnswers,
            }
        })
    }

    return test
}
