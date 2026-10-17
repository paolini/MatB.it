"use client"

import { QuillEditor, Quill, Range } from './myquill.js'
import Delta from 'quill-delta-es'
import 'katex/dist/katex.min.css'
import './delta-variants.css'
import { useRef, useEffect, useState, useCallback, useMemo, MutableRefObject } from 'react'
import { getNoteReferenceRange, noteReferenceToolbarHandlers } from './noteReferenceSelection'
import NoteReferenceModal from '@/components/NoteReferenceModal'
import { Error as ErrorElement, ErrorType, BUTTON_CLASS, CANCEL_BUTTON_CLASS, DELETE_BUTTON_CLASS, SAVE_BUTTON_CLASS } from '@/components/utils'
import { ObjectId } from 'bson'

// ============================================================================
// Types
// ============================================================================

type QuillInstance = InstanceType<typeof Quill>

interface MyQuillProps {
    readOnly?: boolean
    content?: Delta
    class_id?: ObjectId
    onSave?: (delta: Delta) => void
    onCancel?: () => void
    onDelete?: () => void
    isSaving?: boolean
    saveError?: ErrorType
    deleteError?: ErrorType
}

interface EditorToolbarProps {
    quillRef: MutableRefObject<QuillInstance | null>
    onSave?: (delta: Delta) => void
    onCancel?: () => void
    onDelete?: () => void
    isSaving?: boolean
    saveError?: ErrorType
    deleteError?: ErrorType
}

interface DeltaPreviewProps {
    quillRef: MutableRefObject<QuillInstance | null>
    content?: Delta
}

interface DeleteButtonProps {
    onDelete?: () => void
    disabled?: boolean
}

interface ConfirmDeleteProps {
    onDelete: () => void
    onClose: () => void
}

// ============================================================================
// Configuration
// ============================================================================

const EDITOR_CONFIG = {
    theme: "snow",
    modules: {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['code-block'],
            ['formula'],
            ['note-ref'],
            [{ 'environment': ['theorem', 'lemma', 'proof', 'remark', 'exercise', 'test'] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'choice' }],
            ['link', 'image'],
            ['clean'],
        ],
        formulaEditor: true,
    },
} as const

const READONLY_CONFIG = {} as const

// ============================================================================
// Hooks
// ============================================================================

function useKatex() {
    useEffect(() => {
        const loadKaTeX = async () => {
            if (typeof window !== 'undefined' && !window.katex) {
                try {
                    const katex = await import('katex')
                    ;(window as unknown as { katex: unknown }).katex = katex.default
                } catch (error) {
                    console.error('Failed to load KaTeX:', error)
                }
            }
        }

        loadKaTeX()

        return () => {
            const formulaEditor = document.getElementById('matbit-formula-editor')
            formulaEditor?.remove()
        }
    }, [])
}

