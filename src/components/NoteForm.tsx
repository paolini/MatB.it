"use client"
import { useState } from 'react'
import dynamic from "next/dynamic"
import { gql, useMutation, useQuery } from '@apollo/client'
import { useRouter, useSearchParams } from 'next/navigation'

import { Note } from '@/app/graphql/generated'
import { VARIANT_NAMES } from '@/lib/models'
import { ObjectId } from 'bson'

const MyQuill = dynamic(() => import('@/lib/myquill/MyQuill'), { ssr: false });

const UpdateNoteMutation = gql`
mutation UpdateNote($_id: ObjectId!, $title: String, $hide_title: Boolean, $delta: JSON, $private: Boolean, $variant: String, $class_id: ObjectId) {
  updateNote(_id: $_id, title: $title, hide_title: $hide_title, delta: $delta, private: $private, variant: $variant, class_id: $class_id) {
    _id
    title
    hide_title
    delta
    variant
    private
    updated_on
    author { _id name }
    class_id
    class { _id name }
  }
}`
const NewNoteMutation = gql`
mutation NewNote($title: String, $hide_title: Boolean, $delta: JSON, $private: Boolean, $variant: String, $class_id: ObjectId) {
  newNote(title: $title, hide_title: $hide_title, delta: $delta, private: $private, variant: $variant, class_id: $class_id)
}`
const ClassesQuery = gql`
query Classes {
  classes {
    _id
    name
    owner_id
    teachers { _id }
  }
}`

const DeleteNoteMutation = gql`
mutation DeleteNote($_id: ObjectId!) {
  deleteNote(_id: $_id)
}`

export default function NoteForm({ note, isNew }: {
  note: Note,
  isNew?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlClassId = searchParams.get('class_id')
  // State locale
  const [title, setTitle] = useState(note.title)
  const [variant, setVariant] = useState(note.variant || 'default')
  const [isPrivate, setIsPrivate] = useState(note.private || false)
  const [hideTitle, setHideTitle] = useState(note.hide_title || false)
  const [classId, setClassId] = useState(
    note.class_id ? String(note.class_id) : (urlClassId || '')
  )

  // Recupera le classi dove l'utente è owner/teacher
  const { data: classesData, loading: loadingClasses } = useQuery(ClassesQuery)
  const [updateNote, { loading: isUpdating, error: updateError }] = useMutation(UpdateNoteMutation)
  const [createNote, { loading: isCreating, error: createError }] = useMutation(NewNoteMutation)
  const [deleteNote, { loading: isDeleting, error: deleteError }] = useMutation(DeleteNoteMutation)
    
  const handleSaveWithDelta = async (currentDelta: any) => {
    if (isNew) {
      const { data } = await createNote({
        variables: {
          title,
          hide_title: hideTitle,
          delta: currentDelta,
          private: isPrivate,
          variant,
          class_id: classId || null
        }
      })
      if (data?.newNote) router.replace(`/note/${data.newNote}`)
    } else {
      await updateNote({
        variables: {
          _id: note._id,
          title,
          hide_title: hideTitle,
          delta: currentDelta,
          private: isPrivate,
          variant,
          class_id: classId || null
        }
      })
      router.push(`/note/${note._id}`)
    }
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
          { Object.entries(VARIANT_NAMES).map(([key, label]) => (
            <option key={key} value={key}>{label || "nota generica"}</option>
          )) }
        </select>
      </div>

      {/* Selettore classe */}
      <div>
        <select
          className="border rounded px-3 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          value={classId}
          onChange={e => setClassId(e.target.value)}
          disabled={loadingClasses}
        >
          <option value="">Nessuna classe</option>
          {classesData?.classes?.map((c: any) => {
            const authorId = note.author?._id ?? note.author_id;
            const isOwner = c.owner_id == authorId;
            const isTeacher = c.teachers.some((t: any) => String(t._id) === String(authorId));
            return (
              <option key={c._id} value={c._id} disabled={!(isOwner || isTeacher)}>
                {c.name}
                {!(isOwner || isTeacher) ? ' (non abilitato)' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* Options */}
      <div className="flex gap-8">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Nota privata</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hideTitle}
            onChange={e => setHideTitle(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Nascondi titolo</span>
        </label>
      </div>
      <div>
        { isPrivate && classId &&   <span className="text-sm font-medium text-gray-700">questa nota è visibile solo agli insegnanti della classe</span>}
        { isPrivate && !classId &&  <span className="text-sm font-medium text-gray-700">questa nota è visibile solo a te</span>}
        { !isPrivate && classId &&  <span className="text-sm font-medium text-gray-700">questa nota è visibile a tutti gli studenti e insegnanti della classe</span>}
        { !isPrivate && !classId && <span className="text-sm font-medium text-gray-700">questa nota è visibile a tutto il mondo</span>}
      </div>

      {/* Editor */}
      <div>
        <div className="border rounded overflow-hidden">
          <MyQuill
            readOnly={false}
            content={note.delta}
            class_id={classId ? new ObjectId(classId) : undefined}
            onSave={handleSaveWithDelta}
            onCancel={() => router.push(isNew ? '/' : `/note/${note._id}`)}
            onDelete={handleDelete}
            isSaving={isUpdating || isCreating || isDeleting}
            saveError={updateError || createError}
            deleteError={deleteError}
          />
        </div>
      </div>
  </div>
}
