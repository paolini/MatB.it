"use client"
import { ObjectId } from "bson"

import { useRouter } from "next/navigation"
import { gql, useMutation } from "@apollo/client"
import { Error, EDIT_BUTTON_CLASS } from "@/components/utils"

const CREATE_NOTE = gql`
    mutation NewNote {
        newNote
    }
`
export default function () {
    const router = useRouter()
    const [createNote, { loading, error }] = useMutation(CREATE_NOTE, {
        onCompleted: (data: { newNote: ObjectId }) => {
            if (data?.newNote) router.push(`/note/${data.newNote}`)
        },
    })

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <button className={EDIT_BUTTON_CLASS} disabled={loading} onClick={() => createNote()}>
                Nuova Nota
            </button>
            {error && <Error error={error} />}
        </div>
    )
}
