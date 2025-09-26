"use client"
import { gql, useMutation, useQuery } from '@apollo/client'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'

import { Test, Profile, Submission, AnswerItem, TestStats, ScoreDistributionEntry } from '@/app/graphql/generated'
import { Loading, Error, EDIT_BUTTON_CLASS, CANCEL_BUTTON_CLASS, DELETE_BUTTON_CLASS, BUTTON_CLASS, SAVE_BUTTON_CLASS } from '@/components/utils'
import { useEffect, useState, useMemo, memo } from 'react'
import { myTimestamp, formatDuration } from '@/lib/utils'
import Link from 'next/link'
import ShareModal from './ShareModal'

// Definizione dei tab disponibili
type TabKey = 'info' | 'scores' | 'exercises' | 'submissions'

interface TabInfo {
    key: TabKey
    label: string
    icon: string
}

const TABS: TabInfo[] = [
    { key: 'info', label: 'Informazioni', icon: '📋' },
    { key: 'scores', label: 'Punteggi', icon: '📊' },
    { key: 'exercises', label: 'Esercizi', icon: '🧮' },
    { key: 'submissions', label: 'Consegne', icon: '📝' }
]

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
                score_distribution {
                    score_range
                    count
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
    const accessToken = searchParams.get('token')
    const { loading, error, data } = useQuery<{test: Test, profile: Profile|null}>(
        TestQuery, {variables: { _id }})

    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />

    const test = data?.test 
    const profile = data?.profile

    if (editMode) return <EditTest test={test} profile={profile}/>
    return <ViewTest test={test} profile={profile} accessToken={accessToken} />
}

const NewSubmissionMutation = gql`
    mutation NewSubmission($test_id: ObjectId!) {
        newSubmission(test_id: $test_id)
}`

function ViewTest({test, profile, accessToken}: {
    test: Test,
    profile: Profile|null,
    accessToken?: string | null
}) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [showShareModal, setShowShareModal] = useState(false)
    const [startSubmission, { loading: isStarting, error: startError }] = useMutation(NewSubmissionMutation, {
    refetchQueries: [
        { query: TestQuery, variables: { _id: test._id } }
    ]
})
    const [now, setNow] = useState(new Date())
    
    // Determina se l'utente può vedere i dettagli (è l'autore o ha un token)
    const canViewDetails = test.author._id === profile?._id || accessToken
    
    // Gestione del tab attivo
    const activeTab = (searchParams.get('tab') as TabKey) || 'info'
    
    const switchTab = (tab: TabKey) => {
        const params = new URLSearchParams(searchParams)
        if (tab === 'info') {
            params.delete('tab') // Default tab, non serve specificarlo
        } else {
            params.set('tab', tab)
        }
        
        // Mantieni altri parametri come token
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
        router.push(newUrl)
    }
    
    // Aggiorna il timestamp ogni secondo
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date())
        }, 1000);
        return () => clearInterval(interval);
    }, [])

    const isOpen = useMemo(() => 
        (!test.open_on || new Date(test.open_on) <= now) && (!test.close_on || new Date(test.close_on) >= now),
        [test.open_on, test.close_on, now]
    )
    
    return <div className="matbit-test">
        <h1>
            {test.title || `Test ${test._id}`}
        </h1>
        
        {/* Tab navigation - solo se l'utente può vedere i dettagli */}
        {canViewDetails && (
            <>
                <div className="border-b border-gray-200 mb-6">
                    <nav className="flex space-x-8">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => switchTab(tab.key)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.key
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab content */}
                <div className="tab-content">
                    {activeTab === 'info' && <TestInfoTab test={test} now={now} isOpen={isOpen} profile={profile} setShowShareModal={setShowShareModal} showShareModal={showShareModal} />}
                    {activeTab === 'scores' && test.stats && <TestScoresTab stats={test.stats} />}
                    {activeTab === 'exercises' && test.stats && <TestExercisesTab stats={test.stats} />}
                    {activeTab === 'submissions' && test.submissions && <TestSubmissionsTab submissions={test.submissions} accessToken={accessToken} />}
                </div>
            </>
        )}
    </div>
}

