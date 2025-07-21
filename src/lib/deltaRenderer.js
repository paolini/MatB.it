/**
 * Centralizzato renderer per convertire Delta in HTML
 * Usato sia per note standalone che embedded
 */

export class DeltaRenderer {
  /**
   * Converte un Delta Quill in HTML con supporto per note embedded
   */
  static async render(delta, options = {}) {
    const { 
      noteResolver = null, 
      maxDepth = 2, 
      currentDepth = 0
    } = options;
    
    if (!delta || !delta.ops) return '<p></p>';
    if (currentDepth >= maxDepth) return '<p><em>Max embedding depth reached</em></p>';
    
    let html = '';
    let currentParagraph = '';
    
    for (const op of delta.ops) {
      if (op.insert) {
        // Gestisce inserti di testo
        if (typeof op.insert === 'string') {
          let text = op.insert;
          
          // Gestisce i newline
          if (text.includes('\n')) {
            const parts = text.split('\n');
            for (let i = 0; i < parts.length; i++) {
              if (parts[i]) {
                currentParagraph += await this.applyTextFormatting(parts[i], op.attributes, { noteResolver, maxDepth, currentDepth });
              }
              
              // Se non è l'ultima parte, chiudi il paragrafo
              if (i < parts.length - 1) {
                html += this.wrapParagraph(currentParagraph);
                currentParagraph = '';
              }
            }
          } else {
            currentParagraph += await this.applyTextFormatting(text, op.attributes, { noteResolver, maxDepth, currentDepth });
          }
        }
        // Gestisce embed (formule, note references, etc.)
        else if (typeof op.insert === 'object') {
          currentParagraph += await this.renderEmbed(op.insert, op.attributes, { noteResolver, maxDepth, currentDepth });
        }
      }
    }
    
    // Chiudi l'ultimo paragrafo se necessario
    if (currentParagraph) {
      html += this.wrapParagraph(currentParagraph);
    }
    
    return html || '<p></p>';
  }

  /**
   * Applica formattazione del testo
   */
  static async applyTextFormatting(text, attributes, options = {}) {
    if (!text) return '';
    const { noteResolver, maxDepth, currentDepth } = options;
    
    if (!attributes) return this.escapeHtml(text);
    
    let result = this.escapeHtml(text);
    
    if (attributes.bold) result = `<strong>${result}</strong>`;
    if (attributes.italic) result = `<em>${result}</em>`;
    if (attributes.underline) result = `<u>${result}</u>`;
    if (attributes.strike) result = `<s>${result}</s>`;
    if (attributes.code) result = `<code>${result}</code>`;
    
    // Gestisci note_id come attributo di testo
    if (attributes.note_id && noteResolver) {
      try {
        const note = await noteResolver(attributes.note_id);
        if (note) {
          const embeddedContent = await this.render(note.delta, {
            noteResolver,
            maxDepth,
            currentDepth: currentDepth + 1,
            embedded: true
          });
          const createdDate = note.created_on ? new Date(note.created_on).toLocaleDateString() : 'N/A';
          const updatedDate = note.updated_on ? new Date(note.updated_on).toLocaleDateString() : 'N/A';
          const variantLabel = note.variant ? 
            `${note.variant.charAt(0).toUpperCase()}${note.variant.slice(1)}` : 
            'Nota';
          const privacyText = note.private ? ' • Privata' : '';
          
          result = `
            <div class="ql-variant-container ql-var-${note.variant || 'default'}" style="margin: 0.5em 0; padding: 0.5em; position: relative;">
              <div class="embedded-note-header">
                <h4 style="margin: 0 0 0.3em 0; font-size: 1em;">${this.escapeHtml(note.title)}</h4>
              </div>
              <div class="embedded-note-content">${embeddedContent}</div>
              <div class="note-info-data" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; border-radius: 4px; padding: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 1000; font-size: 0.85em;">
                <div><strong>${variantLabel}:</strong> ${this.escapeHtml(note.title)}</div>
                <div><strong>Autore:</strong> ${this.escapeHtml(note.author?.name || 'N/A')}</div>
                <div><strong>Creata:</strong> ${createdDate}</div>
                <div><strong>Ultima modifica:</strong> ${updatedDate}${privacyText}</div>
              </div>
              <div class="note-info-icon" title="Informazioni nota" style="position: absolute; bottom: 0.5em; right: 0.5em; cursor: pointer; opacity: 0.6; hover: opacity: 1;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
            </div>
          `;
        } else {
          result = `<span class="ql-note-ref-simple">[Note not found: ${attributes.note_id}]</span>`;
        }
      } catch (error) {
        console.error('Error loading embedded note:', error);
        result = `<span class="ql-note-ref-simple">[Error loading note: ${attributes.note_id}]</span>`;
      }
    }
    
    // Gestisci colori, link, etc.
    if (attributes.color) result = `<span style="color: ${attributes.color}">${result}</span>`;
    if (attributes.background) result = `<span style="background-color: ${attributes.background}">${result}</span>`;
    if (attributes.link) result = `<a href="${attributes.link}" target="_blank">${result}</a>`;
    
    return result;
  }

