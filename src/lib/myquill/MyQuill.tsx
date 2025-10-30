"use client"

import { QuillEditor, Quill, Range } from './myquill.js'
import Delta from 'quill-delta-es'
import 'katex/dist/katex.min.css';
import './delta-variants.css';
import { useRef, useEffect, useState } from 'react';
import NoteReferenceModal from '@/components/NoteReferenceModal';
import { Error as ErrorElement, ErrorType, BUTTON_CLASS, CANCEL_BUTTON_CLASS, DELETE_BUTTON_CLASS, SAVE_BUTTON_CLASS } from '@/components/utils'
import { ObjectId } from 'bson';

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
    class_id,
    onSave, 
    onCancel, 
    onDelete,
    isSaving,
    saveError,
    deleteError
}: {
    readOnly?: boolean
    content?: Delta
    class_id?: ObjectId
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

    // Cleanup dell'editor delle formule al dismount
    useEffect(() => {
        // Carica KaTeX se non è già disponibile
        const loadKaTeX = async () => {
            if (typeof window !== 'undefined' && !window.katex) {
                try {
                    const katex = await import('katex');
                    (window as unknown as { katex: unknown }).katex = katex.default;
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
        console.log('Inserting note reference for note ID:', noteId);
        
        // Chiudi il modal per primo per ripristinare il focus sull'editor
        setShowCreateModal(false);
        
        // Usa setTimeout per dare tempo al modal di chiudersi e al focus di tornare all'editor
        setTimeout(() => {
            if (quillInstance.current) {
                // Usa il range salvato, altrimenti prova a ottenere quello corrente, altrimenti usa la fine del testo
                let range = savedRange.current || quillInstance.current.getSelection();
                
                if (!range) {
                    // Se non c'è nessun range, inserisci alla fine del testo
                    const length = quillInstance.current.getLength();
                    range = { index: length - 1, length: 0 };
                }
                
                console.log('Inserting embed at range:', range);
                
                // Inserisci il riferimento alla nota
                quillInstance.current.insertEmbed(range.index, 'note-ref', { note_id: noteId });
                
                console.log('Embed inserted, setting selection');
                
                // Sposta il cursore dopo il riferimento inserito
                quillInstance.current.setSelection(range.index + 1);
                
                // Pulisci il range salvato
                savedRange.current = null;
                
                console.log('Selection set, operation completed');
                
                // Ripristina il focus sull'editor
                quillInstance.current.focus();
            }
        }, 10);
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

                <DeleteButton onDelete={onDelete} disabled={isSaving} />
                <button className={BUTTON_CLASS} onClick={() => setShowDelta(!showDelta)}>
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
        <NoteReferenceModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onNoteSelected={handleNoteCreated}
            initialVariant={prefilledVariant}
            class_id={class_id}
        />
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
            const toolbar = quill.getModule('toolbar') as { addHandler: (name: string, handler: () => void) => void };
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
                const toolbarModule: { container?: HTMLElement } = quill.getModule('toolbar') as { container?: HTMLElement };
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

function DeleteButton({onDelete,disabled}:{
    onDelete?: () => void
    disabled?: boolean
}) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    if (!onDelete) return null
    return  <>
        <button
            className={DELETE_BUTTON_CLASS}
            onClick={() => setShowDeleteConfirm(true)}
            disabled={disabled}
            >
            Cancella nota
        </button>
        {/* Modal di conferma cancellazione */}
        {showDeleteConfirm &&
            <ConfirmDelete onDelete={onDelete} close={() => setShowDeleteConfirm(false)} />
        }
    </>
}

function ConfirmDelete({onDelete,close}:{
    onDelete?: () => void
    close?: () => void
}) {
    return <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
        <div className="bg-white p-6 rounded shadow-lg flex flex-col items-center">
            <p className="mb-4">Sei sicuro di voler cancellare questa nota?</p>
            <div className="flex gap-2">
                <button 
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400" 
                    onClick={() => close?.()}
                >
                    Annulla
                </button>
                <button 
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600" 
                    onClick={() => {
                        close?.()
                        onDelete?.()
                    }}
                >
                    Conferma cancellazione
                </button>
            </div>
        </div>
    </div>
}
