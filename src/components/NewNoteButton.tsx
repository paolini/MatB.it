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
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center font-bold shadow transition"
                style={{ width: "40px", height: "40px", fontSize: "2rem", padding: 0 }}
                disabled={false}
                onClick={() => router.push('/note/__new__')}
                aria-label="Nuova nota"
            >
                {"+"}
            </button>
        </div>
    )
}

NewNoteButton.displayName = 'NewNoteButton'
export default NewNoteButton