  /**
   * Renderizza elementi embed (formule, note references)
   */
  static async renderEmbed(embed, attributes, options = {}) {
    const { noteResolver, maxDepth, currentDepth } = options;
    
    // Gestisci formule
    if (embed.formula) {
      return `<span class="ql-formula" data-value="${this.escapeHtml(embed.formula)}">${this.escapeHtml(embed.formula)}</span>`;
    }
    
    // Gestisci note references come embed
    if (embed.note_id && noteResolver) {
      try {
        const note = await noteResolver(embed.note_id);
        if (note) {
          const embeddedContent = await this.render(note.delta, {
            noteResolver,
            maxDepth,
            currentDepth: currentDepth + 1,
            embedded: true
          });
          const createdDate = note.created_on ? new Date(note.created_on).toLocaleDateString() : 'N/A';
          const updatedDate = note.updated_on ? new Date(note.updated_on).toLocaleDateString() : 'N/A';
          const variantLabel = note.variant ? 
            `${note.variant.charAt(0).toUpperCase()}${note.variant.slice(1)}` : 
            'Nota';
          const privacyText = note.private ? ' • Privata' : '';
          
          return `
            <div class="ql-variant-container ql-var-${note.variant || 'default'}" style="margin: 0.5em 0; padding: 0.5em; position: relative;">
              <div class="embedded-note-header">
                <h4 style="margin: 0 0 0.3em 0; font-size: 1em;">${this.escapeHtml(note.title)}</h4>
              </div>
              <div class="embedded-note-content">${embeddedContent}</div>
              <div class="note-info-data" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; border-radius: 4px; padding: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 1000; font-size: 0.85em;">
                <div><strong>${variantLabel}:</strong> ${this.escapeHtml(note.title)}</div>
                <div><strong>Autore:</strong> ${this.escapeHtml(note.author?.name || 'N/A')}</div>
                <div><strong>Creata:</strong> ${createdDate}</div>
                <div><strong>Ultima modifica:</strong> ${updatedDate}${privacyText}</div>
              </div>
              <div class="note-info-icon" title="Informazioni nota" style="position: absolute; bottom: 0.5em; right: 0.5em; cursor: pointer; opacity: 0.6; hover: opacity: 1;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
            </div>
          `;
        } else {
          return `<span class="ql-note-ref-simple">[Note not found: ${embed.note_id}]</span>`;
        }
      } catch (error) {
        console.error('Error loading embedded note:', error);
        return `<span class="ql-note-ref-simple">[Error loading note: ${embed.note_id}]</span>`;
      }
    }
    
    // Fallback per note_id senza resolver
    if (embed.note_id || (attributes && attributes.note_id)) {
      const noteId = embed.note_id || attributes.note_id;
      return `<span class="ql-note-ref-simple" data-note-id="${noteId}">[Note: ${noteId}]</span>`;
    }
    
    return '';
  }

  /**
   * Wrappa il contenuto in un paragrafo
   */
  static wrapParagraph(content) {
    if (!content.trim()) return '<p><br></p>';
    return `<p>${content}</p>`;
  }

  /**
   * Escape HTML per sicurezza
   */
  static escapeHtml(text) {
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    // Fallback per ambiente server-side
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Versione semplificata per note embedded (solo formattazione di base)
   */
  static renderSimple(delta) {
    if (!delta || !delta.ops) return '';
    
    let html = '';
    for (const op of delta.ops) {
      if (op.insert && typeof op.insert === 'string') {
        let text = op.insert;
        
        // Sostituisci newline con <br>
        text = text.replace(/\n/g, '<br>');
        
        // Applica formattazione di base
        if (op.attributes) {
          if (op.attributes.bold) text = `<strong>${text}</strong>`;
          if (op.attributes.italic) text = `<em>${text}</em>`;
          if (op.attributes.formula) text = `<span class="ql-formula">${text}</span>`;
          if (op.attributes.note_id) text = `<span class="ql-note-ref-simple">[Note: ${op.attributes.note_id}]</span>`;
        }
        
        html += this.escapeHtml(text);
      }
    }
    
    return html || '';
  }
}
