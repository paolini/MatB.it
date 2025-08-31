"use client"
import React from 'react'
import 'katex/dist/katex.min.css'

import { document_from_note, Document } from '@/lib/myquill/document'
import { Note } from '@/app/graphql/generated'
import DocumentElement, {DocumentContext, OrdinalContextProvider} from './DocumentElement'

// Dichiarazione di tipo per KaTeX
declare global {
  interface Window {
    katex: {
      renderToString: (input: string, options?: Record<string, unknown>) => string;
    };
  }
}

import { useEffect, useState } from 'react'
import { Loading } from './utils'

export default function NoteContent({ note, context, ordinal }: {
  note: Note,
  context?: DocumentContext
  ordinal?: string
}) {
  const [document, setDocument] = useState<Document|null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!note.delta || !note.delta.ops) {
        setDocument(null)
        return
      }
      const doc = await document_from_note(note)
      if (mounted) setDocument(doc)
    }
    load()
    return () => { mounted = false }
  }, [note])

  if (!note.delta || !note.delta.ops) return <></>
  if (!document) return <Loading />

  return <OrdinalContextProvider>
    <DocumentElement context={context} document={document} ordinal={ordinal || ''} />
  </OrdinalContextProvider>
}


