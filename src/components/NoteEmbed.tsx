"use client"
import React, { useContext, useState } from 'react'
import { useQuery, gql } from '@apollo/client'
import 'katex/dist/katex.min.css'
import { ObjectId } from 'bson'

import { Note } from '@/app/graphql/generated'
import NoteContent from './NoteContent'
import { DocumentContext, DocumentContextProvider, useDocumentContext } from './DocumentElement'

const NOTE_QUERY = gql`
  query Note($_id: ObjectId!) {
    note(_id: $_id) {
      _id
      title
      hide_title
      delta
      variant
      author { name }
      created_on
      updated_on
      private
    }
  }
`

export function NoteEmbedAsync({context, note_id, title}: { 
  note_id: ObjectId
  title?: string
  context: DocumentContext
}) {
  const { data, loading, error } = useQuery(NOTE_QUERY, {
    variables: { _id: note_id }
  });

  if (loading) return <span className="ql-note-ref-simple">[Loading note: {`${note_id}`}]</span>

  const note = data?.note;
  if (error || !note) return <span className="ql-note-ref-simple">[Note not found: {`${note_id}`}]</span>

  return <NoteEmbed
      context={{...context, parents: [...context.parents, note_id.toString()]}}
      note={note}
      title={title}
    />
}

function NoteEmbed({ context, note, title }: {
  context: DocumentContext
  note: Note
  title?: string
}) {
  title = title || (!note.hide_title && note.title) || ''

  return <DocumentContextProvider value={context}>
    <DocumentEmbed variant={note.variant || undefined} title={title}>
      <NoteContent 
        note={note}
        context={context}
        />
      <EmbedInfo note={note} />
    </DocumentEmbed>
  </DocumentContextProvider> 
}

function EmbedInfo({note}: { 
  note: Note 
}) {
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

  return <>
    {showInfo && (
      <div className="note-info-popup">
        <div><a href={`/note/${note._id}/`}><strong>{variantLabel}:</strong> {note.title}</a></div>
        <div><strong>Autore:</strong> {note.author?.name || 'N/A'}</div>
        <div><strong>Creata:</strong> {createdDate}</div>
        <div><strong>Ultima modifica:</strong> {updatedDate}{privacyText}</div>
      </div>
    )}
    
    <div 
      className="note-info-icon"
      onClick={handleInfoClick}
      title="Informazioni nota"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
    </div>
  </>
}

export function DocumentEmbed({variant, title, children, note_id}: {
  variant?: string
  title?: string
  children: React.ReactNode
  note_id?: string
}) {
  const context = useDocumentContext()
  const inner_context = {
    ...context,
    parents: note_id ? [...context.parents, note_id] : context.parents
  }
  return <div 
      className={`ql-variant-container ql-var-${variant || 'default'}`}
      style={{ position: 'relative' }}
    >
      <div className="embedded-note-header">
        { title && 
        <span className="embedded-note-title" style={{ margin: '0 0 0.3em 0', fontSize: '1em' }}>
          {title}
        </span>
        }
        <DocumentContextProvider value={inner_context}>
          {children}
        </DocumentContextProvider>
      </div>
  </div>
}
