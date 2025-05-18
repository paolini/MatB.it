"use client"
import { gql, useQuery } from '@apollo/client'

import { Note } from '@/app/graphql/generated'
import { Loading, Error } from '@/components/utils'
import { assert } from '@/lib/utils'

const NoteQuery = gql`
query Note($_id: ObjectId!) {
    note(_id: $_id) {
        _id
        title
        text
        author {
            _id
            displayName
        }
        created_on
        updated_on
        private
    }
}`

export default function NoteElement({_id}: {_id: string}) {
    const { loading, error, data } = useQuery<{note: Note}>(
        NoteQuery, {variables: { _id }})
    if (loading) return <Loading />
    if (error) return <Error error={error} />    
    assert(data)
    const note = data.note
    return <div>
        <h1>{ note.title }</h1>
        <p>{ note.text }</p>
    </div>
}