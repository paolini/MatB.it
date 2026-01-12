import { TextBlot, EmbedBlot } from 'parchment';
import MyQuill from 'quill-next';

export { Delta } from 'quill-next'

const GUARD_TEXT = '\uFEFF';

// classe base, copiata dal codice sorgente di quill-next
export class Embed extends EmbedBlot {
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
    mutations.forEach(mutation => {
      if (mutation.type === 'characterData' && (mutation.target === this.leftGuard || mutation.target === this.rightGuard)) {
        const range = this.restore(mutation.target);
        if (range) context.range = range;
      }
    });
  }
}

// classe modificata, basata sul codice sorgente di quill-next
export class MyFormula extends Embed {
  static blotName = 'formula'; // importante: deve mantenere lo stesso nome
  static tagName = 'SPAN';     // o ciò che serve

  static create(data) {
    // data può essere una stringa (legacy) o un oggetto { value, displaystyle }
    const node = super.create();
    if (typeof data === 'string') {
      node.setAttribute('data-value', data);
    } else if (data && typeof data === 'object') {
      node.setAttribute('data-value', data.value);
      if (data.displaystyle) {
        node.classList.add('tex-displaystyle');
      }
    }
    this.render(node);
    return node;
  }

  static render(node) {
    const value = node.getAttribute('data-value');
    const displaystyle = node.classList.contains('tex-displaystyle');


    // Verifica che KaTeX sia disponibile
    if (typeof window !== 'undefined' && window.katex && window.katex.render) {
      try {
        window.katex.render(value, node, {
          throwOnError: false,
          errorColor: '#f00',
          displayMode: displaystyle,
        });
      } catch (error) {
        console.error('Error rendering formula:', error);
        node.textContent = `[Formula: ${value}]`;
      }
    } else {
      // Fallback se KaTeX non è disponibile
      node.textContent = `[Formula: ${value}]`;
      console.warn('KaTeX not available, using fallback rendering');
    }
  }

  format(name, value) {
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
    return {
      value: domNode.getAttribute('data-value'),
      displaystyle: domNode.classList.contains('tex-displaystyle')
    };
  }

  update(mutations, context) {
    super.update(mutations, context);

    MyFormula.render(this.domNode);
  }

  html() {
    const { value, displaystyle } = this.constructor.value(this.domNode);
    const ds = displaystyle ? ' data-displaystyle="true"' : '';
    return `<span class="ql-formula"${ds} data-value="${value}">${value}</span>`;
  }
}

export class FormulaEditorModule {
  constructor(quill) {
    this.quill = quill;
    this.currentBlot = null;
    this.editorCleanup = null; // Store cleanup function for current editor session
    this.quill.root.addEventListener('click', this.handleClick.bind(this));

    // Shortcut: apri editor formula quando viene inserito il carattere $ (input event, non keydown)
    this.quill.root.addEventListener('input', (_e) => {
      const selection = this.quill.getSelection();
      if (!selection || selection.length !== 0) return;
      const index = selection.index;
      // Controlla il carattere appena inserito
      const text = this.quill.getText(Math.max(0, index - 1), 1);
      if (text === '$') {
        // Rimuovi il carattere $ appena inserito
        this.quill.deleteText(index - 1, 1, 'user');
        // Inserisci formula
        this.quill.insertEmbed(index - 1, 'formula', '', 'user');
        // Posiziona il cursore dopo la formula appena inserita
        this.quill.setSelection(index, 0, 'silent');
        const [blot] = this.quill.getLeaf(index);
        this.showFormulaEditor(blot);
      }
    });

    // Cerca il pulsante formula nella toolbar
    const toolbar = quill.getModule('toolbar');
    if (toolbar) {
      const formulaButton = toolbar.container.querySelector('.ql-formula');
      let lastRange = null;
      if (formulaButton) {
        formulaButton.addEventListener('mousedown', (_e) => {
          lastRange = this.quill.getSelection();
        });
        formulaButton.addEventListener('click', () => {
          const range = lastRange || this.quill.getSelection();
          lastRange = null;
          if (range) {
            this.quill.insertEmbed(range.index, 'formula', '', 'user');
            // Posiziona il cursore dopo la formula
            this.quill.setSelection(range.index + 1, 0, 'silent');
            const [blot] = this.quill.getLeaf(range.index +1);
            this.showFormulaEditor(blot);
          }
        });
      }
    }
  }  

