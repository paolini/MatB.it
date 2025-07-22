import { EmbedBlot } from 'parchment';

export class NoteRefBlot extends EmbedBlot {
  static blotName = 'note-ref';  // Ripristinato al nome corretto
  static tagName = 'SPAN';
  static className = 'ql-note-ref';

  static create(data) {
    const node = super.create();
    // data dovrebbe essere nel formato { note_id: string }
    const noteId = typeof data === 'object' && data?.note_id ? data.note_id : data;
    
    if (noteId) {
      node.setAttribute('data-note-id', noteId);
      node.setAttribute('contenteditable', 'false');
      
      // Stili iniziali (saranno modificati se è un environment)
      node.style.cssText = `
        display: inline-block;
        padding: 4px 8px;
        margin: 0 2px;
        background-color: #e3f2fd;
        border: 1px solid #2196f3;
        border-radius: 6px;
        color: #1976d2;
        cursor: pointer;
        font-size: 0.9em;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      
      node.className = 'ql-note-ref';
      
      // Inizialmente mostra l'ID mentre carica
      node.textContent = `[Note: ${noteId}]`;
      
      // Carica i dati della nota referenziata
      NoteRefBlot.loadNoteData(node, noteId);
    }
    return node;
  }

  // Rendering semplice per modalità editor (solo titolo)

  // Fallback semplice per il rendering senza DeltaRenderer
  static renderSimpleFallback(delta) {
    if (!delta || !delta.ops) return '<p>Contenuto non disponibile</p>';
    
    let html = '';
    for (const op of delta.ops) {
      if (op.insert && typeof op.insert === 'string') {
        let text = op.insert.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        text = text.replace(/\n/g, '<br>');
        
        if (op.attributes) {
          if (op.attributes.bold) text = `<strong>${text}</strong>`;
          if (op.attributes.italic) text = `<em>${text}</em>`;
        }
        
        html += text;
      }
    }
    
    return html || '<p>Contenuto vuoto</p>';
  }

  static async loadNoteData(node, noteId) {
    try {
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query Note($_id: ObjectId!) {
              note(_id: $_id) {
                _id
                title
                variant
                author {
                  name
                }
              }
            }
          `,
          variables: { _id: noteId }
        })
      });

      const result = await response.json();
      
      if (result.data?.note) {
        const note = result.data.note;
        
        // In modalità editor, mostra solo titolo e info (no contenuto completo)
        this.renderSimpleReference(node, note);
        node.title = `Note: ${note.title} (ID: ${noteId})`;
      } else {
        // Nota non trovata o non accessibile
        node.textContent = `[Note not found: ${noteId}]`;
        node.style.backgroundColor = '#ffebee';
        node.style.borderColor = '#f44336';
        node.style.color = '#c62828';
      }
    } catch (error) {
      console.error('Error loading note data:', error);
      node.textContent = `[Error loading note: ${noteId}]`;
      node.style.backgroundColor = '#fff3e0';
      node.style.borderColor = '#ff9800';
      node.style.color = '#ef6c00';
    }
  }

  // Rendering semplice per modalità editor (solo titolo)
  static renderSimpleReference(node, note) {
    // Rimuovi gli stili inline precedenti
    node.style.cssText = '';
    
    // Usa "default" come fallback se non c'è variant
    const variant = note.variant || 'default';
    
    // Applica stili inline per il riferimento semplice
    node.style.cssText = `
      display: inline-block;
      padding: 4px 8px;
      margin: 0 2px;
      background-color: ${this.getVariantColor(variant)};
      border: 2px solid ${this.getVariantBorderColor(variant)};
      border-radius: 6px;
      color: ${this.getVariantTextColor(variant)};
      cursor: pointer;
      font-size: 0.9em;
      font-weight: bold;
    `;
    
    node.className = 'ql-note-ref';
    node.textContent = note.title;
  }

  // Helper per colori delle varianti
  static getVariantColor(variant) {
    const colors = {
      theorem: '#f7f3d1',
      lemma: '#e1f3fa', 
      proof: '#e8e8e8',
      remark: '#f3e1fa',
      exercise: '#e1fae6',
      test: '#fae1e1',
      default: '#f5f5f5'
    };
    return colors[variant] || colors.default;
  }

  static getVariantBorderColor(variant) {
    const colors = {
      theorem: '#e6c200',
      lemma: '#1ca3c7',
      proof: '#888',
      remark: '#a31cc7', 
      exercise: '#1cc76a',
      test: '#c71c1c',
      default: '#666'
    };
    return colors[variant] || colors.default;
  }

  static getVariantTextColor(variant) {
    const colors = {
      theorem: '#b59a00',
      lemma: '#1ca3c7',
      proof: '#888',
      remark: '#a31cc7',
      exercise: '#1cc76a', 
      test: '#c71c1c',
      default: '#666'
    };
    return colors[variant] || colors.default;
  }

  static value(node) {
    const noteId = node.getAttribute('data-note-id');
    // Restituisce nel formato corretto per il Delta
    return noteId ? { "note-ref": { note_id: noteId } } : null;
  }

  value() {
    return NoteRefBlot.value(this.domNode);
  }

  // Gestisce i click sui note references
  constructor(scroll, node) {
    super(scroll, node);
    
    this.domNode.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // TODO: Implementare navigazione alla nota
    });
  }
}
