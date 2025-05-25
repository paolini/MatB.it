"use client"

import { Delta, QuillEditor } from '@/lib/myquill'
import 'katex/dist/katex.min.css';

const config = {
    theme: "snow",
    modules: {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['code-block'],
            ['formula'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean'],
        ],
        formulaEditor: true,
    },
}

const readonlyConfig = {
}

const contentExample = new Delta()
    .insert("Hello world ")
    .insert({ formula: "e^{i\\pi} + 1 = 0" })
    .insert(". Taylor series:\n")
    .insert({ formula: "f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x-a)^n" }, {displaystyle: true})

export default function MyQuill({readOnly,content}:{
    readOnly?: boolean
    content?: Delta
}) {
    const delta = readOnly 
     ? (content || new Delta())
     : contentExample
    return <div>
        <QuillEditor
            readOnly={readOnly}
            config={readOnly ? readonlyConfig : config}
            defaultValue={delta}
            />
    </div>
}

