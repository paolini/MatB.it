"use client"
import { gql, useQuery } from "@apollo/client"
import Link from 'next/link'

import { Loading, Error } from "@/components/utils"
import { Note } from "@/app/graphql/generated"
import dynamic from "next/dynamic"

const MyQuill = dynamic(() => import('@/components/MyQuill'), { ssr: false });

const notesQuery = gql`
    query Notes {
        notes {
            _id
            title
            created_on
            updated_on
            author {
                displayName
            }
        }
    }
`
export default function Notes() {
    const { loading, error, data } = useQuery(notesQuery)
    if (loading) return <Loading />
    if (error) return <Error error={error} />
    return <>
        <h2>editor</h2>
        <MyQuill />
        <h2 className="text-2xl font-bold text-center">Notes</h2>
        <div className="flex flex-col gap-4">
            {data.notes.map((note: Note) => (
                <div key={note._id} className="border p-4 rounded-md">
                    <h3 className="text-xl font-bold"><Link href={`/note/${note._id}`}>{note.title}</Link></h3>
                    <p className="text-gray-500">
                        {note.author && <span>by {note.author.displayName}</span>}
                        {} created on {new Date(note.created_on).toLocaleDateString()} {}
                        {} modified on {new Date(note.updated_on).toLocaleDateString()}
                    </p>
                </div>
            ))}
        </div>
        <div className="flex justify-center">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md">Create Note</button>
        </div>
    </>
}

