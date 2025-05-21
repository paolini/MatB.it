import MyQuill from 'quill-next'
import MyQuillEditor from 'quill-next-react'

export { Delta } from 'quill-next'

const Formula = MyQuill.import('formats/formula');

class MyFormula extends Formula {
  static blotName = 'formula'; // importante: deve mantenere lo stesso nome
  static tagName = 'SPAN';     // o ciò che serve

  static create(value) {
    // @ts-expect-error
    if (window.katex == null) {
      throw new Error('Formula module requires KaTeX.');
    }
    const node = super.create(value);
    if (typeof value === 'string') {
      // @ts-expect-error
      window.katex.render(value, node, {
        throwOnError: false,
        errorColor: '#f00'
      });
      node.setAttribute('data-value', value);
    }
    return node;
  }
  static value(domNode) {
    return domNode.getAttribute('data-value');
  }
  
  html() {
    const {
      formula
    } = this.value();
    return `<span>${formula}</span>`;
  }
}

MyQuill.register('formats/formula', MyFormula, true);

export const Quill = MyQuill
export const QuillEditor = MyQuillEditor
