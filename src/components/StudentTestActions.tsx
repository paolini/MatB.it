import { BUTTON_CLASS, Error } from '@/components/utils'
import SubmissionElement from './SubmissionElement'
import { Test, Profile } from '@/app/graphql/generated'
import { useMutation } from '@apollo/client'
import { useRouter } from 'next/navigation'
import { gql } from '@apollo/client'
import { useState } from 'react'
import { myTimestamp } from '@/lib/utils'

const NewSubmissionMutation = gql`
    mutation NewSubmission($test_id: ObjectId!) {
        newSubmission(test_id: $test_id)
    }`

export default function StudentTestActions({ test, profile, accessToken, isOpen }: {
    test: Test,
    profile: Profile | null,
    accessToken?: string | null,
    isOpen: boolean
}) {
    const router = useRouter()
    const [startSubmission, { loading: isStarting, error: startError }] = useMutation(NewSubmissionMutation, {
        refetchQueries: [
            { query: gql`query Test($_id: ObjectId!) { test(_id: $_id) { _id } }`, variables: { _id: test._id } }
        ]
    })
    return (
        <div className="mb-6">
            {/* Messaggio test chiuso o non ancora aperto */}
            { !isOpen && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                    {test.open_on && new Date(test.open_on) > new Date() ? (
                        <span>Il test non è ancora aperto. Apertura prevista: {myTimestamp(test.open_on)}</span>
                    ) : test.close_on && new Date(test.close_on) < new Date() ? (
                        <span>Il test si è chiuso in data {myTimestamp(test.close_on)}.</span>
                    ) : (
                        <span>Il test è chiuso.</span>
                    )}
                </div>
            )}
            {/* Messaggio login per utenti non autenticati */}
            { !profile && isOpen && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                    <span>Fai il login per iniziare il test</span>
                </div>
            )}
            {/* Pulsante inizia test per studenti che non hanno submission */}
            {profile && test.submissions && test.submissions.length === 0 && isOpen && (
                <button className={BUTTON_CLASS} disabled={isStarting} onClick={async () => {
                    const result = await startSubmission({ variables: { test_id: test._id } })
                    const submission_id = result.data?.newSubmission
                    if (submission_id) {
                        router.push(`/submission/${submission_id}`)
                    }
                }}>
                    inizia test
                </button>
            )}
            {startError && <Error error={startError} />}
            {/* Elenco submission proprie */}
            {profile && test.submissions && (
                <div className="flex flex-col gap-2 mb-4">
                    {test.submissions
                        .filter(submission => submission.author?._id === profile._id)
                        .map(submission => <SubmissionElement key={submission._id.toString()} submission={submission} accessToken={accessToken} />)}
                </div>
            )}
        </div>
    )
}
