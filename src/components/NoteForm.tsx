"use client"
import { useState } from 'react'
import dynamic from "next/dynamic"
import { gql, useMutation } from '@apollo/client'
import { useRouter } from 'next/navigation'

import { Note } from '@/app/graphql/generated'

const MyQuill = dynamic(() => import('@/lib/myquill/MyQuill'), { ssr: false });

const UpdateNoteMutation = gql`
mutation UpdateNote($_id: ObjectId!, $title: String, $delta: JSON, $private: Boolean, $variant: String) {
  updateNote(_id: $_id, title: $title, delta: $delta, private: $private, variant: $variant) {
    _id
    title
    delta
    variant
    private
    updated_on
    author { _id name }
  }
}`

const DeleteNoteMutation = gql`
mutation DeleteNote($_id: ObjectId!) {
  deleteNote(_id: $_id)
}`

export default function NoteForm({ note }: {
  note: Note,
}) {
  const router = useRouter()
  
  // State locale
  const [title, setTitle] = useState(note.title)
  const [variant, setVariant] = useState(note.variant || 'default')
  const [isPrivate, setIsPrivate] = useState(note.private || false)

  const [updateNote, { loading: isUpdating, error: updateError }] = useMutation(UpdateNoteMutation)
  const [deleteNote, { loading: isDeleting, error: deleteError }] = useMutation(DeleteNoteMutation)
    
  const handleSaveWithDelta = async (currentDelta: object) => {
    await updateNote({ 
      variables: { 
        _id: note._id, 
        title, 
        delta: currentDelta, 
        private: isPrivate, 
        variant 
      } 
    })
  }

  const handleDelete = async () => {
    await deleteNote({ variables: { _id: note._id } })
    router.push('/')
  }

  return <div className="space-y-4">
      <div>
          <input
            type="text"
            className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-bold w-full mb-2`}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titolo della nota"
          />
      </div>

      <div>
        <select
          className="border rounded px-3 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={variant}
          onChange={e => setVariant(e.target.value)}
        >
          <option value="default">Nota</option>
          <option value="theorem">Teorema</option>
          <option value="lemma">Lemma</option>
          <option value="proof">Dimostrazione</option>
          <option value="remark">Osservazione</option>
          <option value="exercise">Esercizio</option>
          <option value="test">Test</option>
        </select>
      </div>

      {/* Privacy */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Nota privata</span>
        </label>
      </div>

      {/* Editor */}
      <div>
        <div className="border rounded overflow-hidden">
          <MyQuill
            readOnly={false}
            content={note.delta}
            onSave={handleSaveWithDelta}
            onCancel={() => router.push(`/note/${note._id}`)}
            onDelete={handleDelete}
            isSaving={isUpdating || isDeleting}
            saveError={updateError}
            deleteError={deleteError}
          />
        </div>
      </div>
  </div>
}
