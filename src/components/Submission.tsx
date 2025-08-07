"use client"
import { gql, useQuery, useMutation } from '@apollo/client'

import { Profile, Submission } from '@/app/graphql/generated'
import { Loading, Error, BUTTON_CLASS } from '@/components/utils'
import { useState } from 'react'
import DocumentElement, { Context } from './DocumentElement'

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
    const { loading, error, data } = useQuery<{submission: Submission, profile: Profile}>(
        SubmissionQuery, {variables: { _id }})

    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />

    const { submission } = data

    return <SubmissionElement submission={submission} />
}

const SUBMIT_MUTATION = gql`
  mutation UpdateSubmission($_id: ObjectId!, $answers: [AnswerItemInput!]!) {
    updateSubmission(_id: $_id, answers: $answers)
  }
`

function SubmissionElement({submission}: {
    submission: Submission,
}) {
    const answers_map = Object.fromEntries((submission.answers || []).map((answer) => [answer.note_id, answer.answer]))
    const [answers, setAnswers] = useState<Record<string, number>>(answers_map)
    const [needSave, setNeedSave] = useState<boolean>(false)
    const [submitAnswers, { loading: isSubmitting, error: submitError }] = useMutation(SUBMIT_MUTATION)

    const context: Context = {
        parents: [],
        answers,
        setAnswer: (id: string, answer: number) => {
            if (answers[id] !== answer) {
                setAnswers({ ...answers, [id]: answer })
                setNeedSave(true)
            }
        }
    }

    return <>
        <h1>{submission.test.title || `submission ${submission._id}`}</h1>
        <DocumentElement
            context={context}
            document={submission.document}
        />
        <button
            className={BUTTON_CLASS}
            disabled={!needSave || isSubmitting}
            onClick={async () => {
                await submitAnswers({
                    variables: {
                        _id: submission._id,
                        answers: Object.entries(answers).map(([note_id, answer]) => ({ note_id, answer }))
                    }
                })
                setNeedSave(false)
            }}>
            {isSubmitting ? 'Invio...' : 'invia risposte'}
        </button>
        {submitError && <Error error={submitError} />}
    </>
}
