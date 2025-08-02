"use client"
import React from 'react'
import 'katex/dist/katex.min.css'

import { Delta  } from '@/lib/myquill/myquill.js'
import NoteEmbed from './NoteEmbed'
import document_from_delta, {Document, Paragraph, Node, Formula, List, Choice, NoteRef } from '@/lib/myquill/document_from_delta'

// Dichiarazione di tipo per KaTeX
declare global {
  interface Window {
    katex: {
      renderToString: (input: string, options?: Record<string, unknown>) => string;
    };
  }
}

export type Context = {
  parents: string[] // Array di ID dei genitori per evitare loop infiniti
}

export default function DeltaContent({ delta, context }: {
  delta: Delta
  context?: Context
}) {
  if (!context) context = { parents: [] }

  if (!delta || !delta.ops) return <></>

  const document = document_from_delta(delta)

  return <>
    <DocumentElement context={context} document={document} />
  </>
}

function DocumentElement({context,document}:{context:Context,document: Document}) {
  return document.paragraphs.map((paragraph,key) => <ParagraphElement key={key} context={context} paragraph={paragraph} />)
}

function ParagraphElement({context,paragraph}:{context:Context,paragraph: Paragraph|NoteRef}) {
  if (paragraph.type === 'note-ref') {
    if (context.parents.includes(paragraph.note_id)) {
      return <span className="ql-note-ref-simple">[Circular reference to note: {paragraph.note_id}]</span>
    }
    return <NoteEmbed noteId={paragraph.note_id} context={context} />
  }
  if (paragraph.attribute === 'h1') return <h1 className="note"><LineElement nodes={paragraph.line.nodes} /></h1>
  if (paragraph.attribute === 'h2') return <h2 className="note"><LineElement nodes={paragraph.line.nodes} /></h2>
  
  // Vorrei usare <p> per i paragrafi, ma gli elenchi non possono 
  // stare dentro <p>. 
  // Dunque ci vuole un workaround per separare i nodi 
  // elenco.
  const ps: (Node[]|List)[] = []
  let nodes: Node[] = []

  function push_nodes() {
    if (nodes.length > 0) ps.push(nodes)
    nodes = [] 
  }

  for (const node of paragraph.line.nodes) {
    if (typeof node === 'object' && node.type === 'list') {
      push_nodes()      
      ps.push(node)
    } else nodes.push(node)
  }
  push_nodes()

  return ps.map((item, index) => {
    if (Array.isArray(item)) {
      return <p key={index}><LineElement nodes={item} /></p>
    } else {
      return <ListElement key={index} list={item} />
    }
  })
}

function LineElement({nodes}:{nodes: Node[]}) {
  return nodes.map((node,key) => <NodeElement key={key} node={node} />)
}

function NodeElement({node}:{node: Node}) {
  if (typeof node === 'string') return node
  if (node && typeof node === 'object') {
    if (node.type === 'span') {
      const children = node.nodes.map((n,key) => <NodeElement key={key} node={n}/>)
      if (node.attribute === 'bold') return <b>{children}</b>
      if (node.attribute === 'italic') return <i>{children}</i>
      if (node.attribute === 'underline') return <u>{children}</u>
      if (node.attribute === 'strike') return <s>{children}</s>
      if (node.attribute === 'error') return <span className="error">{children}</span>
      return <span>{children}</span>
    }
    if (node.type === 'formula') return <FormulaElement formula={node} />
    if (node.type === 'list') return <ListElement list={node} />
  }
  return <span className="error">invalid node</span>
}

function FormulaElement({formula}:{formula:Formula}) {
    try {
    const html = window.katex.renderToString(formula.value, {
      throwOnError: false,
      errorColor: '#f00',
      displayMode: formula.displaystyle,
    });
    
    return <span 
        className="ql-formula" 
        dangerouslySetInnerHTML={{ __html: html }}
    />
  } catch (error) {
    console.error('KaTeX rendering error:', error)
    // In caso di errore, usa il fallback testuale
    return <span className="ql-formula" data-value={formula.value}>
        {formula.value}
    </span>
  }
}

function ListElement({list}:{list:List}) {
  if (list.attribute === 'choice') return <ChoiceElement choice={list} />
  const children = list.lines.map((line,key) => <li key={key}><LineElement nodes={line.nodes} /></li>)
  if (list.attribute === 'ordered') return <ol>{children}</ol>
  return <ul>{children}</ul>
}

function ChoiceElement({choice}:{choice:Choice}) {
  return <ul className="delta-choice-list">
    { choice.lines.map((line,i) => <li key={i} data-list="choice" style={{display: 'flex', alignItems: 'center', gap: '0.5em'}}>
        <input
          type="radio"
          style={{marginRight: '0.5em'}}
        />
        {/* Etichetta A, B, C... 
        <span style={{fontWeight: 'bold', marginRight: '0.5em'}}>{String.fromCharCode(65 + i)}.</span>
        */}
        <LineElement nodes={line.nodes} />
      </li>
    )}
  </ul>
}

