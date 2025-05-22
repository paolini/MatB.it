import MyQuill from 'quill-next'
import MyQuillEditor from 'quill-next-react'
import { TextBlot, EmbedBlot } from 'parchment';

export { Delta } from 'quill-next'

const GUARD_TEXT = '\uFEFF';

class Embed extends EmbedBlot {
  static blotName = 'formula';
  static tagName = 'span';
  static className = 'ql-formula';

  constructor(scroll, node) {
    super(scroll, node);
    this.contentNode = document.createElement('span');
    this.contentNode.setAttribute('contenteditable', 'false');
    Array.from(this.domNode.childNodes).forEach(childNode => {
      this.contentNode.appendChild(childNode);
    });
    this.leftGuard = document.createTextNode(GUARD_TEXT);
    this.rightGuard = document.createTextNode(GUARD_TEXT);
    this.domNode.appendChild(this.leftGuard);
    this.domNode.appendChild(this.contentNode);
    this.domNode.appendChild(this.rightGuard);
  }
  index(node, offset) {
    if (node === this.leftGuard) return 0;
    if (node === this.rightGuard) return 1;
    return super.index(node, offset);
  }
  restore(node) {
    let range = null;
    let textNode;
    const text = node.data.split(GUARD_TEXT).join('');
    if (node === this.leftGuard) {
      if (this.prev instanceof TextBlot) {
        const prevLength = this.prev.length();
        this.prev.insertAt(prevLength, text);
        range = {
          startNode: this.prev.domNode,
          startOffset: prevLength + text.length
        };
      } else {
        textNode = document.createTextNode(text);
        this.parent.insertBefore(this.scroll.create(textNode), this);
        range = {
          startNode: textNode,
          startOffset: text.length
        };
      }
    } else if (node === this.rightGuard) {
      if (this.next instanceof TextBlot) {
        this.next.insertAt(0, text);
        range = {
          startNode: this.next.domNode,
          startOffset: text.length
        };
      } else {
        textNode = document.createTextNode(text);
        this.parent.insertBefore(this.scroll.create(textNode), this.next);
        range = {
          startNode: textNode,
          startOffset: text.length
        };
      }
    }
    node.data = GUARD_TEXT;
    return range;
  }

  update(mutations, context) {
    console.log('Embed update', mutations, context);
    mutations.forEach(mutation => {
      if (mutation.type === 'characterData' && (mutation.target === this.leftGuard || mutation.target === this.rightGuard)) {
        const range = this.restore(mutation.target);
        if (range) context.range = range;
      }
    });
  }
}

class MyFormula extends Embed {
  static blotName = 'formula'; // importante: deve mantenere lo stesso nome
  static tagName = 'SPAN';     // o ciò che serve

  static create(value) {
    console.log('Formula.create', value);
    // @ts-expect-error
    if (window.katex == null) {
      throw new Error('Formula module requires KaTeX.');
    }
    const node = super.create(value);
    if (typeof value === 'string') {
      // @ts-expect-error
      node.setAttribute('data-value', value);
      this.render(node);
    }
    return node;
  }

  static render(node) {
    const value = node.getAttribute('data-value');
    const displaystyle = node.classList.contains('tex-displaystyle');

    console.log('Formula.render', value, displaystyle);

    window.katex.render(value, node, {
      throwOnError: false,
      errorColor: '#f00',
      displayMode: displaystyle,
    });
  }

  format(name, value) {
    console.log('MyFormula format', name, value);
    if (name === 'displaystyle') {
      if (value) {
        this.domNode.classList.add('tex-displaystyle')
      } else {
        this.domNode.classList.remove('tex-displaystyle')
      }
      this.constructor.render(this.domNode);
    } else {
      super.format(name, value);
    }
  }

  static value(domNode) {
    return domNode.getAttribute('data-value');
  }

  update(mutations, context) {
    console.log('MyFormula update', mutations, context);
    super.update(mutations, context);

    render(this.domNode);
  }

  html() {
    console.log('MyFormula html');
    const {
      formula
    } = this.value();
    return `<span>${formula}</span>`;
  }
}

MyQuill.register('formats/formula', MyFormula, true);

class FormulaEditorModule {
  constructor(quill) {
    this.quill = quill;
    this.quill.root.addEventListener('click', this.handleClick.bind(this));
  }

  handleClick(event) {
    const formulaEl = event.target.closest('.ql-formula');
    console.log('FormulaEditorModule handleClick', formulaEl);;
    if (formulaEl) {
      const blot = MyQuill.find(formulaEl);
      this.showFormulaEditor(blot);
    }
  }

  showFormulaEditor(blot) {
    let editor = document.getElementById('matbit-formula-editor');
  
    // Crea il widget se non esiste
    if (!editor) {
      editor = document.createElement('div');
      editor.id = 'matbit-formula-editor';
      editor.style.position = 'absolute';
      editor.style.display = 'none';
      editor.style.background = 'white';
      editor.style.border = '1px solid #ccc';
      editor.style.padding = '8px';
      editor.style.zIndex = '1000';
      editor.innerHTML = `
        <input type="text" id="matbit-formula-input" style="width: 300px;">
        <button id="matbit-formula-save">Salva</button>
      `;
      document.body.appendChild(editor);
    }
  
    const input = editor.querySelector('#matbit-formula-input');
    const button = editor.querySelector('#matbit-formula-save');
  
    const rect = blot.domNode.getBoundingClientRect();
    editor.style.top = `${window.scrollY + rect.bottom}px`;
    editor.style.left = `${window.scrollX + rect.left}px`;
    editor.style.display = 'block';
  
    input.value = blot.domNode.getAttribute('data-value');
  
    const quill = this.quill;

    const update = () => {
      // indice della posizione di inizio del blot
      const index = quill.getIndex(blot);
      quill.updateContents([
        { retain: index },
        { delete: 1 },
        { insert: { formula: input.value } }
      ], 'user');
      // restituisce il blot a sinistra dell'indice
      // per questo serve il +1:
      blot = quill.getLeaf(index+1)[0];
    };

    // Preview live mentre si scrive
    const liveUpdate = () => {
      update();
    };
  
    input.removeEventListener('input', liveUpdate); // per evitare duplicazioni
    input.addEventListener('input', liveUpdate);
  
    const saveHandler = () => {
      editor.style.display = 'none';
  
      button.removeEventListener('click', saveHandler);
      input.removeEventListener('input', liveUpdate);
    };
  
    button.removeEventListener('click', saveHandler);
    button.addEventListener('click', saveHandler);
  }
    
}

MyQuill.register('modules/formulaEditor', FormulaEditorModule);

export const Quill = MyQuill
export const QuillEditor = MyQuillEditor
