"use client"
import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Delta } from '@/lib/myquill/myquill.js';
import 'katex/dist/katex.min.css';

// Dichiarazione di tipo per KaTeX
declare global {
  interface Window {
    katex: {
      renderToString: (input: string, options?: Record<string, unknown>) => string;
    };
  }
}

const NOTE_QUERY = gql`
  query Note($id: ObjectId!) {
    note(_id: $id) {
      _id
      title
      delta
      variant
      author { name }
      created_on
      updated_on
      private
    }
  }
`;

interface DeltaContentProps {
  delta: Delta;
  maxDepth?: number;
  embedded?: boolean;
}

interface NoteEmbedProps {
  note: {
    _id: string;
    title: string;
    delta: Delta;
    variant?: string;
    author: { name: string };
    created_on?: string;
    updated_on?: string;
    private?: boolean;
  };
  maxDepth: number;
}

function NoteEmbed({ note, maxDepth }: NoteEmbedProps) {
  const [showInfo, setShowInfo] = useState(false);
  
  const createdDate = note.created_on ? new Date(note.created_on).toLocaleDateString() : 'N/A';
  const updatedDate = note.updated_on ? new Date(note.updated_on).toLocaleDateString() : 'N/A';
  const variantLabel = note.variant ? 
    `${note.variant.charAt(0).toUpperCase()}${note.variant.slice(1)}` : 
    'Nota';
  const privacyText = note.private ? ' • Privata' : '';

  const handleInfoClick = () => {
    setShowInfo(!showInfo);
  };

  return (
    <div 
      className={`ql-variant-container ql-var-${note.variant || 'default'}`}
      style={{ margin: '0.5em 0', padding: '0.5em', position: 'relative' }}
    >
      <div className="embedded-note-header">
        <h4 style={{ margin: '0 0 0.3em 0', fontSize: '1em' }}>{note.title}</h4>
      </div>
      <div className="embedded-note-content">
        <DeltaContent 
          delta={note.delta} 
          maxDepth={maxDepth - 1}
          embedded={true}
        />
      </div>
      
      {showInfo && (
        <div 
          style={{
            display: 'block',
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            fontSize: '0.85em'
          }}
        >
          <div><strong>{variantLabel}:</strong> {note.title}</div>
          <div><strong>Autore:</strong> {note.author?.name || 'N/A'}</div>
          <div><strong>Creata:</strong> {createdDate}</div>
          <div><strong>Ultima modifica:</strong> {updatedDate}{privacyText}</div>
        </div>
      )}
      
      <div 
        className="note-info-icon"
        onClick={handleInfoClick}
        title="Informazioni nota"
        style={{
          position: 'absolute',
          bottom: '0.5em',
          right: '0.5em',
          cursor: 'pointer',
          opacity: 0.6
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
      </div>
    </div>
  );
}

export function DeltaContent({ 
  delta, 
  maxDepth = 3 
}: DeltaContentProps) {
  // Rendering sincrono diretto - molto più semplice!
  if (!delta || !delta.ops) {
    return <p><br /></p>;
  }

  if (maxDepth <= 0) {
    return <p><em>Max embedding depth reached</em></p>;
  }

  const renderTextWithFormatting = (text: string, attributes: Record<string, unknown> = {}) => {
    let result: React.ReactNode = text;
    
    if (attributes.bold) result = <strong>{result}</strong>;
    if (attributes.italic) result = <em>{result}</em>;
    if (attributes.underline) result = <u>{result}</u>;
    if (attributes.strike) result = <s>{result}</s>;
    if (attributes.code) result = <code>{result}</code>;
    if (attributes.color) result = <span style={{ color: attributes.color as string }}>{result}</span>;
    if (attributes.background) result = <span style={{ backgroundColor: attributes.background as string }}>{result}</span>;
    if (attributes.link) result = <a href={attributes.link as string} target="_blank" rel="noopener noreferrer">{result}</a>;

    return result;
  };

  const renderEmbed = (embed: Record<string, unknown>, attributes: Record<string, unknown>, key: string) => {
    // Gestisci formule
    if (embed.formula) {
      let formulaValue: string;
      let displayMode = false;
      
      // Se è un oggetto con value e displaystyle, estraiamo i valori
      if (typeof embed.formula === 'object' && embed.formula && 'value' in embed.formula) {
        const formula = embed.formula as { value: string; displaystyle?: boolean };
        formulaValue = formula.value;
        displayMode = formula.displaystyle || false;
      } else if (typeof embed.formula === 'string') {
        // Se è già una stringa, la usiamo direttamente
        formulaValue = embed.formula;
      } else {
        // Fallback: convertiamo l'oggetto in stringa
        formulaValue = JSON.stringify(embed.formula);
      }
      
      // Se KaTeX è disponibile, renderizziamo direttamente
      if (typeof window !== 'undefined' && window.katex) {
        try {
          const html = window.katex.renderToString(formulaValue, {
            throwOnError: false,
            errorColor: '#f00',
            displayMode: displayMode,
          });
          
          return (
            <span 
              key={key} 
              className="ql-formula" 
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (error) {
          console.error('KaTeX rendering error:', error);
          // In caso di errore, usa il fallback testuale
          return (
            <span 
              key={key} 
              className="ql-formula" 
              data-value={formulaValue}
            >
              {formulaValue}
            </span>
          );
        }
      }
      
      // Fallback se KaTeX non è disponibile
      return (
        <span 
          key={key} 
          className="ql-formula" 
          data-value={formulaValue}
        >
          {formulaValue}
        </span>
      );
    }

    // Gestisce note references nel formato corretto
    if (embed['note-ref']) {
      const noteRef = embed['note-ref'] as { note_id?: string };
      if (noteRef?.note_id) {
        return <AsyncNoteEmbed
            key={key}
            noteId={noteRef.note_id}
            maxDepth={maxDepth}
          />
      }
    }

    return null;
  };

  const elements: React.ReactNode[] = [];
  let currentParagraph: React.ReactNode[] = [];
  let keyCounter = 0;

  for (const op of delta.ops) {
    if (op.insert) {
      // Gestisce inserti di testo
      if (typeof op.insert === 'string') {
        const text = op.insert;
        
        // Gestisce i newline
        if (text.includes('\n')) {
          const parts = text.split('\n');
          for (let i = 0; i < parts.length; i++) {
            if (parts[i]) {
              currentParagraph.push(
                <span key={keyCounter++}>
                  {renderTextWithFormatting(parts[i], op.attributes || {})}
                </span>
              );
            }
            
            // Se non è l'ultima parte, chiudi il paragrafo
            if (i < parts.length - 1) {
              elements.push(
                <p key={keyCounter++}>
                  {currentParagraph.length > 0 ? currentParagraph : <br />}
                </p>
              );
              currentParagraph = [];
            }
          }
        } else {
          currentParagraph.push(
            <span key={keyCounter++}>
              {renderTextWithFormatting(text, op.attributes || {})}
            </span>
          );
        }
      }
      // Gestisce embed (formule, note references, etc.)
      else if (typeof op.insert === 'object') {
        const embedElement = renderEmbed(op.insert, op.attributes || {}, `embed-${keyCounter++}`);
        if (embedElement) {
          // Se è una nota embedded (che contiene elementi block), chiudi il paragrafo corrente
          // e inserisci la nota come elemento separato
          if (op.insert['note-ref']) {
            // Chiudi il paragrafo corrente se non è vuoto
            if (currentParagraph.length > 0) {
              elements.push(
                <p key={keyCounter++}>
                  {currentParagraph}
                </p>
              );
              currentParagraph = [];
            }
            // Inserisci la nota embedded come elemento separato
            elements.push(embedElement);
          } else {
            // Per altri embed (come formule), inserisci nel paragrafo corrente
            currentParagraph.push(embedElement);
          }
        }
      }
    }
  }

  // Chiudi l'ultimo paragrafo se necessario
  if (currentParagraph.length > 0) {
    elements.push(
      <p key={keyCounter++}>
        {currentParagraph}
      </p>
    );
  }

  return <>{elements.length > 0 ? elements : <p><br /></p>}</>;
}

// Componente separato per gestire il caricamento asincrono delle note
function AsyncNoteEmbed({ 
  noteId, 
  maxDepth 
}: {
  noteId: string;
  maxDepth: number;
}) {
  const { data, loading, error } = useQuery(NOTE_QUERY, {
    variables: { id: noteId }
  });

  if (loading) {
    return <span className="ql-note-ref-simple">[Loading note: {noteId}]</span>;
  }

  const note = data?.note;
  if (error || !note) {
    return <span className="ql-note-ref-simple">[Note not found: {noteId}]</span>;
  }

  return (
    <NoteEmbed
      note={note}
      maxDepth={maxDepth}
    />
  );
}
