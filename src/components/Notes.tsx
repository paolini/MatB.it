"use client"
import { gql, useQuery } from "@apollo/client"

import { Loading, Error } from "@/components/utils"

const notesQuery = gql`
    query Notes {
        notes {
            _id
            title
            created_on
            updated_on
        }
    }
`
export default function Notes() {
    const { loading, error, data } = useQuery(notesQuery)
    if (loading) return <Loading />
    if (data === undefined) return <Error error={error} />
    return <>
        <h2 className="text-2xl font-bold text-center">Notes</h2>
        <div className="flex flex-col gap-4">
            {data.notes.map((note: any) => (
                <div key={note._id} className="border p-4 rounded-md">
                    <h3 className="text-xl font-bold">{note.title}</h3>
                    <p className="text-gray-500">
                        {new Date(note.created_on).toLocaleDateString()} {}
                        {new Date(note.updated_on).toLocaleDateString()}
                    </p>
                </div>
            ))}
        </div>
        <div className="flex justify-center">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md">Create Note</button>
        </div>
    </>
}