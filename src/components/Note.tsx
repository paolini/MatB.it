"use client"
import { gql, useQuery } from '@apollo/client'
import { useState } from 'react';

import { Note, Profile } from '@/app/graphql/generated'
import { Loading, Error } from '@/components/utils'
import DeltaContent from '@/components/DeltaContent'
import NoteForm from '@/components/NoteForm'

// Type definition per Delta (per evitare import diretto)
type DeltaType = any;

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

export default function NoteWrapper({_id}: {_id: string}) {
    const { loading, error, data, refetch } = useQuery<{note: Note, profile: Profile}>(
        NoteQuery, {variables: { _id }})
    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />
    return <NoteInner 
        note={data.note} 
        profile={data.profile} 
        refetch={refetch} 
    />
}

function NoteInner({
    note,
    profile,
    refetch
}: {
    note: Note,
    profile: Profile,
    refetch: () => void
}) {
    const [editMode, setEditMode] = useState(false)
    
    return <div>
        {editMode ? (
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
        ) : (
            // Rendering come variant per tutte le note, usando "default" se non c'è variant
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

