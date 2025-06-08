"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { gql, useMutation } from "@apollo/client"
import { Loading, Error } from "@/components/utils"

const CREATE_NOTE = gql`
    mutation NewNote($title: String!, $private: Boolean) {
        newNote(title: $title, private: $private) {
            _id
            title
            private
        }
    }
`

export default function NewNotePage() {
    const [title, setTitle] = useState("")
    const [isPrivate, setIsPrivate] = useState(false)
    const router = useRouter()
    const [createNote, { loading, error }] = useMutation(CREATE_NOTE, {
        onCompleted: (data: { newNote: { _id: string } }) => {
            if (data?.newNote?._id) {
                router.push(`/note/${data.newNote._id}`)
            }
        }
    })

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded shadow">
            <h1 className="text-2xl font-bold mb-4 text-center">Crea una nuova nota</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    className="border rounded px-3 py-2"
                    type="text"
                    placeholder="Titolo della nota"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                />
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={e => setIsPrivate(e.target.checked)}
                    />
                    Privata
                </label>
                <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:opacity-50"
                    disabled={loading}
                >
                    Crea Nota
                </button>
                {loading && <Loading />}
                {error && <Error error={error} />}
            </form>
        </div>
    )

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        await createNote({ variables: { title, private: isPrivate } })
    }

}
