import { EmbedBlot } from 'parchment';

export class NoteRefBlot extends EmbedBlot {
  static blotName = 'note-ref';  // Ripristinato al nome corretto
  static tagName = 'SPAN';
  static className = 'ql-note-ref';

  static create(data) {
    const node = super.create();
    // data dovrebbe essere nel formato { note_id: string, title?: string }
    const noteId = typeof data === 'object' && data?.note_id ? data.note_id : data;
    const customTitle = typeof data === 'object' && data?.title ? data.title : null;
    
    if (noteId) {
      node.setAttribute('data-note-id', noteId);
      if (customTitle) {
        node.setAttribute('data-custom-title', customTitle);
      }
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
    
    // Controlla se c'è un titolo custom
    const customTitle = node.getAttribute('data-custom-title');
    const displayTitle = customTitle || note.title;
    
    // Applica stili inline per il riferimento semplice
    node.style.cssText = `
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      margin: 0 2px;
      background-color: ${this.getVariantColor(variant)};
      border: 2px solid ${this.getVariantBorderColor(variant)};
      border-radius: 6px;
      color: ${this.getVariantTextColor(variant)};
      cursor: pointer;
      font-size: 1em;
      font-weight: bold;
      gap: 4px;
    `;
    
    node.className = 'ql-note-ref';
    
    // Pulisci il contenuto precedente
    node.innerHTML = '';
    
    // Crea il contenitore per il titolo
    const titleSpan = document.createElement('span');
    titleSpan.textContent = displayTitle;
    titleSpan.style.cssText = `
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    
    // Aggiungi una classe per indicare se è un titolo custom
    if (customTitle) {
      titleSpan.style.fontStyle = 'italic';
      titleSpan.title = `Titolo personalizzato: "${customTitle}" (originale: "${note.title}")`;
    }
    
    // Crea il pulsante configurazione
    const configButton = document.createElement('button');
    configButton.innerHTML = '⚙';
    configButton.title = 'Configura inserimento';
    configButton.style.cssText = `
      border: none;
      background: none;
      color: inherit;
      cursor: pointer;
      font-size: 1.1em;
      padding: 0;
      margin: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 2px;
      opacity: 0.7;
    `;
    configButton.addEventListener('mouseover', () => {
      configButton.style.opacity = '1';
      configButton.style.backgroundColor = 'rgba(0,0,0,0.1)';
    });
    configButton.addEventListener('mouseout', () => {
      configButton.style.opacity = '0.7';
      configButton.style.backgroundColor = 'transparent';
    });
    configButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showConfigMenu(node, note);
    });
    
    // Assembla il badge
    node.appendChild(titleSpan);
    node.appendChild(configButton);
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

  // Mostra pannello di configurazione per il riferimento
  static showConfigMenu(node, note) {
    // Crea un pannello di configurazione
    const panel = document.createElement('div');
    panel.className = 'note-ref-config-panel';
    panel.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 1000;
      padding: 16px;
      min-width: 300px;
      max-width: 400px;
    `;
    
    const rect = node.getBoundingClientRect();
    panel.style.top = `${window.scrollY + rect.bottom + 8}px`;
    panel.style.left = `${window.scrollX + rect.left}px`;
    
    // Stato del pannello - unica variabile di stato
    const originalCustomTitle = node.getAttribute('data-custom-title');
    
    // HTML completo del pannello - tutti gli elementi sempre presenti
    panel.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: bold; margin-bottom: 4px; color: #555;">
            Titolo:
          </label>
          <div id="original-title-link" style="
            color: #007bff;
            cursor: pointer;
            text-decoration: underline;
            padding: 4px 0;
            word-break: break-word;
          ">${note.title}</div>
        </div>

        <div id="custom-title-container" style="margin-bottom: 16px;">
          <label style="display: flex; align-items: center; font-weight: bold; margin-bottom: 8px; color: #555; cursor: pointer;">
            <input type="checkbox" id="custom-title-checkbox" ${!!originalCustomTitle ? 'checked' : ''} style="margin-right: 8px;">Titolo personalizzato
          </label>
          
          <!-- Input per modificare il titolo personalizzato -->
          <div id="custom-title-section">
            <input type="text" id="custom-title-input" style="
              width: 100%;
              padding: 8px;
              border: 1px solid #ccc;
              border-radius: 4px;
              font-size: 14px;
              box-sizing: border-box;
              margin-bottom: 8px;
            " value="${originalCustomTitle || ''}">
          </div>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 12px;">
          <button id="save-btn" style="
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
            margin-bottom: 8px;
          ">Salva</button>
          <button id="close-btn" style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
          ">Chiudi</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Previeni la propagazione degli eventi dal pannello
    panel.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Riferimenti agli elementi
    const originalTitleLink = panel.querySelector('#original-title-link');
    const customTitleCheckbox = panel.querySelector('#custom-title-checkbox');
    const customTitleSection = panel.querySelector('#custom-title-section');
    const customTitleInput = panel.querySelector('#custom-title-input');
    const saveBtn = panel.querySelector('#save-btn');
    const closeBtn = panel.querySelector('#close-btn');
    
    // Funzione per aggiornare la visualizzazione in base allo stato
    const updateDisplay = () => {
      const customTitle = customTitleCheckbox.checked
        ? customTitleInput.value.trim()
        : null;
      
      // Imposta visibilità della sezione input
      customTitleSection.style.display = customTitle !== null ? 'block' : 'none';
      
      // Verifica se ci sono modifiche
      const hasChanged = customTitle !== originalCustomTitle;
      
      // Aggiorna il pulsante Salva
      saveBtn.style.display = hasChanged ? 'block' : 'none';
      closeBtn.style.display = hasChanged ? 'none' : 'block';
    };
    
    // Chiudi il pannello
    const closePanel = () => {
      if (document.body.contains(panel)) {
        document.body.removeChild(panel);
      }
    };
    
    updateDisplay();
    
    // Event listeners
    originalTitleLink.addEventListener('click', (e) => {
      e.stopPropagation();
      closePanel();
      this.navigateToNote(note);
    });
    
    customTitleCheckbox.addEventListener('change', (e) => {
      e.stopPropagation();
      updateDisplay();
      
      // Focus e selezione quando si attiva la checkbox
      if (customTitleCheckbox.checked) {
        customTitleInput.value = note.title || '';
        customTitleInput.focus();
        customTitleInput.select();
      }
    });
    
    customTitleInput.addEventListener('input', (e) => {
      updateDisplay();
    });
    
    customTitleInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveCustomTitle(node, note, customTitleInput.value.trim());
        closePanel();
      } 
    });
    
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (customTitleCheckbox.checked) {
        this.saveCustomTitle(node, note, customTitleInput.value.trim());
      } else {
        this.removeCustomTitle(node, note);
      }
      closePanel();
    });
    
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePanel();
    });
  }
  
  // Salva il titolo personalizzato
  static saveCustomTitle(node, note, newTitle) {
    if (newTitle && newTitle !== note.title) {
      node.setAttribute('data-custom-title', newTitle);
    } else {
      node.removeAttribute('data-custom-title');
    }
    this.renderSimpleReference(node, note);
  }
  
  // Rimuove il titolo personalizzato
  static removeCustomTitle(node, note) {
    node.removeAttribute('data-custom-title');
    this.renderSimpleReference(node, note);
  }

  // Naviga alla nota
  static navigateToNote(note) {
    window.open(`/note/${note._id}/`, '_blank');
  }

  static value(node) {
    const noteId = node.getAttribute('data-note-id');
    const customTitle = node.getAttribute('data-custom-title');
    
    if (!noteId) return null;
    
    const result = { "note-ref": { note_id: noteId } };
    if (customTitle) {
      result["note-ref"].title = customTitle;
    }
    
    return result;
  }

  // Metodo di istanza per ottenere il valore del blot
  value() {
    return NoteRefBlot.value(this.domNode);
  }

  // Gestisce i click sui note references
  constructor(scroll, node) {
    super(scroll, node);
    
    // Gestisci click solo se non sono sui pulsantini
    this.domNode.addEventListener('click', (e) => {
      // Se il click è su un button, non fare nulla (i pulsantini hanno i loro handler)
      if (e.target.tagName === 'BUTTON') {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      // Navigazione alla nota quando si clicca sul titolo
      const noteId = this.domNode.getAttribute('data-note-id');
      if (noteId) {
        window.open(`/note/${noteId}/`, '_blank');
      }
    });
  }
}