function useNoteReference(
    quillRef: MutableRefObject<QuillInstance | null>,
    savedRangeRef: MutableRefObject<Range | null>
) {
    const [showModal, setShowModal] = useState(false)
    const [prefilledVariant, setPrefilledVariant] = useState('default')

    const openModal = useCallback((variant: string = 'default') => {
        savedRangeRef.current = getNoteReferenceRange(quillRef.current, savedRangeRef.current)
        setPrefilledVariant(variant)
        setShowModal(true)
    }, [quillRef, savedRangeRef])

    const closeModal = useCallback(() => {
        setShowModal(false)
        if (savedRangeRef.current) {
            const { index, length } = savedRangeRef.current
            quillRef.current?.setSelection(index, length)
        }
        savedRangeRef.current = null
    }, [quillRef, savedRangeRef])

    const insertNoteReference = useCallback((noteId: string) => {
        setShowModal(false)

        setTimeout(() => {
            const quill = quillRef.current
            if (!quill) return

            let range = savedRangeRef.current || quill.getSelection()

            if (!range) {
                const length = quill.getLength()
                range = { index: length - 1, length: 0 }
            }

            quill.insertEmbed(range.index, 'note-ref', { note_id: noteId })
            quill.setSelection(range.index + 1)
            savedRangeRef.current = null
            quill.focus()
        }, 10)
    }, [quillRef, savedRangeRef])

    return {
        showModal,
        prefilledVariant,
        openModal,
        closeModal,
        insertNoteReference,
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

function setupFormulaMatcher(quill: QuillInstance) {
    quill.clipboard.addMatcher('span', function (node, delta): Delta {
        if (node instanceof HTMLElement && node.classList.contains('ql-formula')) {
            const value = node.getAttribute('data-value') || node.textContent
            const displaystyle = node.classList.contains('tex-displaystyle')
            return new Delta([
                { insert: { formula: value }, attributes: displaystyle ? { displaystyle: true } : {} }
            ])
        }
        return delta
    })
}

function setupToolbarHandlers(quill: QuillInstance) {
    const toolbar = quill.getModule('toolbar') as { 
        addHandler: (name: string, handler: () => void) => void 
    }

    // Multiple choice button handler
    toolbar.addHandler('mc-choice', () => {
        const range = quill.getSelection()
        if (range) {
            quill.formatLine(range.index, range.length, { list: 'choice' })
        }
    })
}

// ============================================================================
// Sub-Components
// ============================================================================

function EditorToolbar({
    quillRef,
    onSave,
    onCancel,
    onDelete,
    isSaving,
    saveError,
    deleteError,
}: EditorToolbarProps) {
    const [showDelta, setShowDelta] = useState(false)

    const handleSave = useCallback(() => {
        if (quillRef.current && onSave) {
            const delta = quillRef.current.getContents()
            onSave(delta)
        }
    }, [quillRef, onSave])

    return (
        <>
            <div className="mt-2 p-2 flex gap-2 items-center flex-wrap">
                {onSave && (
                    <button
                        className={SAVE_BUTTON_CLASS}
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Salva...' : 'Salva'}
                    </button>
                )}

                {onCancel && (
                    <button
                        className={CANCEL_BUTTON_CLASS}
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        Annulla
                    </button>
                )}

                <DeleteButton onDelete={onDelete} disabled={isSaving} />
                
                <button 
                    className={BUTTON_CLASS} 
                    onClick={() => setShowDelta(prev => !prev)}
                >
                    {showDelta ? 'Nascondi' : 'Mostra'} Delta
                </button>

                <ErrorElement error={saveError} />
                <ErrorElement error={deleteError} />
            </div>

            {showDelta && <DeltaPreview quillRef={quillRef} />}
        </>
    )
}

function DeltaPreview({ quillRef, content }: DeltaPreviewProps) {
    const deltaContent = quillRef.current?.getContents() || content || new Delta()

    return (
        <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="text-lg font-semibold mb-2">Contenuto Delta:</h3>
            <pre className="bg-white p-3 rounded border overflow-auto text-sm">
                {JSON.stringify(deltaContent, null, 2)}
            </pre>
        </div>
    )
}

function DeleteButton({ onDelete, disabled }: DeleteButtonProps) {
    const [showConfirm, setShowConfirm] = useState(false)

    if (!onDelete) return null

    return (
        <>
            <button
                className={DELETE_BUTTON_CLASS}
                onClick={() => setShowConfirm(true)}
                disabled={disabled}
            >
                Cancella nota
            </button>

            {showConfirm && (
                <ConfirmDeleteModal
                    onDelete={onDelete}
                    onClose={() => setShowConfirm(false)}
                />
            )}
        </>
    )
}

function ConfirmDeleteModal({ onDelete, onClose }: ConfirmDeleteProps) {
    const handleConfirm = useCallback(() => {
        onClose()
        onDelete()
    }, [onDelete, onClose])

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded shadow-lg flex flex-col items-center">
                <p className="mb-4">Sei sicuro di voler cancellare questa nota?</p>
                <div className="flex gap-2">
                    <button
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                        onClick={onClose}
                    >
                        Annulla
                    </button>
                    <button
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        onClick={handleConfirm}
                    >
                        Conferma cancellazione
                    </button>
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// Main Component
// ============================================================================

export default function MyQuill({
    readOnly,
    content,
    class_id,
    onSave,
    onCancel,
    onDelete,
    isSaving,
    saveError,
    deleteError,
}: MyQuillProps) {
    const quillRef = useRef<QuillInstance | null>(null)
    const savedRangeRef = useRef<Range | null>(null)

    useKatex()

    const {
        showModal,
        prefilledVariant,
        openModal,
        closeModal,
        insertNoteReference,
    } = useNoteReference(quillRef, savedRangeRef)

    // Register before Quill builds the toolbar: an unknown environment format
    // otherwise gets no handler (and no focus/selection restoration).
    const editorConfig = useMemo(() => ({
        ...EDITOR_CONFIG,
        modules: {
            ...EDITOR_CONFIG.modules,
            toolbar: {
                container: EDITOR_CONFIG.modules.toolbar,
                handlers: noteReferenceToolbarHandlers(openModal),
            },
        },
    }), [openModal])

    const handleQuillReady = useCallback((quill: QuillInstance) => {
        quillRef.current = quill
        setupFormulaMatcher(quill)

        if (!readOnly) {
            setupToolbarHandlers(quill)
        }
    }, [readOnly])

    return (
        <div>
            <QuillEditor
                readOnly={readOnly}
                config={readOnly ? READONLY_CONFIG : editorConfig}
                defaultValue={content || new Delta()}
                onReady={handleQuillReady}
            />

            {!readOnly && (
                <EditorToolbar
                    quillRef={quillRef}
                    onSave={onSave}
                    onCancel={onCancel}
                    onDelete={onDelete}
                    isSaving={isSaving}
                    saveError={saveError}
                    deleteError={deleteError}
                />
            )}

            <NoteReferenceModal
                isOpen={showModal}
                onClose={closeModal}
                onNoteSelected={insertNoteReference}
                initialVariant={prefilledVariant}
                class_id={class_id}
            />
        </div>
    )
}
