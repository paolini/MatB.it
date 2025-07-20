"use client"
import { gql, useQuery, useMutation } from '@apollo/client'
import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation"

import { Note, Profile } from '@/app/graphql/generated'
import { Loading, Error } from '@/components/utils'
import dynamic from "next/dynamic"
import { Delta } from '@/lib/myquill/myquill.js'
import { DeltaRenderer } from '@/lib/deltaRenderer.js'

const MyQuill = dynamic(() => import('@/lib/myquill/MyQuill'), { ssr: false });

const NoteQuery = gql`
query Note($_id: ObjectId!) {
    note(_id: $_id) {
        _id
        title
        delta
        variant
        author {
            _id
            name
        }
        created_on
        updated_on
        private
    },
    profile{
        _id
    }
}`

const UpdateNoteMutation = gql`
mutation UpdateNote($_id: ObjectId!, $title: String, $delta: JSON, $private: Boolean) {
  updateNote(_id: $_id, title: $title, delta: $delta, private: $private) {
    _id
    title
    delta
    private
    updated_on
    author { _id name }
  }
}`

const DeleteNoteMutation = gql`
mutation DeleteNote($_id: ObjectId!) {
  deleteNote(_id: $_id) {
    _id
  }
}`

export default function NoteWrapper({_id}: {_id: string}) {
    const { loading, error, data, refetch } = useQuery<{note: Note, profile: Profile}>(
        NoteQuery, {variables: { _id }})
    const [updateNote, { loading: saving, error: saveError }] = useMutation(UpdateNoteMutation)
    const [deleteNote, { loading: deleting, error: deleteError }] = useMutation(DeleteNoteMutation)
    if (error) return <Error error={error} />    
    if (loading || saving || deleting || !data) return <Loading />
    return <NoteInner 
        note={data.note} 
        profile={data.profile} 
        updateNote={updateNote} 
        saveError={saveError} 
        refetch={refetch} 
        deleteNote={deleteNote}
        deleteError={deleteError}
    />
}

