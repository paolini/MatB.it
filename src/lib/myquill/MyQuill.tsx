"use client"

import { Delta, QuillEditor, Quill } from './myquill.js'
import 'katex/dist/katex.min.css';
import './delta-variants.css';
import { useRef, useEffect, useState } from 'react';
import CreateNoteModal from '@/components/NoteReferenceModal';

const config = {
    theme: "snow",
    modules: {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['code-block'],
            ['formula'],
            ['note-ref'], // Ripristinato al nome corretto
            [{ 'environment': ['theorem', 
                'lemma', 'proof', 'remark', 
                'exercise', 'test'  ] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean'],
        ],
        formulaEditor: true,
    },
}

const readonlyConfig = {
}

export default function MyQuill({
    readOnly, 
    content, 
    onSave, 
    onCancel, 
    onDelete,
    isSaving,
    saveError,
    deleteError
}: {
    readOnly?: boolean
    content?: Delta
    onSave?: (delta: Delta) => void
    onCancel?: () => void
    onDelete?: () => void
    isSaving?: boolean
    saveError?: Error
    deleteError?: Error
}) {
    const quillInstance = useRef<InstanceType<typeof Quill> | null>(null)
    const [showDelta, setShowDelta] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Cleanup dell'editor delle formule al dismount
    useEffect(() => {
        // Carica KaTeX se non è già disponibile
        const loadKaTeX = async () => {
            if (typeof window !== 'undefined' && !window.katex) {
                try {
                    const katex = await import('katex');
                    (window as any).katex = katex.default;
                } catch (error) {
                    console.error('Failed to load KaTeX:', error);
                }
            }
        };
        
        loadKaTeX();
        
        return () => {
            const formulaEditor = document.getElementById('matbit-formula-editor');
            if (formulaEditor) {
                formulaEditor.remove();
            }
        };
    }, []);

    const handleNoteCreated = (noteId: string) => {
        if (quillInstance.current) {
            const range = quillInstance.current.getSelection();
            if (range) {
                quillInstance.current.insertEmbed(range.index, 'note-ref', { note_id: noteId });
                quillInstance.current.setSelection(range.index + 1);
            }
        }
    };

    return <div>
        <QuillEditor
            readOnly={readOnly}
            config={readOnly ? readonlyConfig : config}
            defaultValue={content || new Delta()}
            onReady={quill => { 
                quillInstance.current = quill 
                
                // Aggiungi handler per il pulsante note-ref
                if (!readOnly) {
                    const toolbar = quill.getModule('toolbar') as { addHandler: (name: string, handler: () => void) => void };
                    toolbar.addHandler('note-ref', () => {
                        // Apri sempre il modal
                        setShowCreateModal(true);
                    });
                }
            }}
        />
        {!readOnly && (
            <div className="mt-2 flex gap-2 items-center flex-wrap">
                {onSave && (
                    <button
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                        onClick={() => {
                            if (quillInstance.current) {
                                const delta = quillInstance.current.getContents()
                                onSave(delta)
                            }
                        }}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Salvando...' : 'Salva'}
                    </button>
                )}
                
                {onCancel && (
                    <button
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors disabled:opacity-50"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        Annulla
                    </button>
                )}
                
                {onDelete && (
                    <button
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isSaving}
                    >
                        Cancella nota
                    </button>
                )}
                
                <button
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => setShowDelta(!showDelta)}
                >
                    {showDelta ? 'Nascondi' : 'Mostra'} Delta
                </button>
                
                {/* Errori */}
                {saveError && (
                    <span className="text-red-500 text-sm">
                        Errore: {saveError.message}
                    </span>
                )}
                {deleteError && (
                    <span className="text-red-500 text-sm">
                        Errore cancellazione: {deleteError.message}
                    </span>
                )}
            </div>
        )}
        {!readOnly && showDelta && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="text-lg font-semibold mb-2">Contenuto Delta:</h3>
                <pre className="bg-white p-3 rounded border overflow-auto text-sm">
                    {JSON.stringify(
                        quillInstance.current?.getContents() || content || new Delta(), 
                        null, 
                        2
                    )}
                </pre>
            </div>
        )}
        
        {/* Modal per inserire riferimento nota */}
        <CreateNoteModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onNoteSelected={handleNoteCreated}
        />
        
        {/* Modal di conferma cancellazione */}
        {showDeleteConfirm && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                <div className="bg-white p-6 rounded shadow-lg flex flex-col items-center">
                    <p className="mb-4">Sei sicuro di voler cancellare questa nota?</p>
                    <div className="flex gap-2">
                        <button 
                            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400" 
                            onClick={() => setShowDeleteConfirm(false)}
                        >
                            Annulla
                        </button>
                        <button 
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600" 
                            onClick={() => {
                                setShowDeleteConfirm(false)
                                onDelete?.()
                            }}
                        >
                            Conferma cancellazione
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
}

