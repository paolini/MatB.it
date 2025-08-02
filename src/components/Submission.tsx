"use client"
import { gql, useMutation, useQuery } from '@apollo/client'

import { Test, Profile, Submission } from '@/app/graphql/generated'
import { Loading, Error, EDIT_BUTTON_CLASS, CANCEL_BUTTON_CLASS, DELETE_BUTTON_CLASS, BUTTON_CLASS } from '@/components/utils'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SubmissionQuery = gql`
    query Submission($_id: ObjectId!) {
        submission(_id: $_id) {
            _id
            test {
                _id
                title
                created_on
                open_on
                close_on
                note {
                    _id
                    delta
                }
            }
            created_on
            open_on 
            close_on
            my_submissions {
                _id
                started_on
                completed_on
            }
        }
        profile {
            _id
        }
    }
`

export default function SubmissionWrapper({_id}: {_id: string}) {
    const [editMode, setEditMode] = useState(false)
    const { loading, error, data, refetch } = useQuery<{submission: Submission, profile: Profile}>(
        SubmissionQuery, {variables: { _id }})

    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />

    const { submission, profile } = data

    return <>
        Submission {submission._id}
    </>
}
