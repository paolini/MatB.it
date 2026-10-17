"use client"
import { useState, useEffect } from 'react'
import { gql, useMutation, useLazyQuery } from '@apollo/client'
import { Note } from '@/app/graphql/generated'
import { VARIANT_NAMES } from '@/lib/models';
import { ObjectId } from 'bson';

// Type definition per Delta (per evitare import diretto)
type DeltaType = unknown;

const NewNoteMutation = gql`
mutation NewNote($title: String!, $delta: JSON, $private: Boolean, $variant: String) {
  newNote(title: $title, delta: $delta, private: $private, variant: $variant)
}`

const NotesQuery = gql`
query Notes($class_id: ObjectId) {
  notes(class_id: $class_id) {
    _id
    title
    variant
    private
    author {
      name
    }
  }
}`

interface NoteReferenceModalProps {
  isOpen: boolean
  onClose: () => void
  onNoteSelected: (noteId: string) => void
  initialVariant?: string
  class_id?: ObjectId
}

type TabType = 'existing' | 'new'

export default function NoteReferenceModal({ isOpen, onClose, onNoteSelected, initialVariant = 'default', class_id }: NoteReferenceModalProps) {
  console.log('🔧 NoteReferenceModal: Render con props:', { isOpen, onNoteSelected: typeof onNoteSelected, initialVariant })
  
  const [activeTab, setActiveTab] = useState<TabType>('existing')
  
  // Stato per creazione nuova nota
  const [title, setTitle] = useState('')
  const [variant, setVariant] = useState(initialVariant)
  const [isPrivate, setIsPrivate] = useState(false)
  const [delta, setDelta] = useState<DeltaType>(null)
  
  // Stato per ricerca note esistenti
  const [searchTerm, setSearchTerm] = useState('')

  // Aggiorna variant quando initialVariant cambia
  useEffect(() => {
    if (isOpen) {
      setVariant(initialVariant)
      // Se la variant è diversa da 'default', vai direttamente al tab "new"
      if (initialVariant !== 'default') {
        setActiveTab('new')
      }
    }
  }, [isOpen, initialVariant])
  
  const [creationError, setCreationError] = useState<string | null>(null)
  const [createNote, { loading: creatingNote }] = useMutation<{ newNote: string }>(NewNoteMutation)
  const [getNotes, { data: notesData, loading: loadingNotes, error: notesError }] = useLazyQuery<{notes: Note[]}>(NotesQuery)

  useEffect(() => {
    if (isOpen) {
      getNotes({ variables: { class_id } })
    }
  }, [isOpen, class_id, getNotes])

  const handleCreateNote = async () => {
    if (creatingNote) return
    setCreationError(null)
    if (!title.trim()) {
      setCreationError('Il titolo è obbligatorio')
      return
    }

    try {
      const result = await createNote({
        variables: {
          title: title.trim(),
          delta,
          private: isPrivate,
          variant
        }
      })
      const noteId = result.data?.newNote
      if (!noteId) throw new Error('Errore nella creazione della nota')
      onNoteSelected(noteId)
    } catch (err) {
      setCreationError(err instanceof Error ? err.message : 'Errore nella creazione della nota')
    }
  }

  const handleSelectExistingNote = (noteId: string) => {
    console.log('🔗 handleSelectExistingNote: Selezione nota esistente con ID:', noteId)
    console.log('📞 handleSelectExistingNote: Chiamata onNoteSelected...')
    onNoteSelected(noteId)
    // Non chiamiamo handleClose() qui - la chiusura è gestita dal componente parent
    // dopo che ha inserito il riferimento nell'editor
    console.log('✅ handleSelectExistingNote: Operazione completata')
  }

  const handleClose = () => {
    console.log('🚪 handleClose: Chiusura modal e reset stato')
    setCreationError(null)
    setTitle('')
    setVariant(initialVariant)
    setIsPrivate(false)
    setDelta(null)
    setSearchTerm('')
    setActiveTab('existing')
    onClose()
  }

  // Filtra le note in base alla ricerca
  const filteredNotes = notesData?.notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Inserisci Riferimento Nota</h2>
          {/* Tab Navigation */}
          <div className="flex mt-4 border-b">
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'existing' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('existing')}
            >
              Seleziona Esistente
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'new' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('new')}
            >
              Crea Nuova
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'existing' ? (
            /* Tab per selezionare note esistenti */
            <div className="space-y-4">
              {/* Barra di ricerca */}
              <div>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Cerca note..."
                  autoFocus
                />
              </div>

              {/* Lista note */}
              {loadingNotes ? (
                <div className="text-center py-4">Caricamento note...</div>
              ) : notesError ? (
                <div className="text-red-600">Errore nel caricamento: {notesError.message}</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredNotes.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">
                      {searchTerm ? 'Nessuna nota trovata' : 'Nessuna nota disponibile'}
                    </div>
                  ) : (
                    filteredNotes.map(note => (
                      <div
                        key={note._id.toString()}
                        className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleSelectExistingNote(note._id.toString())}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{note.title}</h3>
                            <div className="text-sm text-gray-500">
                              {note.variant && note.variant !== 'default' && (
                                <span className={`inline-block px-2 py-1 rounded text-xs mr-2 ${getVariantClasses(note.variant)}`}>
                                  {note.variant}
                                </span>
                              )}
                              By {note.author.name}
                              {note.private && <span className="ml-2 text-orange-600">🔒 Privata</span>}
                            </div>
                          </div>
                          <button className="text-blue-600 hover:text-blue-800">
                            Seleziona →
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Tab per creare nuova nota */
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-bold"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Titolo della nota"
                />
              </div>

              <div>
                <select
                  className="border rounded px-3 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={variant}
                  onChange={e => setVariant(e.target.value)}
                >
                  { Object.entries(VARIANT_NAMES).map(([key, label]) => (
                    <option key={key} value={key}>{label || "nota generica"}</option>
                  )) }
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={e => setIsPrivate(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Nota privata</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreateNote}
                  disabled={creatingNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {creatingNote ? 'Creazione...' : 'Crea e Seleziona'}
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
              </div>
              
              {creationError && (
                <div className="text-red-600 text-sm mt-4">
                  Errore: {creationError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con pulsanti */}
        {activeTab === 'existing' && (
          <div className="p-6 border-t flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function per gli stili delle varianti
function getVariantClasses(variant: string): string {
  const classes = {
    theorem: 'bg-yellow-100 text-yellow-800',
    lemma: 'bg-blue-100 text-blue-800', 
    proof: 'bg-gray-100 text-gray-800',
    remark: 'bg-purple-100 text-purple-800',
    exercise: 'bg-green-100 text-green-800',
    test: 'bg-red-100 text-red-800',
    default: 'bg-gray-100 text-gray-800'
  }
  return classes[variant as keyof typeof classes] || classes.default
}
