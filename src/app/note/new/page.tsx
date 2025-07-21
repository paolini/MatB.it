"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { gql, useMutation } from "@apollo/client"
import { Loading, Error } from "@/components/utils"

const CREATE_NOTE = gql`
    mutation NewNote($title: String!, $private: Boolean, $variant: String) {
        newNote(title: $title, private: $private, variant: $variant) {
            _id
            title
            private
            variant
        }
    }
`

export default function NewNotePage() {
    const [title, setTitle] = useState("")
    const [isPrivate, setIsPrivate] = useState(false)
    const [variant, setVariant] = useState("default")
    const [isRedirecting, setIsRedirecting] = useState(false)
    const router = useRouter()
    const [createNote, { loading, error }] = useMutation(CREATE_NOTE, {
        onCompleted: (data: { newNote: { _id: string } }) => {
            if (data?.newNote?._id) {
                setIsRedirecting(true)
                router.push(`/note/${data.newNote._id}`)
            }
        },
        onError: () => {
            setIsRedirecting(false)
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
                    disabled={loading || isRedirecting}
                    required
                />
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Tipo di nota:</label>
                    <select
                        className="border rounded px-3 py-2"
                        value={variant}
                        onChange={e => setVariant(e.target.value)}
                        disabled={loading || isRedirecting}
                    >
                        <option value="default">Default</option>
                        <option value="theorem">Theorem</option>
                        <option value="lemma">Lemma</option>
                        <option value="proof">Proof</option>
                        <option value="remark">Remark</option>
                        <option value="exercise">Exercise</option>
                        <option value="test">Test</option>
                    </select>
                </div>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={e => setIsPrivate(e.target.checked)}
                        disabled={loading || isRedirecting}
                    />
                    Privata
                </label>
                <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:opacity-50"
                    disabled={loading || isRedirecting}
                >
                    {isRedirecting ? "Apertura nota..." : loading ? "Creazione..." : "Crea Nota"}
                </button>
                {(loading || isRedirecting) && <Loading />}
                {error && <Error error={error} />}
            </form>
        </div>
    )

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        await createNote({ variables: { title, private: isPrivate, variant } })
    }

}
