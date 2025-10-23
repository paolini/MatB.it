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
    
    const handleRecalculateScores = async () => {
        if (confirm('Sei sicuro di voler ricalcolare tutti i punteggi delle submission completate? Questa operazione potrebbe richiedere del tempo.')) {
            await recalculateScores({ variables: { _id: test._id } })
        }
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
            </div>

            {/* ShareModal spostato qui */}
            <ShareModal 
                resource={test}
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
            />
        </div>
    )
}
