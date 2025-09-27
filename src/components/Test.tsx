"use client"
import { gql, useMutation, useQuery } from '@apollo/client'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

import { Test, Profile } from '@/app/graphql/generated'
import { Loading, Error, CANCEL_BUTTON_CLASS, DELETE_BUTTON_CLASS, SAVE_BUTTON_CLASS } from '@/components/utils'
import { useEffect, useState, useMemo } from 'react'
import TestInfoTab from './TestInfoTab'
import TestScoresTab from './TestScoresTab'
import TestExercisesTab from './TestExercisesTab'
import TestSubmissionsTab from './TestSubmissionsTab'
import StudentTestActions from './StudentTestActions'

// Definizione dei tab disponibili
type TabKey = 'info' | 'scores' | 'exercises' | 'submissions'

interface TabInfo {
    key: TabKey
    label: string
    icon: string
}

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
                answers {
                    note_id
                    answer
                    permutation
                }
            }
            stats {
                completed_submissions
                incompleted_submissions
                min_submissions_for_stats
                exercises {
                    correct_answers
                    total_answers
                    empty_answers
                    average_score
                    correlation_to_total
                }
                score_distribution {
                    score_min
                    score_max
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
        TestQuery, {variables: { _id }, pollInterval: 10000})

    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />

    const test = data?.test 
    const profile = data?.profile

    if (editMode) return <EditTest test={test} profile={profile}/>
    return <ViewTest test={test} profile={profile} accessToken={accessToken} />
}

const TABS: TabInfo[] = [
    { key: 'info', label: 'Informazioni', icon: '📋' },
    { key: 'scores', label: 'Punteggi', icon: '📊' },
    { key: 'exercises', label: 'Esercizi', icon: '🧮' },
    { key: 'submissions', label: 'Consegne', icon: '📝' }
]

function ViewTest({test, profile, accessToken}: {
    test: Test,
    profile: Profile|null,
    accessToken?: string | null
}) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [showShareModal, setShowShareModal] = useState(false)
    const [now, setNow] = useState(new Date())
    
    // Determina se l'utente può vedere i dettagli (è l'autore o ha un token)
    const canViewDetails = test.author._id === profile?._id || accessToken
    
    // Gestione del tab attivo
    let tabs = TABS
    if (!canViewDetails) tabs = tabs.filter(tab => ['scores', 'exercises'].includes(tab.key))

    if (!test.submissions || test.submissions.length < 1) tabs = tabs.filter(tab => !['scores', 'exercises', 'submissions'].includes(tab.key))
    // Scegli il tab di default: 'info' se presente, altrimenti 'scores'
    const defaultTab = tabs.some(tab => tab.key === 'info') ? 'info' : 'scores'
    const activeTab = (searchParams.get('tab') as TabKey) || defaultTab
    
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
        {/* Funzionalità studente: login, inizia test, proprie submission */}
        <StudentTestActions test={test} profile={profile} accessToken={accessToken} isOpen={isOpen} />
        {/* Tab navigation */}
        <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
                {tabs.map((tab) => (
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
            {activeTab === 'info' && canViewDetails && <TestInfoTab test={test} now={now} isOpen={isOpen} profile={profile} setShowShareModal={setShowShareModal} showShareModal={showShareModal} />}
            {activeTab === 'scores' && test.stats && canViewDetails && <TestScoresTab stats={test.stats} />}
            {activeTab === 'exercises' && test.stats && canViewDetails && <TestExercisesTab stats={test.stats} />}
            {activeTab === 'submissions' && canViewDetails && test.submissions && <TestSubmissionsTab submissions={test.submissions} accessToken={accessToken} />}
        </div>
    </div>
}

const ClassesQuery = gql`
  query Classes {
    classes {
      _id
      name
        owner_id
        teachers {
          _id
        }
        students {
        _id
        }
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
    const { data: classesData, loading: loadingClasses } = useQuery(ClassesQuery)
    // Stati per il form
    const [title, setTitle] = useState(test.title || '')
    const [classId, setClassId] = useState(test.class_id || '')
    // const [isPrivate, setIsPrivate] = useState(test.private || false) // rimosso
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
                class_id: classId || null,
                open_on: openOn ? new Date(openOn) : null,
                close_on: closeOn ? new Date(closeOn) : null
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
            {/* Selezione classe */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Classe associata
                </label>
                <select
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={classId?.toString() || ''}
                    onChange={e => setClassId(e.target.value)}
                    disabled={loadingClasses}
                >
                    <option value="">-- Nessuna classe --</option>
                    {classesData?.classes?.map((cls: any) => {
                        const isOwner = cls.owner_id === profile?._id
                        const isTeacher = cls.teachers?.some((t: any) => t._id === profile?._id)
                        return (
                            <option key={cls._id} value={cls._id.toString()} disabled={!isOwner && !isTeacher}>
                                {cls.name} {(!isOwner && !isTeacher) ? '(non autorizzato)' : ''}
                            </option>
                        )
                    })}
                </select>
                <p className="text-xs text-gray-500 mt-1">Solo il proprietario o un insegnante della classe può selezionarla.</p>
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

            {/* Privacy: rimosso, ora gestito da visibility */}

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

const DeleteTestMutation = gql`
    mutation DeleteTest($_id: ObjectId!) {
        deleteTest(_id: $_id)
    }
`

const UpdateTestMutation = gql`
    mutation UpdateTest($_id: ObjectId!, $title: String, $class_id: ObjectId, $open_on: Timestamp, $close_on: Timestamp, $private: Boolean) {
        updateTest(_id: $_id, title: $title, class_id: $class_id, open_on: $open_on, close_on: $close_on, private: $private) {
            _id
            title
            class_id
            open_on
            close_on
            private
        }
    }
`