import Link from 'next/link'
import ShareModal from './ShareModal'
import { myTimestamp } from '@/lib/utils'
import { EDIT_BUTTON_CLASS, SAVE_BUTTON_CLASS } from '@/components/utils'
import { Test, Profile } from '@/app/graphql/generated'
import { gql, useMutation } from '@apollo/client'
import { useState } from 'react'

const RecalculateTestScoresMutation = gql`
    mutation RecalculateTestScores($_id: ObjectId!) {
        recalculateTestScores(_id: $_id)
    }
`

const FixSubmissionsMutation = gql`
    mutation FixSubmissions($test_id: ObjectId!, $question_index: Int!, $old_answer: Int, $new_answer: Int) {
        fixSubmissions(test_id: $test_id, question_index: $question_index, old_answer: $old_answer, new_answer: $new_answer)
    }
`

export default function TestInfoTab({test, now, isOpen, profile, setShowShareModal, showShareModal}: {
    test: Test,
    now: Date,
    isOpen: boolean,
    profile: Profile|null,
    setShowShareModal: (open: boolean) => void,
    showShareModal: boolean
}) {
    const isOwner = profile?._id === test.author._id
    const isTeacher = test.class?.teachers?.some((t: any) => t._id === profile?._id)
    const canEdit = isOwner || isTeacher
    
    const [recalculateScores, { loading: isRecalculating }] = useMutation(
        RecalculateTestScoresMutation,
        {
            refetchQueries: ['Test'],
            onCompleted: (data) => {
                const count = data.recalculateTestScores
                alert(`Punteggi ricalcolati con successo! ${count} submission${count !== 1 ? 's' : ''} aggiornate.`)
            },
            onError: (error) => {
                alert(`Errore durante il ricalcolo: ${error.message}`)
            }
        }
    )

    const [fixSubmissions, { loading: isFixing }] = useMutation(
        FixSubmissionsMutation,
        {
            refetchQueries: ['Test'],
            onCompleted: (data) => {
                alert(`Risposte aggiornate con successo in ${data.fixSubmissions} submission${data.fixSubmissions !== 1 ? 's' : ''}.`)
                setQuestionIndex('')
                setOldAnswer('')
                setNewAnswer('')
                setShowFixForm(false)
            },
            onError: (error) => {
                alert(`Errore nell'aggiornamento delle risposte: ${error.message}`)
            }
        }
    )

    const [showFixForm, setShowFixForm] = useState(false)
    const [questionIndex, setQuestionIndex] = useState('')
    const [oldAnswer, setOldAnswer] = useState('')
    const [newAnswer, setNewAnswer] = useState('')
    
    const handleRecalculateScores = async () => {
        if (confirm('Sei sicuro di voler ricalcolare tutti i punteggi delle submission completate? Questa operazione potrebbe richiedere del tempo.')) {
            await recalculateScores({ variables: { _id: test._id } })
        }
    }

    const handleFixSubmissions = async (event: React.FormEvent) => {
        event.preventDefault()

        const parsedQuestion = parseInt(questionIndex, 10)
        if (Number.isNaN(parsedQuestion) || parsedQuestion < 0) {
            alert('Inserisci un indice di esercizio valido (≥ 0).')
            return
        }

        const parseOptionalAnswer = (value: string) => {
            if (value === '') return null
            const parsed = parseInt(value, 10)
            if (Number.isNaN(parsed) || parsed < 0) {
                throw new Error('Le risposte devono essere numeri interi ≥ 0 oppure lasciate vuote per indicare nessuna risposta.')
            }
            return parsed
        }

        let normalizedOld: number | null
        let normalizedNew: number | null
        try {
            normalizedOld = parseOptionalAnswer(oldAnswer)
            normalizedNew = parseOptionalAnswer(newAnswer)
        } catch (error) {
            alert((error as Error).message)
            return
        }

        await fixSubmissions({
            variables: {
                test_id: test._id,
                question_index: parsedQuestion,
                old_answer: normalizedOld,
                new_answer: normalizedNew,
            }
        })
    }
    
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
            
            {/* Pulsanti autore e insegnanti */}
            <div className="flex gap-2 mb-4 flex-wrap">
                <Link href={`/note/${test.note_id}`} className={EDIT_BUTTON_CLASS}>
                    Visualizza test
                </Link>
                { isOwner && (
                    <>
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
                    </>
                )}
                { canEdit && test.submissions && test.submissions.length > 0 && (
                    <button 
                        onClick={handleRecalculateScores}
                        className={SAVE_BUTTON_CLASS}
                        disabled={isRecalculating}
                        title="Ricalcola tutti i punteggi delle submission completate (utile se ci sono stati cambiamenti nelle risposte corrette)"
                    >
                        {isRecalculating ? 'Ricalcolo in corso...' : '🔄 Ricalcola punteggi'}
                    </button>
                )}
                { canEdit && (
                    <button
                        onClick={() => setShowFixForm(prev => !prev)}
                        className={SAVE_BUTTON_CLASS}
                        disabled={isFixing}
                        title="Correggi in blocco le risposte date a un esercizio"
                    >
                        {showFixForm ? 'Annulla correzione' : '🛠️ Correggi risposte'}
                    </button>
                )}
            </div>

            { canEdit && showFixForm && (
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">Correggi risposte per esercizio</h3>
                    <form className="space-y-4" onSubmit={handleFixSubmissions}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Indice esercizio
                            </label>
                            <input
                                type="number"
                                min={0}
                                required
                                value={questionIndex}
                                onChange={event => setQuestionIndex(event.target.value)}
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Usa l'indice basato sull'ordine originale degli esercizi (quello mostrato nella tabella delle submission), numerazione zero-based.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Risposta attuale
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={oldAnswer}
                                    onChange={event => setOldAnswer(event.target.value)}
                                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Lascia vuoto per risposte non date"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Indice nell'ordine originario (0 = risposta corretta, 1 = seconda risposta...). Lascia vuoto per individuare risposte non date. Numerazione zero-based.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nuova risposta
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={newAnswer}
                                    onChange={event => setNewAnswer(event.target.value)}
                                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Lascia vuoto per impostare risposta non data"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Indice nell'ordine originario da assegnare. Lascia vuoto per cancellare la risposta. Numerazione zero-based.
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <button
                                type="submit"
                                className={SAVE_BUTTON_CLASS}
                                disabled={isFixing}
                            >
                                {isFixing ? 'Aggiornamento...' : 'Applica correzione'}
                            </button>
                        </div>
                    </form>
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
