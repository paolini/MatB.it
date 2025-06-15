import MyQuill from 'quill-next'

// Prova di BlockBlot per environment LaTeX (theorem, lemma, proof, ...)
// NOTA: BlockBlot va importato da quill-next o parchment, qui simulato come base class generica
const Block = MyQuill.import('blots/block');

export class MyEnvironment extends Block {
  static blotName = 'environment';
  static tagName = 'DIV';
  static className = 'ql-environment';

  static create(value) {
    const node = super.create();
    // value può essere 'theorem', 'lemma', 'proof', ...
    node.setAttribute('data-env', value && value.type ? value.type : (typeof value === 'string' ? value : 'theorem'));
    if (value && value.title) {
      node.setAttribute('data-title', value.title);
    }
    node.classList.add('ql-environment');
    node.classList.add('ql-env-' + node.getAttribute('data-env'));
    return node;
  }

  static formats(domNode) {
    return {
      type: domNode.getAttribute('data-env'),
      title: domNode.getAttribute('data-title') || ''
    };
  }

  format(name, value) {
    if (name === 'environment' && value && value.type) {
      this.domNode.setAttribute('data-env', value.type);
      this.domNode.className = 'ql-environment ql-env-' + value.type;
      if (value.title) {
        this.domNode.setAttribute('data-title', value.title);
      } else {
        this.domNode.removeAttribute('data-title');
      }
    } else {
      super.format && super.format(name, value);
    }
  }

  optimize(context) {
    // Puoi aggiungere logica per unire blocchi adiacenti dello stesso tipo
    super.optimize && super.optimize(context);
  }
}

