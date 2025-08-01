"use client"
import { gql, useQuery, useMutation, useApolloClient } from '@apollo/client'

import { useState } from 'react';

import { Note, Profile, Test } from '@/app/graphql/generated'
import TestList from '@/components/TestList'
import { Loading, Error } from '@/components/utils'
import DeltaContent from '@/components/DeltaContent'
import NoteForm from '@/components/NoteForm'

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
            tests {
                _id
                note_id
                description
                created_on
                author_id
                open_on
                close_on
            }
        }
        profile {
            _id
        }
    }
`

export default function NoteWrapper({_id}: {_id: string}) {
    const [editMode, setEditMode] = useState(false)    
    const { loading, error, data, refetch } = useQuery<{note: Note, profile: Profile}>(
        NoteQuery, {variables: { _id }})

    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />

    const note = data?.note
    const profile = data?.profile
    

    if (editMode) return <div>
        <NoteForm
            mode="edit"
            noteId={note._id}
            initialTitle={note.title}
            initialVariant={note.variant || 'default'}
            initialPrivate={note.private}
            initialDelta={note.delta}
            showTitleAs="heading"
            titleClassName="text-2xl font-bold w-full mb-2"
            onEditComplete={() => {
                setEditMode(false)
                refetch()
            }}
            onEditCancel={() => setEditMode(false)}
            canDelete={note?.author?._id === profile?._id}
            showActions={true}
        />
        <NoteFooter note={note} />
    </div>
    
    return <div>
        <div className={`ql-variant-container ql-var-${note.variant || 'default'}`}>
            <h1>
                {note.title}
            </h1>
            <div className="delta">
                <DeltaContent 
                    delta={note.delta}
                />
            </div>
            {note.private && <span className="text-sm text-gray-500">Nota privata</span>}
        </div>
        <TestList tests={note.tests} />
        <NoteFooter note={note} />
        {note?.variant === 'test' && (
            <CreateTestButton noteId={note._id} />
        )}
        {note?.author?._id === profile?._id  && (
            <button className="px-4 py-2 bg-blue-500 text-white rounded mt-2 hover:bg-blue-600 transition-colors" onClick={() => setEditMode(true)}>
                Edit Note
            </button>
        )}
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

const CreateTestMutation = gql`
    mutation CreateTest($noteId: ObjectId!) {
        createTest(noteId: $noteId)
    }
`

function CreateTestButton({noteId}: {noteId: string}) {
    const [createTest, { loading, error }] = useMutation(CreateTestMutation, {
        refetchQueries: ["Note"],
    })

    return (
        <button
            className="px-4 py-2 bg-green-500 text-white rounded mt-2 hover:bg-green-600 transition-colors"
            onClick={() => createTest({ variables: { noteId } })}
            disabled={loading}
        >
            {loading ? 'Creazione...' : 'Crea test'}
            {error && <Error error={error} />}
        </button>
    )
}
