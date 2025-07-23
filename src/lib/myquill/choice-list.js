import ListItem from 'quill-next/dist/formats/list.js';

// Blot per lista "choice" (multiple choice)
class ChoiceListItem extends ListItem {
  static formats(domNode) {
    // Riconosciamo il tipo "choice" e manteniamo gli altri attributi
    let format = super.formats(domNode);
    if (typeof format === 'string') {
      format = { list: format };
    } else if (!format) {
      format = {};
    }
    if (domNode.getAttribute('data-list') === 'choice') {
      format.list = 'choice';
      if (domNode.hasAttribute('data-choice-id')) {
        format['choice-id'] = domNode.getAttribute('data-choice-id');
      }
      if (domNode.hasAttribute('data-score')) {
        format['score'] = Number(domNode.getAttribute('data-score'));
      }
      if (domNode.hasAttribute('data-explanation')) {
        format['explanation'] = domNode.getAttribute('data-explanation');
      }
      if (domNode.hasAttribute('data-shuffle')) {
        format['shuffle'] = domNode.getAttribute('data-shuffle') === 'true';
      }
    }
    return format;
  }

  format(name, value) {
    if (name === 'list' && value === 'choice') {
      this.domNode.setAttribute('data-list', 'choice');
    } else if (name === 'choice-id') {
      this.domNode.setAttribute('data-choice-id', value);
    } else if (name === 'score') {
      this.domNode.setAttribute('data-score', value);
    } else if (name === 'explanation') {
      this.domNode.setAttribute('data-explanation', value);
    } else if (name === 'shuffle') {
      this.domNode.setAttribute('data-shuffle', value ? 'true' : 'false');
    } else {
      super.format(name, value);
    }
  }

  static create(value) {
    const node = super.create(value);
    if (value === 'choice' || (value && value.list === 'choice')) {
      node.setAttribute('data-list', 'choice');
      if (value['choice-id']) node.setAttribute('data-choice-id', value['choice-id']);
      if (value['score'] !== undefined) node.setAttribute('data-score', value['score']);
      if (value['explanation']) node.setAttribute('data-explanation', value['explanation']);
      if (value['shuffle'] !== undefined) node.setAttribute('data-shuffle', value['shuffle'] ? 'true' : 'false');
    }
    return node;
  }

  // Nessuna label dinamica: la label viene gestita solo via CSS
}

ChoiceListItem.blotName = 'list';
ChoiceListItem.tagName = 'LI';

export { ChoiceListItem };
