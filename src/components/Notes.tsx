"use client"
import React, { useState } from 'react'
import { gql, useQuery } from "@apollo/client"
import Link from 'next/link'

import { Loading, Error } from "@/components/utils"
import { Note, Profile } from "@/app/graphql/generated"
import NewNoteButton from "./NewNoteButton"
import { myTimestamp } from "@/lib/utils"

const notesQuery = gql`
    query Notes($mine: Boolean, $private: Boolean, $limit: Int) {
        notes(mine: $mine, private: $private, limit: $limit) {
            _id
            title
            private
            created_on
            updated_on
            author_id
            author {
                name
            }
        }
        profile {
            _id    
        }
    }
`
export default function Notes() {
    const [filter, setFilter] = useState<'tutte' | 'mie' | 'private'>('tutte')
    const { loading, error, data } = useQuery(notesQuery, {
        variables: { mine: filter === 'mie', private: filter === 'private', limit: 20 } // Default values
    })
    const notes = data?.notes
    const profile = data?.profile

    return <>
        <div className="flex flex-col items-center gap-2 mb-4">
            <div className="flex items-center gap-3 w-full justify-start">
                <h2 className="text-2xl font-bold">Note</h2>
                <NewNoteButton />
            </div>
            <div className="flex gap-2 mt-2">
                <Badge active={filter === 'tutte'} onClick={() => setFilter('tutte')}>Tutte</Badge>
                <Badge active={filter === 'mie'} onClick={() => setFilter('mie')}>Mie</Badge>
                <Badge active={filter === 'private'} onClick={() => setFilter('private')}>Private</Badge>
            </div>
        </div>

        {loading && <Loading />}
        <Error error={error} />
        { notes && notes.length === 0 &&
            <div className="text-center text-gray-500">
                Nessuna nota trovata.
            </div>
        }

        { notes && notes.length > 0 && <>
                <div className="flex flex-col gap-4">
                    {notes.map((note: Note) =>
                        (<NoteItem note={note} profile={profile} key={note._id} />)
                    )}
                </div>
            </>
        }
    </>
// Badge component
function Badge({ active, children, onClick }: { active: boolean, children: React.ReactNode, onClick: () => void }) {
    return (
        <button
            className={`px-3 py-1 rounded-full border text-sm font-semibold transition-colors ${
                active ? 'bg-black text-white border-black' : 'bg-gray-100 text-gray-700 border-gray-300'
            }`}
            onClick={onClick}
        >
            {children}
        </button>
    )
}
}

function NoteItem({ note, profile }: { note: Note, profile: Profile }) {
    const isPrivate = note.private
    const isMine = note.author_id === profile?._id

    return <Link
                href={`/note/${note._id}`}
                className={`border p-4 rounded-md block ${
                    isPrivate ? "alert-color"
                    : isMine ? "good-color"
                    : "default-color"}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
            >
            <h3 className="text-xl font-bold">
                {note.title}
            </h3>
            <p className="text-gray-500">
                {note.author && <span>di {note.author.name}</span>}
                {' '}creata il {myTimestamp(new Date(note.created_on))}
                {' '}modificata il {myTimestamp(new Date(note.updated_on))}
            </p>
    </Link>
}