"use client"
import { useState } from 'react'
import { gql, useMutation, useQuery } from '@apollo/client'
import { Note } from '@/app/graphql/generated'
import NoteForm from './NoteForm'

// Type definition per Delta (per evitare import diretto)
type DeltaType = any;

const NewNoteMutation = gql`
mutation NewNote($title: String!, $delta: JSON, $private: Boolean, $variant: String) {
  newNote(title: $title, delta: $delta, private: $private, variant: $variant) {
    _id
    title
    delta
    variant
    private
    author { _id name }
  }
}`

const NotesQuery = gql`
query Notes {
  notes {
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
}

type TabType = 'existing' | 'new'

export default function NoteReferenceModal({ isOpen, onClose, onNoteSelected }: NoteReferenceModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('existing')
  
  // Stato per creazione nuova nota
  const [title, setTitle] = useState('')
  const [variant, setVariant] = useState('default')
  const [isPrivate, setIsPrivate] = useState(false)
  const [delta, setDelta] = useState<DeltaType>(null)
  
  // Stato per ricerca note esistenti
  const [searchTerm, setSearchTerm] = useState('')
  
  const [createNote, { loading: creating, error: createError }] = useMutation(NewNoteMutation)
  const { data: notesData, loading: loadingNotes, error: notesError } = useQuery<{notes: Note[]}>(NotesQuery)

  const handleCreateNote = async () => {
    if (!title.trim()) {
      alert('Il titolo è obbligatorio')
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

      if (result.data?.newNote) {
        onNoteSelected(result.data.newNote._id)
        handleClose()
      }
    } catch (err) {
      console.error('Errore nella creazione della nota:', err)
    }
  }

  const handleSelectExistingNote = (noteId: string) => {
    onNoteSelected(noteId)
    handleClose()
  }

  const handleClose = () => {
    setTitle('')
    setVariant('default')
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
                        key={note._id}
                        className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleSelectExistingNote(note._id)}
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
            <div>
                        <NoteForm
                            initialTitle={title}
                            initialVariant={variant}
                            initialPrivate={isPrivate}
                            initialDelta={delta}
                            showTitleAs="input"
                            onTitleChange={setTitle}
                            onVariantChange={setVariant}
                            onPrivateChange={setIsPrivate}
                            onDeltaChange={setDelta}
                            showActions={false}
                        />              {createError && (
                <div className="text-red-600 text-sm mt-4">
                  Errore: {createError.message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con pulsanti */}
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            disabled={creating}
          >
            Annulla
          </button>
          {activeTab === 'new' && (
            <button
              onClick={handleCreateNote}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              disabled={creating || !title.trim()}
            >
              {creating ? 'Creando...' : 'Crea e Inserisci'}
            </button>
          )}
        </div>
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
