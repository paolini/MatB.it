"use client"
import { gql, useQuery } from '@apollo/client'

import { Note, Profile } from '@/app/graphql/generated'
import { Loading, Error } from '@/components/utils'
import { assert } from '@/lib/utils'
import dynamic from "next/dynamic"

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

export default function NoteElement({_id}: {_id: string}) {
    const { loading, error, data } = useQuery<{note: Note, profile: Profile}>(
        NoteQuery, {variables: { _id }})
    if (loading) return <Loading />
    if (error) return <Error error={error} />    
    assert(data)
    const note = data.note
    const profile = data.profile
    return <div>
        <h1>{ note.title }</h1>
        <MyQuill readOnly={true} content={note.delta}/>
        { note.author &&
            <>
            <p className="text-gray-500">
                By {note.author.name}.
                {note?.author?._id === profile?._id}
            </p>
            <pre>
                {JSON.stringify({note,profile}, null, 2)}
            </pre>
            </>
        }
    </div>
}