function SubmissionTable({submissions, accessToken}: {submissions: Submission[], accessToken?: string | null}) {
    const [sortColumn, setSortColumn] = useState<string>('started_on')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
    
    const headers: string[] = []
    submissions.forEach(submission => {
        submission.answers.forEach(answer => {
            const note_id = answer.note_id.toString()
            if (answer.note_id && !headers.includes(note_id)) {
                headers.push(note_id)
            }
        })
    })

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const sortedSubmissions = [...submissions].sort((a, b) => {
        let valueA: any = ''
        let valueB: any = ''

        switch (sortColumn) {
            case 'rank':
                // Per il rank, ordiniamo prima per punteggio (desc) poi per durata (asc)
                const getRankValue = (submission: Submission) => {
                    const score = submission.score || 0
                    const duration = submission.started_on && submission.completed_on 
                        ? new Date(submission.completed_on).getTime() - new Date(submission.started_on).getTime()
                        : Number.MAX_SAFE_INTEGER
                    // Creiamo un valore composito: punteggio negativo (per desc) + durata normalizzata
                    return -score * 1000000 + duration / 1000
                }
                valueA = getRankValue(a)
                valueB = getRankValue(b)
                break
            case 'started_on':
                valueA = new Date(a.started_on || 0).getTime()
                valueB = new Date(b.started_on || 0).getTime()
                break
            case 'completed_on':
                valueA = new Date(a.completed_on || 0).getTime()
                valueB = new Date(b.completed_on || 0).getTime()
                break
            case 'duration':
                const getDurationMs = (submission: Submission) => {
                    if (!submission.started_on || !submission.completed_on) return 0
                    return new Date(submission.completed_on).getTime() - new Date(submission.started_on).getTime()
                }
                valueA = getDurationMs(a)
                valueB = getDurationMs(b)
                break
            case 'author':
                valueA = a.author?.name || ''
                valueB = b.author?.name || ''
                break
            case 'score':
                valueA = a.score || 0
                valueB = b.score || 0
                break
        }

        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1
        return 0
    })

    const getSortIcon = (column: string) => {
        if (sortColumn !== column) return ' ↕'
        return sortDirection === 'asc' ? ' ↑' : ' ↓'
    }

    // Calcola i rank delle submission
    const submissionsWithRank = [...submissions]
        .filter(s => s.completed_on) // Solo submission completate per il ranking
        .sort((a, b) => {
            // Ordina per punteggio decrescente, poi per tempo crescente
            if ((a.score || 0) !== (b.score || 0)) {
                return (b.score || 0) - (a.score || 0)
            }
            const durationA = a.started_on && a.completed_on 
                ? new Date(a.completed_on).getTime() - new Date(a.started_on).getTime()
                : Number.MAX_SAFE_INTEGER
            const durationB = b.started_on && b.completed_on 
                ? new Date(b.completed_on).getTime() - new Date(b.started_on).getTime()
                : Number.MAX_SAFE_INTEGER
            return durationA - durationB
        })

    const rankMap = new Map<string, { rank: number, percentile: number }>()
    const totalCompleted = submissionsWithRank.length
    
    submissionsWithRank.forEach((submission, index) => {
        const rank = index + 1
        // Calcola il percentile: (n - rank + 1) / n * 100
        // dove n è il numero totale di submission completate
        const percentile = totalCompleted > 1 
            ? Math.round((totalCompleted - rank + 1) / totalCompleted * 100)
            : 100
        rankMap.set(submission._id, { rank, percentile })
    })

    return <table className="mt-4 w-full border-2 border-black" style={{borderCollapse: 'collapse'}}>
        <thead className="bg-gray-100">
            <tr>
                <th className="px-2 py-1 text-left border border-black">#</th>
                <th 
                    className="px-2 py-1 text-left border border-black cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('rank')}
                >
                    Rank{getSortIcon('rank')}
                </th>
                <th 
                    className="px-2 py-1 text-left border border-black cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('started_on')}
                >
                    Inizio{getSortIcon('started_on')}
                </th>
                <th 
                    className="px-2 py-1 text-left border border-black cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('completed_on')}
                >
                    Fine{getSortIcon('completed_on')}
                </th>
                <th 
                    className="px-2 py-1 text-left border border-black cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('duration')}
                >
                    Tempo{getSortIcon('duration')}
                </th>
                <th 
                    className="px-2 py-1 text-left border border-black cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('author')}
                >
                    Autore{getSortIcon('author')}
                </th>
                <th 
                    className="px-2 py-1 text-left border border-black cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('score')}
                >
                    Punti{getSortIcon('score')}
                </th>
                {headers.map((header,i) => (
                    <th 
                        key={header.toString()} 
                        className="px-2 py-1 text-left border border-black"
                    >
                        {i+1}
                    </th>
                ))}
            </tr>
        </thead>
        <tbody>
            {sortedSubmissions.map((submission, index) => <SubmissionRow key={submission._id} submission={submission} headers={headers} index={index + 1} rankMap={rankMap} accessToken={accessToken}/>)}
        </tbody>
    </table>
}

