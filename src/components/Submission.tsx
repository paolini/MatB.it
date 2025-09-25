"use client"
import { gql, useQuery, useMutation } from '@apollo/client'
import { useState, useEffect, useCallback, useRef } from 'react'

import { Profile, Submission } from '@/app/graphql/generated'
import { Loading, Error, EDIT_BUTTON_CLASS, DELETE_BUTTON_CLASS } from '@/components/utils'
// ...existing code...
import DocumentElement, { DocumentContext, ContextAnswer, OrdinalContextProvider } from './DocumentElement'
import { myTimestamp } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const SubmissionQuery = gql`
    query Submission($_id: ObjectId!) {
        submission(_id: $_id) {
            _id
            test {
                _id
                title
                open_on
                close_on
                author {
                    _id
                }
            }
            author {
                _id
                name
            }
            started_on
            completed_on
            document
            answers {
                note_id
                answer
                correct_answer
            }
            score
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

    const { submission, profile } = data

    return <SubmissionElement submission={submission} profile={profile} />
}

const SUBMIT_MUTATION = gql`
  mutation UpdateSubmission($_id: ObjectId!, $answers: [AnswerItemInput!]!) {
    updateSubmission(_id: $_id, answers: $answers)
  }
`

const TERMINATE_MUTATION = gql`
  mutation TerminateSubmission($_id: ObjectId!) {
    updateSubmission(_id: $_id, completed: true)
  }
`

function SubmissionElement({submission, profile}: {
    submission: Submission,
    profile?: Profile
}) {
    const entries: [string, ContextAnswer][] = (submission.answers || []).map(answer => [
        answer.note_id,
        {
            answer: answer.answer ?? null,
            correct_answer: answer.correct_answer ?? null
        }
    ])
    const questionIds: string[] = entries.map(([id]) => id)
    const answers_map: Record<string, ContextAnswer> = Object.fromEntries(entries)
    const [answers, setAnswers] = useState<Record<string, ContextAnswer>>(answers_map)

    // Reset answers state when submission changes
    useEffect(() => {
        setAnswers(answers_map)
    }, [submission._id, submission.answers])

    const [submitAnswers, { loading: isSubmitting, error: submitError }] = useMutation(SUBMIT_MUTATION, {
        refetchQueries: [
            { query: SubmissionQuery, variables: { _id: submission._id } }
        ]
    })
    const [terminateSubmission, { loading: isTerminating, error: terminateError }] = useMutation(TERMINATE_MUTATION, {
        variables: { _id: submission._id, completed: true },
        refetchQueries: [
            { query: SubmissionQuery, variables: { _id: submission._id } }
        ]
    })

    // Debounced autosave functionality
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false)
    
    const autoSave = useCallback((answersToSave: Record<string, ContextAnswer>) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        
        setIsAutoSaving(true)
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await submitAnswers({
                    variables: {
                        _id: submission._id,
                        answers: Object.entries(answersToSave).map(([note_id, item]) => ({ note_id, answer: item.answer })),
                    }
                })
            } catch (error) {
                console.error('Autosave failed:', error)
            } finally {
                setIsAutoSaving(false)
            }
        }, 1000) // Wait 1 second after the last change before saving
    }, [submitAnswers, submission._id])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
                setIsAutoSaving(false)
            }
        }
    }, [])

    const context: DocumentContext = {
        parents: [],
        questionIds,
        answers,
        setAnswer: (id: string, answer: number) => {
            const answer_object = answers[id]
            if (answer_object.answer !== answer) {
                const newAnswers = { ...answers, [id]: { ...answer_object, answer } }
                setAnswers(newAnswers)
                // Trigger autosave with the new answers
                autoSave(newAnswers)
            }
        },
    }

    return <OrdinalContextProvider>
        <h1>{submission.test.title || `submission ${submission._id}`}</h1>
        <Info submission={submission} profile={profile}/>
        <DocumentElement
            context={context}
            document={submission.document}
        />
        { submission.completed_on === null && <>
            <button 
                className={EDIT_BUTTON_CLASS} 
                disabled={isSubmitting || isTerminating || isAutoSaving}
                onClick={async () => {
                    await terminateSubmission()
                }}>
                {isAutoSaving ? 'salvataggio in corso...' : 'termina test'}
            </button>
        </>}
        <Error error={submitError} />
        <Error error={terminateError} />
    </OrdinalContextProvider>
}

const deleteMutation = gql`
    mutation DeleteSubmission($_id: ObjectId!) {
        deleteSubmission(_id: $_id)
    }
`

function Info({submission, profile}: {
    submission: Submission
    profile?: Profile
}) {
    const router = useRouter()
    const [deleteSubmission, { loading: isDeleting, error: deleteError }] = useMutation(deleteMutation, {
        variables: { _id: submission._id },
        onCompleted: () => {
            router.back()
        }
    })

    return <div style={{
        background: '#dbdbdbff',
        padding: '1em',
        margin: '1em 0',
        borderRadius: '6px 0 0 6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
        { submission.author._id !== profile?._id && <>
            <strong>Compilato da:</strong> {submission.author.name || '???'}
            <br />
        </>}
        { submission.test.open_on && <><strong>Apertura test:</strong> {myTimestamp(submission.test.open_on)}<br /></> }
        { submission.test.close_on && <><strong>Chiusura test:</strong> {myTimestamp(submission.test.close_on)}<br /></> }
        { (submission.test.close_on && !submission.completed_on) && <>Perché il test venga valutato devi terminarlo entro la data di chiusura.<br /></>}
        <strong>Iniziato:</strong> {myTimestamp(submission.started_on)}<br />
        { submission.completed_on && <>
            <strong>Finito:</strong> {myTimestamp(submission.completed_on)}, 
            {} tempo impiegato: {format_seconds((new Date(submission.completed_on).getTime() - new Date(submission.started_on).getTime())/1000)}<br />
        </>}
        { submission.score != null && <><strong>Punteggio:</strong> {submission.score} <br /></> }
        Ogni risposta corretta vale <i>1</i> punto, 
        ogni risposta sbagliata vale <i>0</i> punti,
        le risposte lasciate in bianco danno <i>2/(n+1)</i> punti, dove <i>n</i> è il numero di opzioni, 
        <br />
        { submission.test.author._id === profile?._id && 
            <div style={{ textAlign: 'right', marginTop: '1em' }}>
                <button className={DELETE_BUTTON_CLASS}
                    onClick={() => confirm('Sei sicuro di voler eliminare questa sottomissione?') && deleteSubmission()}
                    disabled={isDeleting}
                    >
                    🗑
                </button>
            </div>
        }
        <Error error={deleteError} />
    </div>
}

function format_seconds(seconds: number): string {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    let result = ''
    if (days > 0) result += `${days} giorn${days!==1 ? 'i' : 'o'}`
    if (hours > 0) result += ` ${hours} or${hours!==1 ? 'e' : 'a'}`
    if (minutes > 0) result += ` ${minutes} minut${minutes!==1 ? 'i' : 'o'}`
    if (secs > 0 || result === '') result += ` ${secs} second${secs!==1 ? 'i' : 'o'}`
    return result
}