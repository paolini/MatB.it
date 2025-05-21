import MyQuill from 'quill-next'
import MyQuillEditor from 'quill-next-react'
import { TextBlot, EmbedBlot } from 'parchment';

export { Delta } from 'quill-next'

const GUARD_TEXT = '\uFEFF';

class Embed extends EmbedBlot {
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
      MyFormula.render(this.domNode);
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

export const Quill = MyQuill
export const QuillEditor = MyQuillEditor