const COMMON_CLASSNAME = "px-2 py-1 border border-black"

function SubmissionRow({submission, headers, index, rankMap, accessToken}:{
    submission: Submission
    headers: string[]
    index: number
    rankMap: Map<string, { rank: number, percentile: number }>
    accessToken?: string | null
}) {
    const map = Object.fromEntries(submission.answers.map(item => [item.note_id.toString(), item]))
    
    // Costruisci il link con il token se presente
    const getSubmissionLink = () => {
        if (accessToken) {
            return `/submission/${submission._id}?token=${accessToken}`
        }
        return `/submission/${submission._id}`
    }
    
    // Calcola il tempo impiegato
    const getDuration = () => {
        if (!submission.started_on || !submission.completed_on) return '-'
        const start = new Date(submission.started_on)
        const end = new Date(submission.completed_on)
        const diffMs = end.getTime() - start.getTime()
        return formatDuration(diffMs)
    }

    const getRank = () => {
        const rankData = rankMap.get(submission._id)
        return rankData ? `${rankData.rank} (${rankData.percentile}%)` : '-'
    }
    
    return (
        <tr className="hover:bg-gray-50">
            <td className={`${COMMON_CLASSNAME} text-center`}>
                <Link href={getSubmissionLink()} className="block w-full h-full">
                    {index} 👁
                </Link>
            </td>
            <td className={`${COMMON_CLASSNAME} text-center`}>{getRank()}</td>
            <td className={COMMON_CLASSNAME}>{myTimestamp(submission.started_on)}</td>
            <td className={COMMON_CLASSNAME}>{myTimestamp(submission.completed_on)}</td>
            <td className={COMMON_CLASSNAME}>{getDuration()}</td>
            <td className={COMMON_CLASSNAME}>{submission.author.name}</td>
            <td className={COMMON_CLASSNAME}>{submission.score ? submission.score.toFixed(1) : ''}</td>
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
                {n == null ? '-' :n === 0 ? <b>A</b> : String.fromCharCode(65 + n)}
            </td>
        }
    }
}

// Componenti per i vari tab
function TestInfoTab({test, now, isOpen, profile, setShowShareModal, showShareModal}: {
    test: Test,
    now: Date,
    isOpen: boolean,
    profile: Profile|null,
    setShowShareModal: (open: boolean) => void,
    showShareModal: boolean
}) {
    const isOwner = profile?._id === test.author._id
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Informazioni dettagliate</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <strong>Autore:</strong> {test.author.name || test.author.email}
                    </div>
                    <div>
                        <strong>Creato il:</strong> {myTimestamp(test.created_on)}
                    </div>
                    <div>
                        <strong>Apertura:</strong> {
                            test.open_on 
                                ? myTimestamp(test.open_on)
                                : "Sempre aperto"
                        }
                    </div>
                    <div>
                        <strong>Chiusura:</strong> {
                            test.close_on 
                                ? myTimestamp(test.close_on)
                                : "Sempre aperto"
                        }
                    </div>
                    <div>
                        <strong>Stato attuale:</strong> {
                            isOpen
                                ? <span className="text-green-600 font-semibold">Aperto</span>
                                : <span className="text-red-600 font-semibold">Chiuso</span>
                        }
                    </div>
                    <div>
                        <strong>Visibilità:</strong> {
                            test.private 
                                ? <span className="text-yellow-600">Privato</span>
                                : <span className="text-blue-600">Pubblico</span>
                        }
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Contenuto del test</h3>
                <div className="text-gray-600">
                    <Link href={`/note/${test.note_id}`} className="text-blue-600 hover:text-blue-800 underline">
                        Visualizza il contenuto del test →
                    </Link>
                </div>
            </div>

            {/* Pulsanti autore, visibili solo all'autore */}
            { isOwner && (
                <div className="flex gap-2 mb-4">
                    <Link href={`/note/${test.note_id}?edit`} className={EDIT_BUTTON_CLASS}>
                        Modifica nota con il testo del test
                    </Link>
                    <Link href={`?edit`} className={EDIT_BUTTON_CLASS}>
                        Modifica proprietà del test
                    </Link>
                    <button 
                        onClick={() => setShowShareModal(true)}
                        className={EDIT_BUTTON_CLASS}
                    >
                        Condividi
                    </button>
                </div>
            )}
            {/* ShareModal spostato qui */}
            <ShareModal 
                resource={test}
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
            />
        </div>
    )
}

