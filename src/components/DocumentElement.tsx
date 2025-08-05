"use client"
import React from 'react'
import 'katex/dist/katex.min.css'

import NoteEmbed, { DocumentEmbed } from './NoteEmbed'
import { Document, Paragraph, Node, Formula, List, Choice, NoteRef } from '@/lib/myquill/document'
import { ObjectId } from 'bson'

// Dichiarazione di tipo per KaTeX
declare global {
  interface Window {
    katex: {
      renderToString: (input: string, options?: Record<string, unknown>) => string;
    };
  }
}

export type Context = {
  parents: string[], // Array di ID dei genitori per evitare loop infiniti
  answers: Record<string, number>,
  setAnswer: (id: string, answer: number) => void
}

export default function DocumentElement({context,document}:{context:Context, document: Document}) {
  return document.paragraphs.map((paragraph,key) => <ParagraphElement key={key} context={context} paragraph={paragraph} />)
}

function ParagraphElement({context,paragraph}:{context:Context, paragraph: Paragraph|NoteRef|Document}) {
  if (paragraph.type === 'document') {
      const parents = paragraph.note_id ? [...context.parents,paragraph.note_id]: context.parents
      return <DocumentEmbed variant={paragraph.variant} title={paragraph.title}>
          <DocumentElement context={{...context,parents}} document={paragraph}/>
      </DocumentEmbed>
  }
  if (paragraph.type === 'note-ref') {
    // asincrono
    if (context.parents.includes(paragraph.note_id)) {
      return <span className="ql-note-ref-simple">[Circular reference to note: {`${paragraph.note_id}`}]</span>
    }
    return <NoteEmbed note_id={new ObjectId(paragraph.note_id)} context={context} />
  }
  if (paragraph.attribute === 'h1') return <h1 className="note"><LineElement context={context} nodes={paragraph.line.nodes} /></h1>
  if (paragraph.attribute === 'h2') return <h2 className="note"><LineElement context={context} nodes={paragraph.line.nodes} /></h2>
  
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
      return <p key={index}><LineElement context={context} nodes={item} /></p>
    } else {
      return <ListElement key={index} context={context} list={item} />
    }
  })
}

function LineElement({context, nodes}:{context: Context, nodes: Node[]}) {
  return nodes.map((node,key) => <NodeElement key={key} context={context} node={node} />)
}

function NodeElement({context,node}:{context: Context, node: Node}) {
  if (typeof node === 'string') return node
  if (node && typeof node === 'object') {
    if (node.type === 'span') {
      const children = node.nodes.map((n,key) => <NodeElement key={key} context={context} node={n}/>)
      if (node.attribute === 'bold') return <b>{children}</b>
      if (node.attribute === 'italic') return <i>{children}</i>
      if (node.attribute === 'underline') return <u>{children}</u>
      if (node.attribute === 'strike') return <s>{children}</s>
      if (node.attribute === 'error') return <span className="error">{children}</span>
      return <span>{children}</span>
    }
    if (node.type === 'formula') return <FormulaElement formula={node} />
    if (node.type === 'list') return <ListElement context={context} list={node} />
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

function ListElement({context, list}:{context: Context, list:List}) {
  if (list.attribute === 'choice') return <ChoiceElement context={context} choice={list} />
  
  const children = list.lines.map((line,key) => <li key={key}>
        <LineElement context={context} nodes={line.nodes} />
    </li>)
  if (list.attribute === 'ordered') return <ol>{children}</ol>
  return <ul>{children}</ul>
}

function ChoiceElement({context, choice}:{context: Context, choice:Choice}) {
  const note_id = context?.parents.length>0 && context.parents[context.parents.length-1] || undefined
  const answer = note_id && context.answers ? context.answers[note_id] : undefined
  return <ul className="delta-choice-list">
    { choice.lines.map((line,i) => <li key={i} data-list="choice" style={{display: 'flex', alignItems: 'center', gap: '0.5em'}}>
        <input
          type="radio"
          style={{marginRight: '0.5em'}}
          checked={answer===i || (answer === undefined && i === 0)}
          onChange={() => {
            if (!(note_id && context.setAnswer)) return;
            context.setAnswer(note_id, i)
          }}
        />
        <LineElement context={context} nodes={line.nodes} />
      </li>
    )}
  </ul>
}
