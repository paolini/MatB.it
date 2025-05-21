import { Delta, QuillEditor } from '@/lib/myquill'
import 'katex/dist/katex.min.css';

const config = {
    theme: "next"
}

const content = new Delta()
    .insert("Hello world ")
    .insert({ formula: "e^{i\\pi} + 1 = 0" })
    .insert(". Taylor series:\n")
    .insert({ formula: "f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x-a)^n" }, {displaystyle: true})

export default function MyQuill() {
    return <>
        <QuillEditor       
            config={config}
            defaultValue={content}
        />
    </>
}

