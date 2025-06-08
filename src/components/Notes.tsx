"use client"
import { gql, useQuery } from "@apollo/client"
import Link from 'next/link'

import { Loading, Error } from "@/components/utils"
import { Note } from "@/app/graphql/generated"

const notesQuery = gql`
    query Notes {
        notes {
            _id
            title
            private
            created_on
            updated_on
            author {
                name
            }
        }
    }
`
export default function Notes() {
    const { loading, error, data } = useQuery(notesQuery)
    if (loading) return <Loading />
    if (error) return <Error error={error} />

    const public_notes = data.notes.filter((note: Note) => !note.private)   
    const private_notes = data.notes.filter((note: Note) => note.private)
    return <>
        <div className="flex justify-center">
            <Link href="/note/new">
                <button className="bg-blue-500 text-white px-4 py-2 rounded-md">
                    Nuova Nota
                </button>
            </Link>
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
                            <NoteItem key={note._id} note={note} />
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
                        <NoteItem key={note._id} note={note} />
                    )}
            </div>
        </>}
    </>
}

function NoteItem({ note }: { note: Note }) {
    return (
        <div className="border p-4 rounded-md">
            <h3 className="text-xl font-bold">
                <Link href={`/note/${note._id}`}>{note.title}</Link>
            </h3>
            <p className="text-gray-500">
                {note.author && <span>by {note.author.name}</span>}
                {} created on {new Date(note.created_on).toLocaleDateString()} {}
                {} modified on {new Date(note.updated_on).toLocaleDateString()}
            </p>
        </div>
    )
}