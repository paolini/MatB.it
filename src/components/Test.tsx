"use client"
import { gql, useMutation, useQuery } from '@apollo/client'
import { useSearchParams } from 'next/navigation'

import { Test, Profile, Submission, AnswerItem, TestStats } from '@/app/graphql/generated'
import { Loading, Error, EDIT_BUTTON_CLASS, CANCEL_BUTTON_CLASS, DELETE_BUTTON_CLASS, BUTTON_CLASS, SAVE_BUTTON_CLASS } from '@/components/utils'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { myTimestamp } from '@/lib/utils'
import Link from 'next/link'
import ShareModal from '@/components/ShareModal'

const TestQuery = gql`
    query Test($_id: ObjectId!) {
        test(_id: $_id) {
            _id
            title
            note_id
            created_on
            open_on 
            close_on
            private
            submissions {
                _id
                started_on
                completed_on
                score
                author {
                    _id
                    name
                }
                answers {
                    note_id
                    answer
                    permutation
                }
            }
            stats {
                completed_submissions
                min_submissions_for_stats
                exercises {
                    correct_answers
                    total_answers
                    empty_answers
                    average_score
                    correlation_to_total
                }
            }
            author {
                _id
                email
            }
        }
        profile {
            _id
        }
    }
`

export default function TestWrapper({_id}: {_id: string}) {
    const searchParams = useSearchParams()
    const editMode = searchParams.get('edit') !== null
    const { loading, error, data } = useQuery<{test: Test, profile: Profile|null}>(
        TestQuery, {variables: { _id }})

    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />

    const test = data?.test 
    const profile = data?.profile

    if (editMode) return <EditTest test={test} profile={profile}/>
    return <ViewTest test={test} profile={profile} />
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
    const [showShareModal, setShowShareModal] = useState(false)
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
        
        <TestInfo test={test} now={now} isOwner={profile?._id === test.author._id} />

        { profile?._id === test.author._id && (
            <div className="flex gap-2 mb-4">
                <Link href={`/note/${test.note_id}?edit`} className={EDIT_BUTTON_CLASS}>
                    Modifica nota con il testo del test
                </Link>
                <Link href={`?edit`} className={EDIT_BUTTON_CLASS}>
                    Modifica proprietà del test
                </Link>
                <button 
                    onClick={() => setShowShareModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Condividi
                </button>
            </div>
        )}
        { !profile
            && <span>Fai il login per iniziare il test</span>
        }
        {
            profile 
            && test.submissions
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
                inizia test
            </button>
        }
        {startError && <Error error={startError} />}
        <div className="flex flex-col gap-2">
            {test.submissions && test.submissions
                .filter(submission => submission.author?._id === profile?._id)
                .map(submission => <SubmissionElement key={submission._id} submission={submission} />)}
        </div>
        { test.author._id === profile?._id && test.submissions && 
            <SubmissionTable submissions={test.submissions} /> }
        
        { test.author._id === profile?._id && test.stats && 
            <TestStatistics stats={test.stats} /> }
        
        <ShareModal 
            resource={test}
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
        />
    </div>
}

function TestInfo({test, now, isOwner}: {
    test: Test,
    now: Date,
    isOwner: boolean
}) {
    const isOpen = (!test.open_on || new Date(test.open_on) <= now) && (!test.close_on || new Date(test.close_on) >= now)
    
    if (!isOwner) {
        // Visualizzazione semplificata per utenti non proprietari
        return <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="space-y-2">
                    <div>
                        <span className="font-bold">Il test è</span> {
                            isOpen
                                ? <span className="text-green-600 font-semibold">aperto</span>
                                : <span className="text-red-600 font-semibold">chiuso</span>
                        }
                    </div>
                    {isOpen && test.close_on && (
                        <div>
                            <span className="font-bold">Si chiude il:</span> {myTimestamp(test.close_on)}
                        </div>
                    )}
                    {!isOpen && test.close_on && new Date(test.close_on) < now && (
                        <div>
                            <span className="font-bold">Si è chiuso il:</span> {myTimestamp(test.close_on)}
                        </div>
                    )}
                    {!isOpen && test.open_on && new Date(test.open_on) > now && (
                        <div>
                            <span className="font-bold">Si aprirà il:</span> {myTimestamp(test.open_on)}
                        </div>
                    )}
                </div>
        </div>
    }

    // Visualizzazione completa per il proprietario
    return (
        <div className="bg-gray-50 p-4 rounded-md mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <span className="font-bold">Autore:</span> {test.author?.email || 'Sconosciuto'}
                </div>
                <div>
                    <span className="font-bold">Creato il:</span> {myTimestamp(test.created_on)}
                </div>
                <div>
                    <span className="font-bold">Apertura:</span> {
                        test.open_on 
                            ? myTimestamp(test.open_on)
                            : "Sempre aperto"
                    }
                </div>
                <div>
                    <span className="font-bold">Chiusura:</span> {
                        test.close_on 
                            ? myTimestamp(test.close_on)
                            : "Sempre aperto"
                    }
                </div>
                <div>
                    <span className="font-bold">Stato:</span> {
                        isOpen
                            ? <span className="text-green-600 font-semibold">Aperto</span>
                            : <span className="text-red-600 font-semibold">Chiuso</span>
                    }
                </div>
                <div>
                    <span className="font-bold">Privacy:</span> {
                        test.private 
                            ? <span className="text-yellow-600">Privato</span>
                            : <span className="text-blue-600">Pubblico</span>
                    }
                </div>
            </div>
        </div>
    )
}

function SubmissionElement({submission}:{
    submission: Submission
}) {
    return <a key={submission._id} className={BUTTON_CLASS} href={`/submission/${submission._id}`}>
        { submission.completed_on 
            ? `visualizza test completato il ${myTimestamp(submission.completed_on)}`
            : `riprendi test del ${myTimestamp(submission.started_on)}`
        }
    </a>
}

function SubmissionTable({submissions}: {submissions: Submission[]}) {
    const headers: string[] = []
    submissions.forEach(submission => {
        submission.answers.forEach(answer => {
            const note_id = answer.note_id.toString()
            if (answer.note_id && !headers.includes(note_id)) {
                headers.push(note_id)
            }
        })
    })

    return <table className="mt-4 w-full border-2 border-black" style={{borderCollapse: 'collapse'}}>
        <thead className="bg-gray-100">
            <tr>
                <th className="px-2 py-1 text-left border border-black"></th>
                <th className="px-2 py-1 text-left border border-black">Inizio</th>
                <th className="px-2 py-1 text-left border border-black">Fine</th>
                <th className="px-2 py-1 text-left border border-black">Autore</th>
                <th className="px-2 py-1 text-left border border-black">Punti</th>
                {headers.map((header,i) => (
                    <th key={header.toString()} className="px-2 py-1 text-left border border-black">
                        {i+1}
                    </th>
                ))}
            </tr>
        </thead>
        <tbody>
            {submissions.map(submission => <SubmissionRow key={submission._id} submission={submission} headers={headers}/>)}
        </tbody>
    </table>
}

const COMMON_CLASSNAME = "px-2 py-1 border border-black"

function SubmissionRow({submission, headers}:{
    submission: Submission
    headers: string[]
}) {
    const map = Object.fromEntries(submission.answers.map(item => [item.note_id.toString(), item]))
    return (
        <tr className="hover:bg-gray-50">
            <td className={`${COMMON_CLASSNAME} text-center`}><Link href={`/submission/${submission._id}`} className="block w-full h-full">👁</Link></td>
            <td className={COMMON_CLASSNAME}>{myTimestamp(submission.started_on)}</td>
            <td className={COMMON_CLASSNAME}>{myTimestamp(submission.completed_on)}</td>
            <td className={COMMON_CLASSNAME}>{submission.author.name}</td>
            <td className={COMMON_CLASSNAME}>{submission.score || ''}</td>
            { headers.map(id => <AnswerItem key={id} item={map[id]} />)}
        </tr>
    )

    function AnswerItem({item}: {item: AnswerItem}) {
        if (!item || item.answer == null) return alpha(null)
        if (item.permutation && typeof(item.answer) === 'number') {
            return alpha(item.permutation[item.answer])
        }
        return alpha(item.answer)

        function alpha(n: number|null) {
            const color = 
                n === 0 ? ' bg-green-100' : 
                n == null ? '' 
                : ' bg-red-100'

            return <td className={`${COMMON_CLASSNAME}${color}`}>
                {n == null ? '---' :n === 0 ? <b>A</b> : String.fromCharCode(65 + n)}
            </td>
        }
    }
}

function TestStatistics({stats}: {stats: TestStats}) {
    const hasDetailedStats = stats.exercises.length > 0
    
    return (
        <div className="mt-6">
            <h2 className="text-xl font-bold mb-4">Statistiche del test</h2>
            
            <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <span className="font-bold">Test completati:</span> {stats.completed_submissions}
                    </div>
                    <div>
                        <span className="font-bold">Soglia privacy:</span> {stats.min_submissions_for_stats} test
                    </div>
                </div>
            </div>

            {!hasDetailedStats ? (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                    <p className="text-yellow-800">
                        📊 Le statistiche dettagliate degli esercizi saranno disponibili quando ci saranno almeno {stats.min_submissions_for_stats} test completati.
                    </p>
                    <p className="text-sm text-yellow-600 mt-2">
                        Attualmente: {stats.completed_submissions} / {stats.min_submissions_for_stats}
                    </p>
                </div>
            ) : (
                <div>
                    <h3 className="text-lg font-semibold mb-3">Statistiche per esercizio</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full border border-gray-300 rounded-lg" style={{borderCollapse: 'collapse'}}>
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-3 py-2 text-left border border-gray-300">Esercizio</th>
                                    <th className="px-3 py-2 text-center border border-gray-300">Risposte totali</th>
                                    <th className="px-3 py-2 text-center border border-gray-300">Risposte corrette</th>
                                    <th className="px-3 py-2 text-center border border-gray-300">Non risposte</th>
                                    <th className="px-3 py-2 text-center border border-gray-300">% Successo</th>
                                    <th className="px-3 py-2 text-center border border-gray-300">Punteggio medio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.exercises.map((exercise, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border border-gray-300 font-medium">
                                            Esercizio {index + 1}
                                        </td>
                                        <td className="px-3 py-2 text-center border border-gray-300">
                                            {exercise.total_answers}
                                        </td>
                                        <td className="px-3 py-2 text-center border border-gray-300">
                                            <span className="text-green-600 font-semibold">
                                                {exercise.correct_answers}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center border border-gray-300">
                                            <span className="text-gray-500">
                                                {exercise.empty_answers}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center border border-gray-300">
                                            <span className={`font-semibold ${
                                                exercise.total_answers > 0 
                                                    ? (exercise.correct_answers / exercise.total_answers >= 0.7 ? 'text-green-600' : 
                                                       exercise.correct_answers / exercise.total_answers >= 0.5 ? 'text-yellow-600' : 'text-red-600')
                                                    : 'text-gray-500'
                                            }`}>
                                                {exercise.total_answers > 0 
                                                    ? `${Math.round((exercise.correct_answers / exercise.total_answers) * 100)}%`
                                                    : 'N/A'
                                                }
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center border border-gray-300">
                                            {exercise.average_score !== null 
                                                ? exercise.average_score.toFixed(2)
                                                : 'N/A'
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {stats.exercises.length > 0 && (
                        <div className="mt-4 text-sm text-gray-600">
                            <p>💡 <strong>Legenda:</strong></p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                                <li><strong>Risposte corrette:</strong> risposte con punteggio massimo (1.0)</li>
                                <li><strong>% Successo:</strong> percentuale di risposte completamente corrette</li>
                                <li><strong>Punteggio medio:</strong> media dei punteggi ottenuti (0.0 - 1.0)</li>
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const DeleteTestMutation = gql`
    mutation DeleteTest($_id: ObjectId!) {
    deleteTest(_id: $_id)
}`

const UpdateTestMutation = gql`
    mutation UpdateTest($_id: ObjectId!, $title: String, $open_on: Timestamp, $close_on: Timestamp, $private: Boolean) {
        updateTest(_id: $_id, title: $title, open_on: $open_on, close_on: $close_on, private: $private) {
            _id
            title
            open_on
            close_on
            private
        }
    }
`

function EditTest({test, profile}: {
    test: Test,
    profile: Profile|null
}) {
    const router = useRouter()
    const [deleteTest, { loading: isDeleting, error: deleteError }] = useMutation(DeleteTestMutation)
    const [updateTest, { loading: isUpdating, error: updateError }] = useMutation(UpdateTestMutation, {
        refetchQueries: [
            { query: TestQuery, variables: { _id: test._id } }
        ]
    })

    // Stati per il form
    const [title, setTitle] = useState(test.title || '')
    const [isPrivate, setIsPrivate] = useState(test.private || false)
    // Helpers per conversione locale <-> UTC compatibili con input datetime-local
    function toLocalDatetimeInputValue(date: Date|string|undefined|null) {
        if (!date) return '';
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    const [openOn, setOpenOn] = useState(
        toLocalDatetimeInputValue(test.open_on)
    );
    const [closeOn, setCloseOn] = useState(
        toLocalDatetimeInputValue(test.close_on)
    );

    const handleSave = async () => {
        await updateTest({ 
            variables: { 
                _id: test._id,
                title: title || null,
                open_on: openOn ? new Date(openOn) : null,
                close_on: closeOn ? new Date(closeOn) : null,
                private: isPrivate
            } 
        })
        router.push(`/test/${test._id}`)
    }

    return <>
        <div className="space-y-4 mb-6">
            <h2 className="text-xl font-bold">Modifica Test</h2>
            
            {/* Titolo */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titolo del test
                </label>
                <input
                    type="text"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Titolo del test"
                />
            </div>

            {/* Date di apertura e chiusura */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data/ora di apertura
                    </label>
                    <input
                        type="datetime-local"
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={openOn}
                        onChange={e => setOpenOn(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Lascia vuoto per apertura immediata
                    </p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data/ora di chiusura
                    </label>
                    <input
                        type="datetime-local"
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={closeOn}
                        onChange={e => setCloseOn(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Lascia vuoto per test sempre aperto
                    </p>
                </div>
            </div>

            {/* Privacy */}
            <div>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={e => setIsPrivate(e.target.checked)}
                        className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Test privato</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                    Solo tu puoi vedere e gestire questo test
                </p>
            </div>

            {/* Errori */}
            {updateError && <Error error={updateError} />}
            {deleteError && <Error error={deleteError} />}
        </div>
        
        <div className="flex gap-2 mt-4">
            <button 
                className={SAVE_BUTTON_CLASS}
                onClick={handleSave}
                disabled={isUpdating}
            >
                {isUpdating ? 'Salvando...' : 'Salva modifiche'}
            </button>
            
            <button className={CANCEL_BUTTON_CLASS} onClick={() => router.push(`/test/${test._id}`)}>
                Annulla
            </button>
            
            <button className={DELETE_BUTTON_CLASS} disabled={isDeleting} onClick={async () => {
                if (confirm("Sei sicuro di voler eliminare questo test?")) {
                    await deleteTest({ variables: { _id: test._id } })
                    router.back()
                }
            }}>
                {isDeleting ? 'Eliminando...' : 'Elimina'}
            </button>
        </div>
    </>
}