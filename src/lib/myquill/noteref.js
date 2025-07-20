import { EmbedBlot } from 'parchment';

export class NoteRefBlot extends EmbedBlot {
  static blotName = 'note_id';  // Cambiato da 'note-ref' a 'note_id'
  static tagName = 'SPAN';
  static className = 'ql-note-ref';

  static create(data) {
    const node = super.create();
    // data ora è direttamente l'ID della nota
    const noteId = data;
    
    if (noteId) {
      node.setAttribute('data-note-id', noteId);
      node.setAttribute('contenteditable', 'false');
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
      
      // Inizialmente mostra l'ID mentre carica
      node.textContent = `[Note: ${noteId}]`;
      
      // Carica i dati della nota referenziata
      NoteRefBlot.loadNoteData(node, noteId);
    }
    return node;
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
      console.log('GraphQL response for note:', noteId, result);
      
      if (result.data?.note) {
        const note = result.data.note;
        // Aggiorna il contenuto con il titolo della nota
        node.innerHTML = `
          <span style="font-weight: 500;">${note.title}</span>
          <span style="font-size: 0.8em; color: #666; margin-left: 4px;">by ${note.author.name}</span>
        `;
        node.title = `Note: ${note.title} (ID: ${noteId})`;
      } else {
        // Nota non trovata o non accessibile
        console.log('Note not found or not accessible:', noteId, result.errors);
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

  static value(node) {
    return node.getAttribute('data-note-id');  // Restituisce direttamente l'ID
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
      const noteId = this.domNode.getAttribute('data-note-id');
      console.log('Note reference clicked:', noteId);
      // TODO: Implementare navigazione alla nota
    });
  }
}
