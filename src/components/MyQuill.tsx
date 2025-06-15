"use client"

import { Delta, QuillEditor, Quill } from '@/lib/myquill'
import 'katex/dist/katex.min.css';
import { useRef, useEffect } from 'react';

const config = {
    theme: "snow",
    modules: {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['code-block'],
            ['formula'],
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
            onReady={quill => { quillInstance.current = quill }}
        />
        {!readOnly && onSave && (
            <button
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
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
    </div>
}

