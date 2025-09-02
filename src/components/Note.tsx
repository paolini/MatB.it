"use client"
import { gql, useQuery, useMutation } from '@apollo/client'
import { useState } from 'react'

import { useSearchParams } from 'next/navigation';

import { Note, Profile } from '@/app/graphql/generated'
import TestList from '@/components/TestList'
import { Loading, Error, EDIT_BUTTON_CLASS } from '@/components/utils'
import NoteContent from '@/components/NoteContent'
import NoteForm from '@/components/NoteForm'
import ShareModal from '@/components/ShareModal'

const NoteQuery = gql`
    query Note($_id: ObjectId!) {
        note(_id: $_id) {
            _id
            title
            hide_title
            delta
            variant
            author {
                _id
                name
            }
            created_on
            updated_on
            private
            tests {
                _id
                note_id
                title
                created_on
                author_id
                open_on
                close_on
                private
            }
        }
        profile {
            _id
        }
    }
`

export default function NoteWrapper({ _id }: { _id: string }) {
    const searchParams = useSearchParams();
    const editMode = searchParams.get('edit') !== null;
    const { loading, error, data } = useQuery<{ note: Note, profile: Profile }>(
        NoteQuery, { variables: { _id } })
    
    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />

    const note = data?.note
    const profile = data?.profile

    if (editMode) return <NoteEdit note={note} />
    else return <NoteView note={note} profile={profile} />
}

function NoteView({note, profile}: {
    note: Note,
    profile: Profile,
}) {
    const [showShareModal, setShowShareModal] = useState(false)
    
    return <div>
        <div className={`ql-variant-container ql-var-${note.variant || 'default'}`}>
            {   
                !note.hide_title &&
                <h1>{note.title}</h1>
            }
            <div className="delta">
                <NoteContent note={note} />
            </div>
            {note.private && <span className="text-sm text-gray-500">Nota privata</span>}
        </div>
        <TestList tests={note.tests} />
        <NoteFooter note={note} />
        <div className="flex gap-2">
        {note?.author?._id === profile?._id  && 
            <a className={EDIT_BUTTON_CLASS} href={`?edit`}>
                Edit
            </a>
        }
        {note?.author?._id === profile?._id  && 
            <button 
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
                Condividi
            </button>
        }
        {note?.variant === 'test' && (
            <CreateTestButton note={note} />
        )}
        </div>
        
        <ShareModal 
            resource={note}
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
        />
    </div>
}

function NoteEdit({note}: {note: Note}) {
    return <div>
        <NoteForm note={note}/>
        <NoteFooter note={note} />
    </div>
}

function NoteFooter({note}: {
    note: Note,
}) {
    return <div>
        { note.author &&
            <p className="text-gray-500">
                By {note.author.name}.
            </p>
        }
    </div>
}

const NewTestMutation = gql`
    mutation NewTest($note_id: ObjectId!, $title: String, $private: Boolean) {
        newTest(note_id: $note_id, title: $title, private: $private)
    }
`

function CreateTestButton({note}: {note: Note}) {
    const note_id = note._id
    const title = note.title || ""
    const private_test = note.private
    const [createTest, { loading, error }] = useMutation(NewTestMutation, {
        refetchQueries: ["Note"],
    })

    return <>
        <button
            className="px-4 py-2 bg-green-500 text-white rounded mt-2 hover:bg-green-600 transition-colors"
            onClick={() => createTest({ variables: { note_id, title, private: private_test } })}
            disabled={loading}
            >
                {loading ? 'Creazione...' : 'Crea test'}
        </button>
        {error && <Error error={error} />}
    </>
}
