"use client"
import { gql, useQuery } from '@apollo/client'

import { Profile, Submission } from '@/app/graphql/generated'
import { Loading, Error } from '@/components/utils'
import { useState } from 'react'
import DocumentElement from './DocumentElement'

const SubmissionQuery = gql`
    query Submission($_id: ObjectId!) {
        submission(_id: $_id) {
            _id
            test {
                _id
                title
                open_on
                close_on
            }
            started_on
            completed_on
            document
            answers {
                note_id
                answer
            }
        }
        profile {
            _id
        }
    }
`

export default function SubmissionWrapper({_id}: {_id: string}) {
    const [editMode, setEditMode] = useState(false)
    const { loading, error, data } = useQuery<{submission: Submission, profile: Profile}>(
        SubmissionQuery, {variables: { _id }})
    const [answers, setAnswers] = useState<Record<string, number>>({})

    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />

    const { submission, profile } = data

    return <SubmissionElement submission={submission} />
}

function SubmissionElement({submission}:{
    submission: Submission,
}) {
    const answers_map = Object.fromEntries((submission.answers || []).map((answer) => [answer.note_id, answer.answer]))
    const [answers,setAnswers] = useState<Record<string,number>>(answers_map)
    const context = { 
        parents: [], 
        answers,
        setAnswers,
    }

    return <>
        <h1>{submission.test.title || `submission ${submission._id}`}</h1>
        <DocumentElement 
            context={context}
            document={submission.document}
        />
        <pre>{JSON.stringify({context},null,2)}</pre>
    </>
}
