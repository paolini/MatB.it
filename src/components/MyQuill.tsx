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

const content = new Delta()
    .insert("Hello world ")
    .insert({ formula: "e^{i\\pi} + 1 = 0" })
    .insert(". Taylor series:\n")
    .insert({ formula: "f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x-a)^n" }, {displaystyle: true})

export default function MyQuill() {

    return <>
        <div>
            <QuillEditor       
                config={config}
                defaultValue={content}
                />
        </div>
    </>
}

