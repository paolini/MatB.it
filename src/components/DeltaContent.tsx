"use client"
import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Delta } from '@/lib/myquill/myquill.js';
import 'katex/dist/katex.min.css';
import { isTypeSystemDefinitionNode } from 'graphql';

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

type ListType = 'bullet' | 'ordered' | 'choice' | ''

type Attributes = {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  code?: boolean
  color?: string
  background?: string
  link?: string
  listType?: ListType
}

type Block = ParagraphBlock | ListBlock | EmbedBlock

interface ParagraphBlock {
  type: 'paragraph'
  items: React.ReactNode[]
}

interface ListBlock {
  type: 'list'
  listType: ListType
  items: React.ReactNode[]
}

type Embed = string | Record<string, unknown> | undefined

interface EmbedBlock {
  type: 'embed'
  embed: Embed
}

export function DeltaContent({ 
  delta, 
  maxDepth = 3 
}: DeltaContentProps) {
  // Stato per le risposte delle liste 'choice': { [blockIdx]: selectedIdx }
  const [choiceSelections, setChoiceSelections] = useState<Record<string, number | null>>({});

  // Handler per cambiare la selezione di una lista 'choice'
  const handleChoiceChange = (blockIdx: string, idx: number) => {
    setChoiceSelections(prev => ({ ...prev, [blockIdx]: idx }));
  };

  if (!delta || !delta.ops) return <p><br /></p>

  if (maxDepth <= 0) return <p><em>Max embedding depth reached</em></p>
  
  // Nuovo parsing Quill-style: accoppia testo e marker di lista\n
  const blocks: Block[] = []
  let lastBlock: Block | null = null
  let items: React.ReactNode[] = []
  let keyCounter = 0

  for (let opIdx = 0; opIdx < delta.ops.length; opIdx++) {
    const op = delta.ops[opIdx]
    const insert = op.insert
    const attributes = getAttributes(op.attributes)

    if (typeof insert === 'string') {
      const chunks = insert.split('\n');
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        if (i>0) flushBuffer(attributes)
        if (chunk) {
          items.push(<span key={keyCounter++}>
            {renderTextWithFormatting(chunk, attributes || {})}
          </span>)
        }
      }
    } else if (typeof insert === 'object') {
      items.push(renderEmbed(op.insert, `embed-${keyCounter++}`))
       // { type: 'embed', embed: op.insert })
    }
  }
  flushBuffer({})

  console.log('Parsed blocks:', blocks);

  // Rendering blocchi React
  const elements: React.ReactNode[] = [];
  for (const blockIdx in blocks) {
    const block = blocks[blockIdx];
    if (block.type === 'paragraph') {
      elements.push(<p key={keyCounter++}>
          {block.items.length > 0 ? block.items : <br />}
        </p>)
    } else if (block.type === 'list') {
      let Tag: 'ul' | 'ol' = 'ul';
      if (block.listType === 'ordered') Tag = 'ol';
      if (block.listType === 'choice') Tag = 'ol';
      const radioName = `choice-list-${blockIdx}`;
      if (block.listType === 'choice') {
        // Racchiudi la lista choice in una form
        elements.push(
          <form key={keyCounter++} className="ql-choice-form" onSubmit={e => e.preventDefault()}>
            <Tag className="ql-choice-list">
              {block.items.map((item, idx: number) => {
                let liProps: any = { 'data-list': 'choice' };
                return (
                  <li key={keyCounter++} {...liProps} style={{display: 'flex', alignItems: 'center', gap: '0.5em'}}>
                    <input
                      type="radio"
                      name={radioName}
                      value={idx}
                      checked={choiceSelections[blockIdx] === idx}
                      onChange={() => handleChoiceChange(blockIdx, idx)}
                      style={{marginRight: '0.5em'}}
                    />
                    {/* Etichetta A, B, C... */}
                    <span style={{fontWeight: 'bold', marginRight: '0.5em'}}>{String.fromCharCode(65 + idx)}.</span>
                    {item}
                  </li>
                );
              })}
            </Tag>
          </form>
        )
      } else {
        elements.push(
          <Tag key={keyCounter++}>
            {block.items.map((item, idx) => (
              <li key={keyCounter++}>{item}</li>
            ))}
          </Tag>
        );
      }
    } else if (block.type === 'embed') {
      elements.push(renderEmbed(block.embed, `embed-${keyCounter++}`))
    }
  }
  return <>{elements}</>

  function flushBuffer(attributes: Attributes) {
    if (items.length === 0) return
    if (attributes.listType) {
      if (lastBlock && lastBlock.type === 'list' && lastBlock.listType === attributes.listType) {
          // Aggiungi al buffer della lista esistente
          lastBlock.items.push(...items)
        } else {
          lastBlock = { type: 'list', listType: attributes.listType, items: items } 
          blocks.push(lastBlock)
        }
      } else {
        lastBlock = { type: 'paragraph', items: items}
        blocks.push(lastBlock)
      }
      items = []
  }

  function getAttributes(attributes: Record<string, unknown> | undefined): Attributes {
    if (!attributes) return {}
    const attrs: Attributes = {}
    if (attributes.bold) attrs.bold = true
    if (attributes.italic) attrs.italic = true
    if (attributes.underline) attrs.underline = true
    if (attributes.strike) attrs.strike = true
    if (attributes.code) attrs.code = true
    if (attributes.color && typeof attributes.color === 'string') attrs.color = attributes.color
    if (attributes.background && typeof attributes.background === 'string') attrs.background = attributes.background
    if (attributes.link && typeof attributes.link === 'string') attrs.link = attributes.link
    if (attributes.list === 'bullet' || attributes.list === 'ordered' || attributes.list === 'choice') {
        attrs.listType = attributes.list
    } 
    if (attributes.list && typeof attributes.list === 'object' && 'list' in attributes.list && attributes.list.list==='choice') {
        attrs.listType = 'choice'
    }
    return attrs
  }

  function renderTextWithFormatting(text: string, attributes: Record<string, unknown> = {}) {
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
  }

  function renderEmbed(embed: Embed, key: string) {
    // Gestisci formule
    if (!embed) return "InvalidEmbed(0)"
    if (typeof embed !== 'object') return "InvalidEmbed(1)"
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
          
          return <span 
              key={key} 
              className="ql-formula" 
              dangerouslySetInnerHTML={{ __html: html }}
          />
        } catch (error) {
          console.error('KaTeX rendering error:', error);
          // In caso di errore, usa il fallback testuale
          return <span key={key} className="ql-formula" data-value={formulaValue}>
              {formulaValue}
          </span>
        }
      }
      
      // Fallback se KaTeX non è disponibile
      return <span key={key} className="ql-formula" data-value={formulaValue}>
          {formulaValue}
      </span>
    }
    
    // Gestisce note references nel formato corretto
    if (embed['note-ref']) {
      const noteRef = embed['note-ref'] as { note_id?: string };
      if (noteRef?.note_id) {
        return <AsyncNoteEmbed key={key} noteId={noteRef.note_id} maxDepth={maxDepth} />
      }
    }

    return null;
  }
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