  handleClick(event) {
    const formulaEl = event.target.closest('.ql-formula');
    if (formulaEl) {
      const blot = MyQuill.find(formulaEl);
      this.showFormulaEditor(blot);
    }
  }

  cleanupCurrentEditor() {
    // Clean up previous editor session before opening a new one
    if (this.editorCleanup) {
      this.editorCleanup();
      this.editorCleanup = null;
    }
    this.currentBlot = null;
  }

  showFormulaEditor(blot) {
    // Clean up any existing editor session first
    this.cleanupCurrentEditor();
    
    this.currentBlot = blot;
    
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
        <label style="margin-left:8px;">
          <input type="checkbox" id="matbit-formula-display" style="vertical-align:middle;"> Display mode
        </label>
        <button id="matbit-formula-save" style="margin-left:8px;">Salva</button>
      `;
      document.body.appendChild(editor);
    }
  
    const input = editor.querySelector('#matbit-formula-input');
    const button = editor.querySelector('#matbit-formula-save');
    const displayCheckbox = editor.querySelector('#matbit-formula-display');

    const positionEditor = () => {
      // Use currentBlot to always reference the correct blot
      if (!this.currentBlot || !this.currentBlot.domNode) return;
      const rect = this.currentBlot.domNode.getBoundingClientRect();
      editor.style.top = `${window.scrollY + rect.bottom}px`;
      editor.style.left = `${window.scrollX + rect.left}px`;
    };

    positionEditor();
    editor.style.display = 'block';

    // Set initial values
    input.value = blot.domNode.getAttribute('data-value') || '';
    displayCheckbox.checked = blot.domNode.classList.contains('tex-displaystyle');

    // Focus automatico sull'input formula dopo apertura
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);

    const quill = this.quill;

    const update = () => {
      if (!this.currentBlot) return;
      
      // indice della posizione di inizio del blot
      const index = quill.getIndex(this.currentBlot);
      const formulaValue = input.value;
      const displaystyle = displayCheckbox.checked;
      
      if (displaystyle) {
        quill.updateContents([
          { retain: index },
          { delete: 1 },
          { insert: { formula: formulaValue }, attributes: { displaystyle: true } }
        ], 'user');
      } else {
        quill.updateContents([
          { retain: index },
          { delete: 1 },
          { insert: { formula: formulaValue } }
        ], 'user');
      }
      
      // Update currentBlot reference after the update
      this.currentBlot = quill.getLeaf(index + 1)[0];
      positionEditor();
    };

    const closeOnDollar = (e) => {
      if (e.key === '$') {
        e.preventDefault();
        saveHandler();
      }
    };

    const liveUpdate = () => {
      update();
    };

    const saveHandler = () => {
      // Store the blot reference before cleanup
      const finalBlot = this.currentBlot;
      
      editor.style.display = 'none';
      
      // Clean up all listeners
      this.cleanupCurrentEditor();
      
      // Posiziona il cursore dopo la formula
      if (finalBlot) {
        const index = quill.getIndex(finalBlot);
        quill.setSelection(index + 1, 0, 'silent');
      }
      
      // Riporta il focus all'editor Quill
      this.quill.focus();
    };

    // Add event listeners
    input.addEventListener('keydown', closeOnDollar);
    input.addEventListener('input', liveUpdate);
    displayCheckbox.addEventListener('change', liveUpdate);
    window.addEventListener('scroll', positionEditor);
    window.addEventListener('resize', positionEditor);
    button.addEventListener('click', saveHandler);

    // Store cleanup function to remove all listeners when switching formulas
    this.editorCleanup = () => {
      input.removeEventListener('keydown', closeOnDollar);
      input.removeEventListener('input', liveUpdate);
      displayCheckbox.removeEventListener('change', liveUpdate);
      window.removeEventListener('scroll', positionEditor);
      window.removeEventListener('resize', positionEditor);
      button.removeEventListener('click', saveHandler);
    };
  }
    
}

