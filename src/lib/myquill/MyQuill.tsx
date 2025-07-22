"use client"

import { Delta, QuillEditor, Quill } from './myquill.js'
import 'katex/dist/katex.min.css';
import './delta-variants.css';
import { useRef, useEffect, useState } from 'react';

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

export default function MyQuill({readOnly, content, onSave}: {
    readOnly?: boolean
    content?: Delta
    onSave?: (delta: Delta) => void
}) {
    const quillInstance = useRef<InstanceType<typeof Quill> | null>(null)
    const [showDelta, setShowDelta] = useState(false)

    // Cleanup dell'editor delle formule al dismount
    useEffect(() => {
        return () => {
            const formulaEditor = document.getElementById('matbit-formula-editor');
            if (formulaEditor) {
                formulaEditor.remove();
            }
        };
    }, []);

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
                        const noteId = prompt('Inserisci l\'ID della nota da referenziare:');
                        if (noteId) {
                            const range = quill.getSelection();
                            if (range) {
                                quill.insertEmbed(range.index, 'note-ref', { note_id: noteId });
                                quill.setSelection(range.index + 1);
                            }
                        }
                    });
                }
            }}
        />
        {!readOnly && (
            <div className="mt-2 flex gap-2">
                {onSave && (
                    <button
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        onClick={() => {
                            if (quillInstance.current) {
                                const delta = quillInstance.current.getContents()
                                onSave(delta)
                            }
                        }}
                    >
                        Salva
                    </button>
                )}
                <button
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => setShowDelta(!showDelta)}
                >
                    {showDelta ? 'Nascondi' : 'Mostra'} Delta
                </button>
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
    </div>
}

