import Quill, { Delta } from 'quill-next'
import QuillEditor, { useQuill } from 'quill-next-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const config = {
    theme: "next"
}

const content = new Delta()
    .insert("Hello world ")
    .insert({ formula: "e^{i\\pi} + 1 = 0" } )

    /*
// Definisci il FormulaBlot
class FormulaBlot extends Quill.import('blots/inline') {
    static blotName = 'formula';
    static tagName = 'span';
    static className = 'formula-katex';
  
    static create(value: string) {
      const node = super.create();
      node.setAttribute('data-latex', value);
      node.setAttribute('contenteditable', 'false');
      console.log("Valore LaTeX ricevuto:", value); // Aggiungi questo log
      const html = katex.renderToString(value, { throwOnError: false });
      console.log("HTML generato:", html); // Aggiungi questo log
      node.innerHTML = "<b>pip</b>po"
      return node;
    }

    static formats(node: HTMLElement) {
        return node.getAttribute('data-latex') || '';
    }
  
    static value(node: HTMLElement) {
      return node.getAttribute('data-latex') || '';
    }
  }
  
// Registra il blot
Quill.register(FormulaBlot, true);
*/

export default function MyQuill() {
    return <>
        <QuillEditor       
            config={config}
            defaultValue={content}
        />
    </>
}

