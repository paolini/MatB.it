"use client"
import React from 'react'
import 'katex/dist/katex.min.css'
import { ObjectId } from 'bson'

import { Delta  } from '@/lib/myquill/myquill.js'
import { document_from_delta, Document } from '@/lib/myquill/document'
import DocumentElement, {Context} from './DocumentElement'

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

export default function DeltaContent({ delta, context }: {
  delta: Delta
  context?: Context
}) {
  const [document, setDocument] = useState<Document|null>(null)
  if (!context) context = { parents: [] }

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!delta || !delta.ops) {
        setDocument(null)
        return
      }
      const doc = await document_from_delta(delta, {parents:[]})
      if (mounted) setDocument(doc)
    }
    load()
    return () => { mounted = false }
  }, [delta])

  if (!delta || !delta.ops) return <></>
  if (!document) return <Loading />

  return <>
    <DocumentElement context={context} document={document} />
  </>
}


