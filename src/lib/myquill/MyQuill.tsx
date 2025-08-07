"use client"

import { QuillEditor, Quill, Range } from './myquill.js'
import Delta from 'quill-delta-es'
import 'katex/dist/katex.min.css';
import './delta-variants.css';
import { useRef, useEffect, useState } from 'react';
import CreateNoteModal from '@/components/NoteReferenceModal';
import { Error as ErrorElement, ErrorType, BUTTON_CLASS, CANCEL_BUTTON_CLASS, DELETE_BUTTON_CLASS, SAVE_BUTTON_CLASS } from '@/components/utils'

const config = {
    theme: "snow",
    modules: {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['code-block'],
            ['formula'],
            ['note-ref'],
            [{ 'environment': ['theorem', 'lemma', 'proof', 'remark', 'exercise', 'test' ] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'choice' }],
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
    saveError?: ErrorType
    deleteError?: ErrorType
}) {
    const quillInstance = useRef<InstanceType<typeof Quill> | null>(null)
    const savedRange = useRef<Range | null>(null) // Salva il range prima di aprire il modal
    const [showDelta, setShowDelta] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [prefilledVariant, setPrefilledVariant] = useState<string>('default')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Cleanup dell'editor delle formule al dismount
    useEffect(() => {
        // Carica KaTeX se non è già disponibile
        const loadKaTeX = async () => {
            if (typeof window !== 'undefined' && !window.katex) {
                try {
                    const katex = await import('katex');
                    (window as unknown as { katex: any }).katex = katex.default;
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
            // Usa il range salvato, altrimenti prova a ottenere quello corrente, altrimenti usa la fine del testo
            let range = savedRange.current || quillInstance.current.getSelection();
            
            if (!range) {
                // Se non c'è nessun range, inserisci alla fine del testo
                const length = quillInstance.current.getLength();
                range = { index: length - 1, length: 0 };
            }
            
            quillInstance.current.insertEmbed(range.index, 'note-ref', { note_id: noteId });
            quillInstance.current.setSelection(range.index + 1);
            
            // Pulisci il range salvato
            savedRange.current = null;
            
            // Chiudi il modal dopo aver inserito la note-ref
            setShowCreateModal(false);
        }
    };

    return <div>
        <QuillEditor
            readOnly={readOnly}
            config={readOnly ? readonlyConfig : config}
            defaultValue={content || new Delta()}
            onReady={onReady}
        />
        {!readOnly && (
            <div className="mt-2 p-2 flex gap-2 items-center flex-wrap">
                { onSave && 
                    <button
                        className={SAVE_BUTTON_CLASS}
                        onClick={() => {
                            if (quillInstance.current) {
                                const delta = quillInstance.current.getContents()
                                onSave(delta)
                            }
                        }}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Salva...' : 'Salva'}
                    </button>
                }
                
                { onCancel &&
                    <button
                        className={CANCEL_BUTTON_CLASS}
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        Annulla
                    </button>
                }
                
                { onDelete &&
                    <button
                        className={DELETE_BUTTON_CLASS}
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isSaving}
                    >
                        Cancella nota
                    </button>
                }
                
                <button
                    className={BUTTON_CLASS}
                    onClick={() => setShowDelta(!showDelta)}
                >
                    {showDelta ? 'Nascondi' : 'Mostra'} Delta
                </button>
                
                <ErrorElement error={saveError} />
                <ErrorElement error={deleteError} />
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
            initialVariant={prefilledVariant}
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

    function onReady(quill: InstanceType<typeof Quill>) {
        quillInstance.current = quill

        // Matcher per supportare copia/incolla delle formule
        quill.clipboard.addMatcher('span', function(node, delta): Delta {
            if (node instanceof HTMLElement && node.classList.contains('ql-formula')) {
                const value = node.getAttribute('data-value') || node.textContent;
                const displaystyle = node.classList.contains('tex-displaystyle');
                return new Delta([
                    { insert: { formula: value }, attributes: displaystyle ? { displaystyle: true } : {} }
                ]);
            }
            return delta;
        });

        // Aggiungi handler per il pulsante note-ref e MC
        if (!readOnly) {
            const toolbar = quill.getModule('toolbar') as any;
            toolbar.addHandler('note-ref', () => {
                const currentRange = quill.getSelection();
                savedRange.current = currentRange;
                setPrefilledVariant('default');
                setShowCreateModal(true);
            });

            // Handler per il pulsante MC (multiple choice)
            toolbar.addHandler('mc-choice', () => {
                const range = quill.getSelection();
                if (!range) return;
                // Applica il formato list: 'choice' alla selezione corrente
                quill.formatLine(range.index, range.length, { list: 'choice' });
            });
            
            // Aggiungi event listener per la select environment
            setTimeout(() => {
                const toolbarModule: any = quill.getModule('toolbar');
                const selectElement = toolbarModule.container?.querySelector('select.ql-environment') as HTMLSelectElement;
                
                if (selectElement) {
                    
                    // Salva il range PRIMA che la select venga cliccata (quando perde il focus)
                    selectElement.addEventListener('mousedown', () => {
                        const currentRange = quill.getSelection();
                        savedRange.current = currentRange;
                    });
                    
                    selectElement.addEventListener('change', (event) => {
                        const target = event.target as HTMLSelectElement;
                        const value = target.value;
                        
                        if (value) {
                            // Apri il modal con la variant precompilata
                            setPrefilledVariant(value);
                            setShowCreateModal(true);
                            
                            // Reset della select
                            target.value = '';
                        }
                    });
                }
            }, 100); // Piccolo delay per assicurarsi che la toolbar sia renderizzata
        }
    }
}
