"use client"
import { gql, useQuery, useMutation } from '@apollo/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation';

import { useSearchParams } from 'next/navigation';

import { Note, Profile } from '@/app/graphql/generated'
import TestList from '@/components/TestList'
import { Loading, Error, EDIT_BUTTON_CLASS } from '@/components/utils'
import NoteContent from '@/components/NoteContent'
import NoteForm from '@/components/NoteForm'
import ShareModal from '@/components/ShareModal'
import { ObjectId } from 'bson';
import NoteVersionTree from './NoteVersionTree';
import { parseJsonBody } from '@apollo/client/link/http/parseAndCheckHttpResponse';

const ProfileQuery = gql`
    query Profile {
        profile {
            _id
            name
        }
    }
`

const NoteQuery = gql`
    query Note($_id: ObjectId!) {
        note(_id: $_id) {
            _id
            title
            hide_title
            private
            delta
            variant
            author {
                _id
                name
            }
            created_on
            updated_on
            class_id
            class {
                _id
                name
                academic_year}
            tests {
                _id
                note_id
                title
                created_on
                author_id
                open_on
                close_on
                class_id
            }
            note_version_id
        }
    }
`

function emptyNote(profile: Profile): Note {
    return {
        _id: new ObjectId('000000000000000000000000'),
        title: '',
        hide_title: false,
        private: false,
        delta: null,
        variant: '',
        created_on: null,
        updated_on: null,
        class_id: null,
        class: null,
        tests: [],
        author: {
            _id: profile._id,
            name: profile.name,
            email: profile.email,
            image: profile.image
        },
        author_id: profile._id,
        note_version_id: new ObjectId('000000000000000000000000'),
    }
}

export default function NoteWrapper({ _id }: { _id: string }) {
    const searchParams = useSearchParams();
    const editMode = searchParams.get('edit') !== null;
    const isNew = _id === '__new__';
    const { loading, error, data } = useQuery<{ note: Note, profile: Profile }>(
        NoteQuery, { variables: { _id }, skip: isNew })
    const { loading: profileLoading, error: profileError, data: profileData } = useQuery<{ profile: Profile }>(
        ProfileQuery)

    if (error || profileError) return <Error error={error || profileError} />
    if (loading || profileLoading || !profileData) return <Loading />

    const profile = profileData?.profile
    const note = data?.note || emptyNote(profile);

    if (editMode || isNew) return <NoteEdit note={note} isNew={isNew} />
    else return <NoteView note={note} profile={profile} />
}

const DeleteNoteMutation = gql`
    mutation DeleteNote($_id: ObjectId!) {
        deleteNote(_id: $_id)
    }
`

function NoteView({note, profile}: {
    note: Note,
    profile: Profile,
}) {
    const [showShareModal, setShowShareModal] = useState(false)
    const [deleteNote, { loading: deleting, error: deleteError }] = useMutation(DeleteNoteMutation, {
        refetchQueries: ["Note"],
    })
    const [showVersionTree, setShowVersionTree] = useState(false)

    return <div>
        <div className={`ql-variant-container ql-var-${note.variant || 'default'}`}>
            <div className="flex items-center gap-3 mb-4">
                {!note.hide_title && <h1 className="flex-1">{note.title}</h1>}
                {note.class?._id && (
                    <a
                        href={`/class/${(note as any).class._id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        title={`Classe: ${(note as any).class.name}`}
                    >
                        <span>🎓</span>
                        <span>{note.class.name}</span>
                    </a>
                )}
            </div>
            <div className="delta">
                <NoteContent note={note} />
            </div>
        </div>
        <TestList tests={note.tests} />
        <NoteFooter note={note} />
        <div className="flex gap-2">
            {note?.author?._id === profile?._id ? (
                <>
                    <a className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors" href={`?edit`}>
                        Edit
                    </a>
                    <button 
                        onClick={() => setShowShareModal(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        Condividi
                    </button>
                    <button
                        onClick={async () => {
                            if (window.confirm('Sei sicuro di voler eliminare questa nota?')) {
                                await deleteNote({ variables: { _id: note._id } })
                                window.location.href = '/';
                            }
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        disabled={deleting}
                    >
                        {deleting ? 'Eliminazione...' : 'Elimina'}
                    </button>
                </>
            ) : (
                profile?._id && <CloneNoteButton note={note} />
            )}
            {deleteError && <Error error={deleteError} />}
            {note?.variant === 'test' && (
                <CreateTestButton note={note} />
            )}
        </div>
        
        <ShareModal 
            resource={note}
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
        />

        {!showVersionTree && (
        <button
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            onClick={() => setShowVersionTree(true)}
        >
            Mostra storico versioni
        </button>
        )}
        {showVersionTree && 
            /* Storico versioni della nota */
            <div className="mt-4">
                <NoteVersionTree note_version_id={note.note_version_id.toString()} />
            </div>
        }
    </div>
}

    // Pulsante Clona
    function CloneNoteButton({note}: {note: Note}) {
        const CLONE_NOTE_MUTATION = gql`
            mutation CloneNote($note_id: ObjectId!) {
                cloneNote(note_id: $note_id)
            }
        `
        const [cloneNote, { loading, error }] = useMutation(CLONE_NOTE_MUTATION)
        const router = useRouter()
        return (
            <button
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                disabled={loading}
                onClick={async () => {
                    const res = await cloneNote({ variables: { note_id: note._id } })
                    if (res?.data?.cloneNote) {
                        router.push(`/note/${res.data.cloneNote}`)
                    }
                }}
            >
                {loading ? "Clonazione..." : "Clona"}
            </button>
            // Mostra errori se presenti
            // {error && <Error error={error} />}
        )
    }

const CREATE_NOTE_MUTATION = gql`
    mutation NewNote($title: String, $delta: JSON, $variant: String, $private: Boolean, $hide_title: Boolean, $class_id: ObjectId) {
        newNote(title: $title, delta: $delta, variant: $variant, private: $private, hide_title: $hide_title, class_id: $class_id)
    }
`

function NoteEdit({note, isNew}: {note: Note, isNew?: boolean}) {
    return <div>
        <NoteForm note={note} isNew={isNew} />
        <NoteFooter note={note} />
    </div>
}

function NoteFooter({note}: {
    note: Note,
}) {
    return <div>
        { note.author &&
            <p className="text-gray-500">
                By {note.author.name}
                {note.private && <span> (privata)</span>}
            </p>
        }
    </div>
}

const NewTestMutation = gql`
    mutation NewTest($note_id: ObjectId!, $title: String, $class_id: ObjectId) {
        newTest(note_id: $note_id, title: $title, class_id: $class_id)
    }
`

function CreateTestButton({note}: {note: Note}) {
    const note_id = note._id
    const title = note.title || ""
    // const private_test = note.private // rimosso
    const class_id = (note as any).class_id || undefined
    
    const [createTest, { loading, error }] = useMutation(NewTestMutation, {
        refetchQueries: ["Note"],
    })

    return <>
        <button
            className="px-4 py-2 bg-green-500 text-white rounded mt-2 hover:bg-green-600 transition-colors"
            onClick={() => createTest({ variables: { note_id, title, class_id } })}
            disabled={loading}
            >
                {loading ? 'Creazione...' : 'Crea test'}
        </button>
        {error && <Error error={error} />}
    </>
}
