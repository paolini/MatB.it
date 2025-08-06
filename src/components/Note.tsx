"use client"
import { gql, useQuery, useMutation } from '@apollo/client'

import { useSearchParams, useRouter } from 'next/navigation';

import { Note, Profile } from '@/app/graphql/generated'
import TestList from '@/components/TestList'
import { Loading, Error, EDIT_BUTTON_CLASS } from '@/components/utils'
import NoteContent from '@/components/NoteContent'
import NoteForm from '@/components/NoteForm'

const NoteQuery = gql`
    query Note($_id: ObjectId!) {
        note(_id: $_id) {
            _id
            title
            delta
            variant
            author {
                _id
                name
            }
            created_on
            updated_on
            private
            tests {
                _id
                note_id
                title
                created_on
                author_id
                open_on
                close_on
            }
        }
        profile {
            _id
        }
    }
`

export default function NoteWrapper({ _id }: { _id: string }) {
    const searchParams = useSearchParams();
    const editMode = searchParams.get('edit') !== null;
    const { loading, error, data } = useQuery<{ note: Note, profile: Profile }>(
        NoteQuery, { variables: { _id } })
    
    if (error) return <Error error={error} />    
    if (loading || !data) return <Loading />

    const note = data?.note
    const profile = data?.profile

    if (editMode) return <NoteEdit note={note} />
    else return <NoteView note={note} profile={profile} />
}

function NoteView({note, profile}: {
    note: Note,
    profile: Profile,
}) {
    return <div>
        <div className={`ql-variant-container ql-var-${note.variant || 'default'}`}>
            <h1>
                {note.title}
            </h1>
            <div className="delta">
                <NoteContent note={note} />
            </div>
            {note.private && <span className="text-sm text-gray-500">Nota privata</span>}
        </div>
        <TestList tests={note.tests} />
        <NoteFooter note={note} />
        {note?.variant === 'test' && (
            <CreateTestButton note={note} />
        )}
        {note?.author?._id === profile?._id  && 
            <a className={EDIT_BUTTON_CLASS} href={`?edit`} style={{ marginLeft: 8 }}>
                Edit
            </a>
        }
    </div>
}

function NoteEdit({note}: {note: Note}) {
    const router = useRouter();
    return <div>
        <NoteForm note={note}/>
        <NoteFooter note={note} />
    </div>
}

function NoteFooter({note}: {
    note: Note,
}) {
    return <div>
        { note.author &&
            <p className="text-gray-500">
                By {note.author.name}.
            </p>
        }
    </div>
}

const NewTestMutation = gql`
    mutation NewTest($note_id: ObjectId!, $title: String) {
        newTest(note_id: $note_id, title: $title)
    }
`

function CreateTestButton({note}: {note: Note}) {
    const note_id = note._id
    const title = note.title || ""
    const [createTest, { loading, error }] = useMutation(NewTestMutation, {
        refetchQueries: ["Note"],
    })

    return <>
        <button
            className="px-4 py-2 bg-green-500 text-white rounded mt-2 hover:bg-green-600 transition-colors"
            onClick={() => createTest({ variables: { note_id, title } })}
            disabled={loading}
            >
                {loading ? 'Creazione...' : 'Crea test'}
        </button>
        {error && <Error error={error} />}
    </>
}
