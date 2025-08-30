"use client"
import React, { useState } from 'react'
import Badge from "@/components/Badge"
import { gql, useQuery, NetworkStatus } from "@apollo/client"
import Link from 'next/link'

import { Loading, Error } from "@/components/utils"
import { Note, Profile } from "@/app/graphql/generated"
import NewNoteButton from "./NewNoteButton"
import { myTimestamp } from "@/lib/utils"

const notesQuery = gql`
    query Notes($mine: Boolean, $private: Boolean, $limit: Int, $skip: Int) {
        notes(mine: $mine, private: $private, limit: $limit, skip: $skip) {
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
    
    const NOTES_PER_PAGE = 20
    
    const { loading, error, data, fetchMore, networkStatus } = useQuery(notesQuery, {
        variables: { 
            mine: filter === 'mie', 
            private: filter === 'private', 
            limit: NOTES_PER_PAGE,
            skip: 0
        },
        notifyOnNetworkStatusChange: true
    })
    
    const notes = data?.notes || []
    const profile = data?.profile
    const hasMore = notes.length % NOTES_PER_PAGE === 0 && notes.length > 0
    const loadingMore = networkStatus === NetworkStatus.fetchMore

    const loadMore = async () => {
        if (loadingMore || !hasMore) return
        
        await fetchMore({
            variables: {
                mine: filter === 'mie',
                private: filter === 'private',
                limit: NOTES_PER_PAGE,
                skip: notes.length
            },
            updateQuery: (prev, { fetchMoreResult }) => {
                if (!fetchMoreResult) return prev
                return {
                    ...prev,
                    notes: [...prev.notes, ...fetchMoreResult.notes]
                }
            }
        })
    }

    return <>
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 w-full justify-start">
                <h2 className="text-2xl font-bold">Note</h2>
                <NewNoteButton />
            </div>
            <div className="flex gap-2">
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
                
                { notes.length } note visualizzate.
                {/* Pulsante Carica di più */}
                {hasMore && (
                    <div className="flex justify-center">
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            carica altre...
                        </button>
                    </div>
                )}
            </>
        }
    </>
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