function NoteInner({
    note,
    profile,
    updateNote,
    saveError,
    refetch,
    deleteNote,
    deleteError
}: {
    note: Note,
    profile: Profile,
    updateNote: (options: { variables: { _id: string, title?: string, delta?: Delta, private?: boolean } }) => Promise<unknown>,
    saveError: Error | undefined,
    refetch: () => void,
    deleteNote: (options: { variables: { _id: string } }) => Promise<unknown>,
    deleteError: Error | undefined
}) {
    const [editMode, setEditMode] = useState(false)
    const [renderedContent, setRenderedContent] = useState('')
    const router = useRouter()
    
    // Crea il noteResolver per caricare note embedded
    const noteResolver = async (noteId: string) => {
        try {
          const response = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `
                query Note($_id: ObjectId!) {
                  note(_id: $_id) {
                    _id
                    title
                    delta
                    variant
                    author { name }
                  }
                }
              `,
              variables: { _id: noteId }
            })
          });
          const result = await response.json();
          return result.data?.note || null;
        } catch (error) {
          console.error('Error loading note:', error);
          return null;
        }
    };
    
    // Renderizza il contenuto quando cambia la nota
    useEffect(() => {
        // Aggiungi la funzione globale per mostrare info nota
        (window as any).showNoteInfo = async (noteId: string) => {
            try {
                const response = await fetch('/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: `
                            query Note($_id: ObjectId!) {
                                note(_id: $_id) {
                                    _id
                                    title
                                    variant
                                    author { name }
                                    created_on
                                    updated_on
                                    private
                                }
                            }
                        `,
                        variables: { _id: noteId }
                    })
                });
                const result = await response.json();
                const noteData = result.data?.note;
                
                if (noteData) {
                    const createdDate = new Date(noteData.created_on).toLocaleDateString();
                    const updatedDate = new Date(noteData.updated_on).toLocaleDateString();
                    const variantLabel = noteData.variant ? 
                        `${noteData.variant.charAt(0).toUpperCase()}${noteData.variant.slice(1)}` : 
                        'Nota';
                    const privacyText = noteData.private ? '\nPrivata' : '';
                    
                    alert(`${variantLabel}: ${noteData.title}\n\nAutore: ${noteData.author.name}\nCreata: ${createdDate}\nUltima modifica: ${updatedDate}${privacyText}`);
                } else {
                    alert('Impossibile caricare le informazioni della nota');
                }
            } catch (error) {
                console.error('Error loading note info:', error);
                alert('Errore nel caricamento delle informazioni');
            }
        };
        
        if (!editMode && note.delta) {
            const renderContent = async () => {
                try {
                    const html = await (DeltaRenderer as any).render(note.delta, { noteResolver });
                    setRenderedContent(html);
                } catch (error) {
                    console.error('Error rendering content:', error);
                    setRenderedContent('<p>Error rendering content</p>');
                }
            };
            renderContent();
        }
        
        // Cleanup: rimuovi la funzione globale quando il componente viene smontato
        return () => {
            delete (window as any).showNoteInfo;
        };
    }, [note.delta, editMode]);
    
    return <div>
        {editMode ? (
            <NoteEditInner
                note={note}
                saveError={saveError}
                onCancel={() => setEditMode(false)}
                onSave={async (title, delta, isPrivate) => {
                    await updateNote({ variables: { _id: note._id, title, delta, private: isPrivate } })
                    setEditMode(false)
                    refetch()
                }}
                onDelete={async () => {
                    // handled in NoteEditInner
                }}
                deleteNote={deleteNote}
                deleteError={deleteError}
                isAuthor={note?.author?._id === profile?._id}
                router={router}
            />
        ) : (
            // Rendering come variant per tutte le note, usando "default" se non c'è variant
            <div className={`ql-variant-container ql-var-${note.variant || 'default'}`}>
                <h1>
                    {note.title}
                </h1>
                <div 
                    className="delta" 
                    dangerouslySetInnerHTML={{ __html: renderedContent }}
                />
                {note.private && <span className="text-sm text-gray-500">Nota privata</span>}
            </div>
        )}
        { note.author &&
            <>
            <p className="text-gray-500">
                By {note.author.name}.
            </p>
            {note?.author?._id === profile?._id && !editMode && (
                <button className="px-4 py-2 bg-blue-500 text-white rounded mt-2 hover:bg-blue-600 transition-colors" onClick={() => setEditMode(true)}>
                    Edit Note
                </button>
            )}
            </>
        }
    </div>
}

function NoteEditInner({
    note,
    onSave,
    onCancel,
    saveError,
    onDelete: _onDelete,
    deleteNote,
    deleteError,
    isAuthor,
    router
}: {
    note: Note,
    onSave: (title: string, delta: Delta, isPrivate: boolean) => void,
    onCancel: () => void,
    saveError: Error | undefined,
    onDelete: () => void,
    deleteNote: (options: { variables: { _id: string } }) => Promise<unknown>,
    deleteError: Error | undefined,
    isAuthor: boolean,
    router: ReturnType<typeof useRouter>
}) {
    const [title, setTitle] = useState(note.title)
    const [isPrivate, setIsPrivate] = useState(note.private)
    const [showConfirm, setShowConfirm] = useState(false)
    return (
        <>
            <input className="text-2xl font-bold w-full mb-2" value={title} onChange={e => setTitle(e.target.value)} />
            <MyQuill
                readOnly={false}
                content={note.delta}
                onSave={delta => onSave(title, delta, isPrivate)}
            />
            <div className="mt-2 flex gap-2 items-center">
                <label className="flex items-center gap-1">
                    <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
                    privata
                </label>
                <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors" onClick={onCancel}>
                    Annulla
                </button>
                {isAuthor && (
                  <>
                    <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors" onClick={() => setShowConfirm(true)}>
                      Cancella nota
                    </button>
                    {showConfirm && (
                      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                        <div className="bg-white p-6 rounded shadow-lg flex flex-col items-center">
                          <p className="mb-4">Sei sicuro di voler cancellare questa nota?</p>
                          <div className="flex gap-2">
                            <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400" onClick={() => setShowConfirm(false)}>
                              Annulla
                            </button>
                            <button 
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600" 
                                onClick={handleDelete}>
                              Conferma cancellazione
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {saveError && <span className="text-red-500 ml-2">Errore: {saveError.message}</span>}
                {deleteError && <span className="text-red-500 ml-2">Errore cancellazione: {deleteError.message}</span>}
            </div>
        </>
    )

    async function handleDelete() {
        setShowConfirm(false); 
        await deleteNote({ variables: { _id: note._id } }); 
        router.push('/')
    }
}

