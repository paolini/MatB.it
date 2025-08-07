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
      // Forza la rimozione del contenuto precedente per evitare residui
      while (editor.firstChild) editor.removeChild(editor.firstChild);
      editor.innerHTML = `
        <input type="text" id="matbit-formula-input" style="width: 300px;">
        <label style="margin-left:8px;">
          <input type="checkbox" id="matbit-formula-display" style="vertical-align:middle;"> Display mode
        </label>
        <button id="matbit-formula-save" style="margin-left:8px;">Salva</button>
      `;
      document.body.appendChild(editor);
    } else {
      // Se il widget esiste già, aggiorna il testo del pulsante per sicurezza
      const button = editor.querySelector('#matbit-formula-save');
      if (button) button.textContent = 'Salva';
    }
  
    const input = editor.querySelector('#matbit-formula-input');
    const button = editor.querySelector('#matbit-formula-save');
    const displayCheckbox = editor.querySelector('#matbit-formula-display');

    function positionEditor() {
      const rect = blot.domNode.getBoundingClientRect();
      editor.style.top = `${window.scrollY + rect.bottom}px`;
      editor.style.left = `${window.scrollX + rect.left}px`;
    }

    positionEditor();
    editor.style.display = 'block';

    // Focus automatico sull'input formula dopo apertura/riutilizzo popup
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);

    input.value = blot.domNode.getAttribute('data-value');
    displayCheckbox.checked = blot.domNode.classList.contains('tex-displaystyle');

    // Focus automatico sull'input formula editor
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);

    // Shortcut: chiudi editor formula con $ nell'input
    const closeOnDollar = (e) => {
      if (e.key === '$') {
        e.preventDefault();
        saveHandler(e); // Salva e chiudi
      }
    };
    input.addEventListener('keydown', closeOnDollar);

    const quill = this.quill;

    const update = () => {
      // indice della posizione di inizio del blot
      const index = quill.getIndex(blot);
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
      // restituisce il blot a sinistra dell'indice
      // per questo serve il +1:
      blot = quill.getLeaf(index+1)[0];
      positionEditor(); // riposiziona dopo ogni update
    };

    // Preview live mentre si scrive
    const liveUpdate = () => {
      update();
    };

    input.removeEventListener('input', liveUpdate); // per evitare duplicazioni
    input.addEventListener('input', liveUpdate);
    displayCheckbox.removeEventListener('change', liveUpdate);
    displayCheckbox.addEventListener('change', liveUpdate);

    // Riposiziona anche su scroll e resize
    window.addEventListener('scroll', positionEditor);
    window.addEventListener('resize', positionEditor);

    const saveHandler = () => {
      editor.style.display = 'none';
      input.removeEventListener('keydown', closeOnDollar);
      button.removeEventListener('click', saveHandler);
      input.removeEventListener('input', liveUpdate);
      displayCheckbox.removeEventListener('change', liveUpdate);
      window.removeEventListener('scroll', positionEditor);
      window.removeEventListener('resize', positionEditor);
      
      // Posiziona il cursore dopo la formula
      const index = quill.getIndex(blot);
      quill.setSelection(index + 1, 0, 'silent');
      
      // Riporta il focus all'editor Quill
      this.quill.focus();
    };

    button.removeEventListener('click', saveHandler);
    button.addEventListener('click', saveHandler);
  }
    
}