function TestScoresTab({stats}: {stats: TestStats}) {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Riepilogo punteggi</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.completed_submissions}</div>
                        <div className="text-sm text-gray-600">Consegne totali</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.min_submissions_for_stats}</div>
                        <div className="text-sm text-gray-600">Minimo per statistiche</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{stats.score_distribution.length}</div>
                        <div className="text-sm text-gray-600">Fasce di punteggio</div>
                    </div>
                </div>
            </div>

            {/* Grafico distribuzione punteggi */}
            {stats.score_distribution.length > 0 && (
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">Distribuzione dei punteggi</h3>
                    <ScoreDistributionChart distribution={stats.score_distribution} />
                </div>
            )}

            {stats.completed_submissions < stats.min_submissions_for_stats && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-yellow-800">
                        📊 Sono necessarie almeno {stats.min_submissions_for_stats} consegne per visualizzare le statistiche dettagliate.
                        Attualmente ci sono {stats.completed_submissions} consegne.
                    </p>
                </div>
            )}
        </div>
    )
}

// Tabella statistiche per esercizio
function ExerciseStatsTable({exercises}: {exercises: any[]}) {
    return (
        <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse border border-gray-300">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Esercizio</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Risposte totali</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Risposte corrette</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Risposte vuote</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">% Successo</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Punteggio medio</th>
                    </tr>
                </thead>
                <tbody>
                    {exercises.map((exercise, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">Esercizio {index + 1}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{exercise.total_answers}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center text-green-600 font-semibold">{exercise.correct_answers}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center text-red-600">{exercise.empty_answers}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                                {exercise.total_answers > 0 ? Math.round((exercise.correct_answers / exercise.total_answers) * 100) : 0}%
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                                {exercise.average_score !== null ? (exercise.average_score * 100).toFixed(1) + '%' : 'N/A'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// Grafico prestazioni per esercizio
function ExerciseStatsChart({exercises}: {exercises: any[]}) {
    return (
        <div>
            <h4 className="text-md font-semibold mb-3">Grafico prestazioni per esercizio</h4>
            <ExerciseStatisticsChart exercises={exercises} />
        </div>
    )
}

function TestExercisesTab({stats}: {stats: TestStats}) {
    const hasDetailedStats = stats.exercises.length > 0

    if (!hasDetailedStats) {
        return <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-yellow-800">
                    📊 Sono necessarie almeno {stats.min_submissions_for_stats} consegne per visualizzare le statistiche per esercizio.
                </p>
        </div>
    }

    return <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Statistiche per esercizio</h3>
            {/* Grafico statistiche per esercizio */}
            <ExerciseStatsChart exercises={stats.exercises} />
            {/* Spazio verticale tra grafico e tabella */}
            <div className="my-8" />
            {/* Tabella statistiche */}
            <ExerciseStatsTable exercises={stats.exercises} />
            <div className="mt-4 text-sm text-gray-600">
                <p>💡 <strong>Legenda:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Risposte corrette:</strong> numero di risposte che hanno ottenuto il punteggio massimo</li>
                    <li><strong>% Successo:</strong> percentuale di risposte corrette sul totale</li>
                    <li><strong>Punteggio medio:</strong> media dei punteggi ottenuti per questo esercizio</li>
                    <li><strong>Risposte vuote:</strong> numero di esercizi lasciati senza risposta</li>
                </ul>
            </div>
        </div>
    </div>
}

function TestSubmissionsTab({submissions, accessToken}: {
    submissions: Submission[], 
    accessToken?: string | null
}) {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Elenco consegne</h3>
                <SubmissionTable submissions={submissions} accessToken={accessToken} />
            </div>
        </div>
    )
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
                    
                    {/* Grafico statistiche per esercizio */}
                    {stats.exercises.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-md font-semibold mb-3">Grafico prestazioni per esercizio</h4>
                            <div className="bg-white p-4 border border-gray-200 rounded-lg">
                                <ExerciseStatisticsChart exercises={stats.exercises} />
                            </div>
                        </div>
                    )}
                    
                    {/* Grafico distribuzione punteggi */}
                    {stats.score_distribution.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-md font-semibold mb-3">Distribuzione dei punteggi</h4>
                            <div className="bg-white p-4 border border-gray-200 rounded-lg">
                                <ScoreDistributionChart distribution={stats.score_distribution} />
                            </div>
                        </div>
                    )}
                    
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

const ExerciseStatisticsChart = memo(function ExerciseStatisticsChart({ exercises }: { exercises: any[] }) {
    // Se non ci sono dati, non mostrare nulla
    if (exercises.length === 0) {
        return null
    }

    // Prepara i dati per il grafico
    const chartData = exercises.map((exercise, index) => ({
        exercise: `Es. ${index + 1}`,
        successRate: exercise.total_answers > 0 
            ? Math.round((exercise.correct_answers / exercise.total_answers) * 100)
            : 0,
        averageScore: exercise.average_score !== null 
            ? Math.round(exercise.average_score * 100)
            : 0,
        totalAnswers: exercise.total_answers,
        correctAnswers: exercise.correct_answers,
        emptyAnswers: exercise.empty_answers
    }))

    return (
        <div>
            <div className="text-sm text-gray-600 mb-4">
                Percentuale di successo e punteggio medio per ciascun esercizio
            </div>
            <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="exercise" 
                            stroke="#666"
                            fontSize={12}
                        />
                        <YAxis 
                            stroke="#666"
                            fontSize={12}
                            domain={[0, 100]}
                            tickFormatter={(value: any) => `${value}%`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                            formatter={(value: any, name: any) => {
                                const label = name === 'successRate' 
                                    ? 'Percentuale successo'
                                    : 'Punteggio medio'
                                return [`${value}%`, label]
                            }}
                            labelFormatter={(label: any, payload: any) => {
                                if (payload && payload.length > 0) {
                                    const data = payload[0].payload
                                    return `${label} - Totali: ${data.totalAnswers} | Corrette: ${data.correctAnswers} | Vuote: ${data.emptyAnswers}`
                                }
                                return label
                            }}
                        />
                        <Bar 
                            dataKey="successRate" 
                            fill="#10b981"
                            name="successRate"
                            radius={[2, 2, 0, 0]}
                            stroke="#059669"
                            strokeWidth={1}
                        >
                            <LabelList 
                                dataKey="successRate" 
                                position="top" 
                                formatter={(value: any) => `${value}%`}
                                fontSize={10}
                                fill="#059669"
                            />
                        </Bar>
                        <Bar 
                            dataKey="averageScore" 
                            fill="#3b82f6"
                            name="averageScore"
                            radius={[2, 2, 0, 0]}
                            stroke="#2563eb"
                            strokeWidth={1}
                        >
                            <LabelList 
                                dataKey="averageScore" 
                                position="top" 
                                formatter={(value: any) => `${value}%`}
                                fontSize={10}
                                fill="#2563eb"
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Percentuale successo</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Punteggio medio</span>
                </div>
            </div>
        </div>
    )
})

const ScoreDistributionChart = memo(function ScoreDistributionChart({ distribution }: { distribution: ScoreDistributionEntry[] }) {
    // Se non ci sono dati, mostra un messaggio
    if (distribution.length === 0) {
        return (
            <div className="text-center text-gray-500 py-4">
                Nessun dato disponibile
            </div>
        )
    }

    // Prepara i dati per Recharts
    const chartData = distribution.map(entry => ({
        scoreRange: `${entry.score_range}-${entry.score_range + 1}`,
        count: entry.count,
        label: `${entry.score_range} - ${entry.score_range + 1} punti`
    }))

    return (
        <div>
            <div className="text-sm text-gray-600 mb-4">
                Numero di studenti per fascia di punteggio
            </div>
            <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 60,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="scoreRange" 
                            stroke="#666"
                            fontSize={12}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis 
                            stroke="#666"
                            fontSize={12}
                            tickFormatter={(value) => Math.round(value).toString()}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                            formatter={(value, name) => [
                                `${value} ${value === 1 ? 'studente' : 'studenti'}`, 
                                'Numero di studenti'
                            ]}
                            labelFormatter={(label) => `Fascia: ${label} punti`}
                        />
                        <Bar 
                            dataKey="count" 
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            stroke="#2563eb"
                            strokeWidth={1}
                        >
                            <LabelList 
                                dataKey="count" 
                                position="top" 
                                fontSize={10}
                                fill="#2563eb"
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
})

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