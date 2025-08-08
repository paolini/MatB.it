"use client"
import { ObjectId } from "bson"

import { useRouter } from "next/navigation"
import { gql, useMutation } from "@apollo/client"
import { Error } from "@/components/utils"

const CREATE_NOTE = gql`
    mutation NewNote {
        newNote
    }
`

const NewNoteButton = function () {
    const router = useRouter()
    const [createNote, { loading, error }] = useMutation(CREATE_NOTE, {
        onCompleted: (data: { newNote: ObjectId }) => {
            if (data?.newNote) router.push(`/note/${data.newNote}?edit`)
        },
    })

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center font-bold shadow transition"
                style={{ width: "40px", height: "40px", fontSize: "2rem", padding: 0 }}
                disabled={loading}
                onClick={() => createNote()}
                aria-label="Nuova nota"
            >
                {"+"}
            </button>
            {error && <Error error={error} />}
        </div>
    )
}

NewNoteButton.displayName = 'NewNoteButton'
export default NewNoteButton
