"use client"
import { gql, useQuery, useMutation } from '@apollo/client'
import { useState } from 'react';

import { Note, Profile } from '@/app/graphql/generated'
import { Loading, Error } from '@/components/utils'
import dynamic from "next/dynamic"
import { Delta } from '@/lib/myquill'

const MyQuill = dynamic(() => import('@/components/MyQuill'), { ssr: false });

const NoteQuery = gql`
query Note($_id: ObjectId!) {
    note(_id: $_id) {
        _id
        title
        delta
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

export default function NoteWrapper({_id}: {_id: string}) {
    const { loading, error, data, refetch } = useQuery<{note: Note, profile: Profile}>(
        NoteQuery, {variables: { _id }})
    const [updateNote, { loading: saving, error: saveError }] = useMutation(UpdateNoteMutation)
    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />
    return <NoteInner 
        note={data.note} 
        profile={data.profile} 
        updateNote={updateNote} 
        saveError={saveError} 
        refetch={refetch} 
    />
}

function NoteInner({
    note,
    profile,
    updateNote,
    saveError,
    refetch
}: {
    note: Note,
    profile: Profile,
    updateNote: any,
    saveError: any,
    refetch: () => void
}) {
    const [editMode, setEditMode] = useState(false)

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
            />
        ) : (
            <>
                <h1>{note.title}</h1>
                <MyQuill readOnly={true} content={note.delta}/>
                {note.private && <span className="text-sm text-gray-500">Nota privata</span>}
            </>
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
    saveError
}: {
    note: Note,
    onSave: (title: string, delta: Delta, isPrivate: boolean) => void,
    onCancel: () => void,
    saveError: any
}) {
    const [title, setTitle] = useState(note.title)
    const [isPrivate, setIsPrivate] = useState(note.private)
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
                {saveError && <span className="text-red-500 ml-2">Errore: {saveError.message}</span>}
            </div>
        </>
    )
}

