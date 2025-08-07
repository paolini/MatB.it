"use client"
import { gql, useMutation, useQuery } from '@apollo/client'

import { Test, Profile } from '@/app/graphql/generated'
import { Loading, Error, EDIT_BUTTON_CLASS, CANCEL_BUTTON_CLASS, DELETE_BUTTON_CLASS, BUTTON_CLASS } from '@/components/utils'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { myTimestamp } from '@/lib/utils'

const TestQuery = gql`
    query Test($_id: ObjectId!) {
        test(_id: $_id) {
            _id
            title
            note_id
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

export default function TestWrapper({_id}: {_id: string}) {
    const [editMode, setEditMode] = useState(false)
    const { loading, error, data } = useQuery<{test: Test, profile: Profile|null}>(
        TestQuery, {variables: { _id }})

    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />

    const test = data?.test 
    const profile = data?.profile

    if (editMode) return <EditTest test={test} setEditMode={setEditMode} profile={profile}/>
    return <>
        <ViewTest test={test} profile={profile} />
        {
            profile 
            && test.author_id === profile._id
            && <button className={EDIT_BUTTON_CLASS} onClick={() => setEditMode(!editMode)}>
                {"Edit"}
            </button>
        }
    </>
}

const NewSubmissionMutation = gql`
    mutation NewSubmission($test_id: ObjectId!) {
        newSubmission(test_id: $test_id)
}`

function ViewTest({test,profile}: {
    test: Test,
    profile: Profile|null
}) {
    const router = useRouter()
const [startSubmission, { loading: isStarting, error: startError }] = useMutation(NewSubmissionMutation, {
    refetchQueries: [
        { query: TestQuery, variables: { _id: test._id } }
    ]
})
    const [now, setNow] = useState(new Date())
    
    // Aggiorna il timestamp ogni secondo
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date())
        }, 1000);
        return () => clearInterval(interval);
    }, [])
    return <div className="matbit-test">
        <h1>
            {test.title || `Test ${test._id}`}
        </h1>
        { !profile
            && <span>Fai il login per iniziare il test</span>
        }
        {
            profile
            && test.my_submissions.length === 0 
            && (!test.open_on || (test.open_on < now))
            && (!test.close_on || (test.close_on > now)) 
            && <button className={BUTTON_CLASS} disabled={isStarting} onClick={async () => {
                const result = await startSubmission({ variables: { test_id: test._id } })
                const submission_id = result.data?.newSubmission
                if (submission_id) {
                    router.push(`/submission/${submission_id}`)
                }
            }}>
                inizia
            </button>
        }
        {startError && <Error error={startError} />}
        {test.my_submissions.map(submission => <a key={submission._id} className={BUTTON_CLASS} href={`/submission/${submission._id}`}>
            { submission.completed_on 
                ? `riapri test completato il ${myTimestamp(submission.completed_on)}`
                : `riprendi test del ${myTimestamp(submission.started_on)}`
            }
        </a>)}
    </div>
}

const DeleteTestMutation = gql`
    mutation DeleteTest($_id: ObjectId!) {
    deleteTest(_id: $_id)
}`

function EditTest({test, profile, setEditMode}: {
    test: Test,
    profile: Profile|null,
    setEditMode: (editMode: boolean) => void
}) {
    const router = useRouter()
    const [deleteTest, { loading: isDeleting, error: deleteError }] = useMutation(DeleteTestMutation)

    return <>
        <ViewTest test={test} profile={profile}/>
        <button className={CANCEL_BUTTON_CLASS} onClick={() => setEditMode(false)}>
            annulla
        </button>
        <button className={DELETE_BUTTON_CLASS} disabled={isDeleting} onClick={async () => {
            if (confirm("Sei sicuro di voler eliminare questo test?")) {
                await deleteTest({ variables: { _id: test._id } })
                router.back()
            }
        }}>
            elimina
        </button>
        {deleteError && <Error error={deleteError} />}
    </>
}