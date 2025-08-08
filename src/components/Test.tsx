"use client"
import { gql, useMutation, useQuery } from '@apollo/client'

import { Test, Profile, Submission } from '@/app/graphql/generated'
import { Loading, Error, EDIT_BUTTON_CLASS, CANCEL_BUTTON_CLASS, DELETE_BUTTON_CLASS, BUTTON_CLASS } from '@/components/utils'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { myTimestamp } from '@/lib/utils'
import Link from 'next/link'

const TestQuery = gql`
    query Test($_id: ObjectId!) {
        test(_id: $_id) {
            _id
            title
            note_id
            created_on
            open_on 
            close_on
            submissions {
                _id
                started_on
                completed_on
                score
                author {
                    _id
                    name
                }
            }
            author {
                _id
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

function ViewTest({test, profile}: {
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
            && test.submissions.length === 0 
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
        <div className="flex flex-col gap-2">
            {test.submissions
                .filter(submission => submission.author?._id === profile?._id)
                .map(submission => <SubmissionElement key={submission._id} submission={submission} />)}
        </div>
        { test.author._id === profile?._id && <table className="mt-4 w-full border-2 border-black" style={{borderCollapse: 'collapse'}}>
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-2 py-1 text-left border border-black"></th>
                        <th className="px-2 py-1 text-left border border-black">Inizio</th>
                        <th className="px-2 py-1 text-left border border-black">Fine</th>
                        <th className="px-2 py-1 text-left border border-black">Autore</th>
                        <th className="px-2 py-1 text-left border border-black">Punti</th>
                    </tr>
                </thead>
                <tbody>
                {test.submissions.map(submission => <SubmissionRow key={submission._id} submission={submission} />)}
                </tbody>
            </table>
        }
    </div>
}

function SubmissionElement({submission}:{
    submission: Submission
}) {
            return <a key={submission._id} className={BUTTON_CLASS} href={`/submission/${submission._id}`}>
                { submission.completed_on 
                    ? `riapri test completato il ${myTimestamp(submission.completed_on)}`
                    : `riprendi test del ${myTimestamp(submission.started_on)}`
                }
        </a>
}

function SubmissionRow({submission}:{
    submission: Submission
}) {
    const router = useRouter()
    return (
        <tr className="hover:bg-gray-50">
            <td className="px-2 py-1 border border-black text-center"><Link href={`/submission/${submission._id}`} className="block w-full h-full">👁</Link></td>
            <td className="px-2 py-1 border border-black">{myTimestamp(submission.started_on)}</td>
            <td className="px-2 py-1 border border-black">{myTimestamp(submission.completed_on)}</td>
            <td className="px-2 py-1 border border-black">{submission.author.name}</td>
            <td className="px-2 py-1 border border-black">{submission.score || ''}</td>
        </tr>
    )
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