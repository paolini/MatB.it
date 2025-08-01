"use client"
import React, { useState } from 'react'
import { useQuery, gql } from '@apollo/client'
import 'katex/dist/katex.min.css'

import { Note } from '@/app/graphql/generated'
import DeltaContent, { Context } from './DeltaContent'

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
`

export default function NoteEmbed({context, noteId}: { 
  noteId: string
  context: Context
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
    <NoteEmbedInner
      context={{...context, parents: [...context.parents, noteId]}}
      note={note}
    />
  );
}

export function NoteEmbedInner({ context, note }: {
  context: Context
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

  return (
    <div 
      className={`ql-variant-container ql-var-${note.variant || 'default'}`}
      style={{ margin: '0.5em 0', padding: '0.5em', position: 'relative' }}
    >
      <div className="embedded-note-header">
        <span className="embedded-note-title" style={{ margin: '0 0 0.3em 0', fontSize: '1em' }}>{note.title}</span>
      </div>
      <div className="embedded-note-content">
        <DeltaContent 
          delta={note.delta} 
          context={context}
        />
      </div>
      
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
    </div>
  );
}

