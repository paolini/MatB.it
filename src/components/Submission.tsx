"use client"
import { gql, useMutation, useQuery } from '@apollo/client'

import { Test, Profile, Submission } from '@/app/graphql/generated'
import { Loading, Error, EDIT_BUTTON_CLASS, CANCEL_BUTTON_CLASS, DELETE_BUTTON_CLASS, BUTTON_CLASS } from '@/components/utils'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />

    const { submission, profile } = data
    const context = { parents: [], answers: submission.answers || undefined }

    return <>
        <h1>{submission.test.title || `submission ${submission._id}`}</h1>
        <DocumentElement 
            context={context}
            document={submission.document}
        />
        <pre>{JSON.stringify({submission},null,2)}</pre>
    </>
}
