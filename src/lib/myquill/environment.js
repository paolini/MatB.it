import MyQuill from 'quill-next'

// Prova di BlockBlot per environment LaTeX (theorem, lemma, proof, ...)
// NOTA: BlockBlot va importato da quill-next o parchment, qui simulato come base class generica
const Block = MyQuill.import('blots/block');
const Container = MyQuill.import('blots/container');
const Parchment = MyQuill.import('parchment');

// Blot per la singola riga di environment
class MyEnvironmentLine extends Block {
  static blotName = 'environment';
  static tagName = 'DIV';
  static className = 'ql-environment';
  static parent = 'environment-container';

  static create(value) {
    const node = super.create();
    node.setAttribute('data-env', value && value.type ? value.type : (typeof value === 'string' ? value : 'theorem'));
    if (value && value.title) {
      node.setAttribute('data-title', value.title);
    }
    node.classList.add('ql-environment');
    node.classList.add('ql-env-' + node.getAttribute('data-env'));
    return node;
  }

  static value(domNode) {
    return domNode.getAttribute('data-env') || 'theorem';
  }
  static formats(domNode) {
    return this.value(domNode);
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
}

// Blot contenitore per le righe di environment
class MyEnvironmentContainer extends Container {
  static blotName = 'environment-container';
  static tagName = 'DIV';
  static className = 'ql-environment-container';
  static allowedChildren = [MyEnvironmentLine];
  static scope = Parchment.Scope.BLOCK_BLOT;

  static value(domNode) {
    const firstLine = domNode.querySelector('.ql-environment[data-env]');
    if (firstLine) {
      return firstLine.getAttribute('data-env') || 'theorem';
    } else {
      return 'theorem';
    }
  }
  static formats(domNode) {
    return this.value(domNode);
  }

  optimize(context) {
    // Aggiorna la classe del container in base al tipo di environment della prima riga
    let desiredClass = this.statics.className;
    const firstLine = this.domNode.querySelector('.ql-environment[data-env]');
    if (firstLine) {
      const envType = firstLine.getAttribute('data-env');
      if (envType) {
        desiredClass += ' ql-env-' + envType;
      }
    }
    if (this.domNode.className !== desiredClass) {
      this.domNode.className = desiredClass;
    }
    if (super.optimize) super.optimize(context);
  }

  checkMerge() {
    if (!this.next || this.next.statics.blotName !== this.statics.blotName) return false;
    // Confronta il tipo di environment della prima riga figlia di ciascun container
    const getEnvType = (container) => {
      const firstLine = container.domNode.querySelector('.ql-environment[data-env]');
      return firstLine ? firstLine.getAttribute('data-env') : 'theorem';
    };
    const myType = getEnvType(this);
    const nextType = getEnvType(this.next);
    return myType === nextType;
  }
}

// Imposta requiredContainer dopo la dichiarazione delle classi
MyEnvironmentLine.requiredContainer = MyEnvironmentContainer;

// Registrazione delle blot (solo queste, rimuovi la vecchia MyEnvironment)
MyQuill.register('formats/environment', MyEnvironmentLine, true);
MyQuill.register('formats/environment-container', MyEnvironmentContainer, true);

// Non esportare più MyEnvironment, esporta solo le nuove classi se servono
export { MyEnvironmentLine, MyEnvironmentContainer };

