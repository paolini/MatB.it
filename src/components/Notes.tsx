"use client"
import { gql, useQuery } from "@apollo/client"
import Link from 'next/link'

import { Loading, Error } from "@/components/utils"
import { Note, Profile } from "@/app/graphql/generated"
import NewNoteButton from "./NewNoteButton"
import { myTimestamp } from "@/lib/utils"

const notesQuery = gql`
    query Notes {
        notes {
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
    const { loading, error, data } = useQuery(notesQuery)
    if (loading) return <Loading />
    if (error) return <Error error={error} />

    const {notes, profile} = data

    const public_notes = notes.filter((note: Note) => !note.private)   
    const private_notes = notes.filter((note: Note) => note.private)
    return <>
        <div className="flex justify-center">
            <NewNoteButton />
        </div>

        { public_notes.length === 0 && private_notes.length === 0 && (
            <div className="text-center text-gray-500">
                Nessuna nota trovata. Crea la tua prima nota!
            </div>
        )}
        
        { public_notes.length > 0 && <>
                <h2 className="text-2xl font-bold text-center">Note</h2>
                <div className="flex flex-col gap-4">
                    {data.notes
                        .filter((note: Note) => !note.private)
                        .map((note: Note) =>
                            <NoteItem key={note._id} note={note} profile={profile}/>
                        )}
                </div>
            </>
        }

        { private_notes.length > 0 && <>
            <h2 className="text-2xl font-bold text-center">Note private</h2>
            <div className="flex flex-col gap-4">
                {data.notes
                    .filter((note: Note) => note.private)
                    .map((note: Note) =>
                        <NoteItem key={note._id} note={note} profile={profile}/>
                    )}
            </div>
        </>}
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