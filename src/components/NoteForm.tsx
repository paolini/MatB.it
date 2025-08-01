"use client"
import { useState, useEffect } from 'react'
import dynamic from "next/dynamic"
import { gql, useMutation } from '@apollo/client'
import { useRouter } from 'next/navigation'

import {Delta} from '@/lib/myquill/myquill.js'

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

interface NoteFormProps {
  // Modalità
  mode?: 'create' | 'edit'
  noteId?: string  // Required se mode = 'edit'
  
  // Valori iniziali
  initialTitle?: string
  initialVariant?: string
  initialPrivate?: boolean
  initialDelta?: Delta
  
  // Comportamento
  titlePlaceholder?: string
  showTitleAs?: 'input' | 'heading'
  titleClassName?: string
  
  // Callbacks per modalità 'create'
  onTitleChange?: (title: string) => void
  onVariantChange?: (variant: string) => void
  onPrivateChange?: (isPrivate: boolean) => void
  onDeltaChange?: (delta: Delta) => void
  onSave?: (title: string, delta: Delta, isPrivate: boolean, variant: string) => void
  onCancel?: () => void
  
  // Callbacks per modalità 'edit'
  onEditComplete?: () => void  // Chiamata dopo salvataggio riuscito
  onEditCancel?: () => void    // Chiamata quando si annulla l'editing
  
  // Permessi
  canDelete?: boolean
  
  // Stato esterno (solo per modalità 'create')
  showActions?: boolean
  isSaving?: boolean
  saveError?: Error
  deleteError?: Error
}

export default function NoteForm({
  mode = 'create',
  noteId,
  initialTitle = '',
  initialVariant = 'default',
  initialPrivate = false,
  initialDelta,
  titlePlaceholder = 'Inserisci il titolo...',
  showTitleAs = 'input',
  titleClassName = '',
  onTitleChange,
  onVariantChange,
  onPrivateChange,
  onDeltaChange,
  onSave,
  onCancel,
  onEditComplete,
  onEditCancel,
  canDelete = false,
  showActions = false,
  isSaving: externalIsSaving = false,
  saveError: externalSaveError,
  deleteError: externalDeleteError
}: NoteFormProps) {
  const router = useRouter()
  
  // State locale
  const [title, setTitle] = useState(initialTitle)
  const [variant, setVariant] = useState(initialVariant)
  const [isPrivate, setIsPrivate] = useState(initialPrivate)
  const [delta, setDelta] = useState<Delta|undefined>(initialDelta || undefined)
  
  // Mutations per modalità 'edit'
  const [updateNote, { loading: isUpdating, error: updateError }] = useMutation(UpdateNoteMutation)
  const [deleteNote, { loading: isDeleting, error: deleteError }] = useMutation(DeleteNoteMutation)
  
  // Stato derivato
  const isSaving = mode === 'edit' ? isUpdating : externalIsSaving
  const saveError = mode === 'edit' ? updateError : externalSaveError
  const finalDeleteError = mode === 'edit' ? deleteError : externalDeleteError

  // Carica KaTeX e inizializza Delta se necessario
  useEffect(() => {
    const loadDependencies = async () => {
      if (typeof window !== 'undefined') {
        try {
          // Carica KaTeX
          if (!window.katex) {
            const katex = await import('katex');
            (window as typeof window & { katex: any }).katex = katex.default;
          }
          
          // Carica Delta e inizializza se necessario
          if (!delta) {
            const { Delta } = await import('@/lib/myquill/myquill.js');
            setDelta(new Delta());
          }
        } catch (error) {
          console.error('Failed to load dependencies:', error);
        }
      }
    };
    loadDependencies();
  }, [delta]);

  // Sincronizza con valori esterni quando cambiano
  useEffect(() => {
    setTitle(initialTitle)
  }, [initialTitle])

  useEffect(() => {
    setVariant(initialVariant)
  }, [initialVariant])

  useEffect(() => {
    setIsPrivate(initialPrivate)
  }, [initialPrivate])

  useEffect(() => {
    if (initialDelta) {
      setDelta(initialDelta)
    }
  }, [initialDelta])

  // Gestori di eventi che chiamano i callback
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    onTitleChange?.(newTitle)
  }

  const handleVariantChange = (newVariant: string) => {
    setVariant(newVariant)
    onVariantChange?.(newVariant)
  }

  const handlePrivateChange = (newPrivate: boolean) => {
    setIsPrivate(newPrivate)
    onPrivateChange?.(newPrivate)
  }

  const handleDeltaChange = (newDelta: Delta) => {
    setDelta(newDelta)
    onDeltaChange?.(newDelta)
  }
  
  const handleSaveWithDelta = async (currentDelta: Delta) => {
    if (mode === 'edit' && noteId) {
      try {
        await updateNote({ 
          variables: { 
            _id: noteId, 
            title, 
            delta: currentDelta, 
            private: isPrivate, 
            variant 
          } 
        })
        onEditComplete?.()
      } catch (error) {
        console.error('Failed to update note:', error)
      }
    } else {
      onSave?.(title, currentDelta, isPrivate, variant)
    }
  }

  const handleCancel = () => {
    if (mode === 'edit') {
      onEditCancel?.()
    } else {
      onCancel?.()
    }
  }

  const handleDelete = async () => {
    if (mode === 'edit' && noteId) {
      try {
        await deleteNote({ variables: { _id: noteId } })
        router.push('/')
      } catch (error) {
        console.error('Failed to delete note:', error)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Titolo */}
      <div>
        {showTitleAs === 'input' ? (
          <input
            type="text"
            className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${titleClassName}`}
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder={titlePlaceholder}
          />
        ) : (
          <input 
            className={`text-2xl font-bold w-full mb-2 ${titleClassName}`} 
            value={title} 
            onChange={e => handleTitleChange(e.target.value)} 
          />
        )}
      </div>

      {/* Variant */}
      <div>
        <select
          className="border rounded px-3 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={variant}
          onChange={e => handleVariantChange(e.target.value)}
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

      {/* Privacy */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => handlePrivateChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Nota privata</span>
        </label>
      </div>

      {/* Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contenuto
        </label>
        <div className="border rounded overflow-hidden">
          <MyQuill
            readOnly={false}
            content={delta}
            onSave={showActions ? handleSaveWithDelta : handleDeltaChange}
            onCancel={showActions ? handleCancel : undefined}
            onDelete={showActions && canDelete ? handleDelete : undefined}
            isSaving={isSaving || isDeleting}
            saveError={saveError}
            deleteError={finalDeleteError}
          />
        </div>
      </div>
    </div>
  )
}
