"use client"
import React, { createContext, useContext as useReactContext, useState } from 'react'
import 'katex/dist/katex.min.css'

import { NoteEmbedAsync, DocumentEmbed } from './NoteEmbed'
import { Document, Paragraph, Node, Formula, List, Choice, NoteRef, ParagraphMix } from '@/lib/myquill/document'
import { ObjectId } from 'bson'

// Dichiarazione di tipo per KaTeX
declare global {
  interface Window {
    katex: {
      renderToString: (input: string, options?: Record<string, unknown>) => string;
    };
  }
}

export type ContextAnswer = {
  answer: number | null,
  correct_answer?: number | null,
}

type Ordinal = string

function ordinal_pushed(ordinal: string, index: number): string {
  return ordinal + String.fromCharCode(48 + index) // 48 è '0'
}

export type OrdinalContext = {
  variants: Record<string, Ordinal[]>
  addVariant: (variant: string, ordinal: Ordinal) => void
  getCounter: (variant: string|undefined, ordinal: Ordinal) => number
}

const OrdinalContext = createContext<OrdinalContext | undefined>(undefined)

export function OrdinalContextProvider({ children }: { children: React.ReactNode }) {
  const [variants, setVariants] = useState<Record<string, Ordinal[]>>({})

  const context = { 
    variants, 
    addVariant: (variant: string, ordinal: Ordinal) => {
      setTimeout(() => {
        if (variants[variant] && variants[variant].includes(ordinal)) return; // già presente
        setVariants(prev => {
          const existing = prev[variant] || []
          return {
            ...prev,
            [variant]: inserted_ordinal(existing, ordinal)
          }
        })
      }, 0)
    },
    getCounter: (variant: string|undefined, ordinal: Ordinal) => {
      if (!variant) return 0
      const ordinals = variants[variant]
      if (!ordinals) return 0
      return ordinals.indexOf(ordinal) + 1 
    }
  }

  return <OrdinalContext.Provider value={context}>
    {children}
  </OrdinalContext.Provider>

  function inserted_ordinal(existing: Ordinal[], ordinal: Ordinal): Ordinal[] {
    // Inserisce ordinal in existing mantenendo l'ordine lessicografico e senza duplicati
    const result: Ordinal[] = [];
    let inserted = false;
    for (const o of existing) {
      if (!inserted && o >= ordinal) {
        if (o !== ordinal) result.push(ordinal);
        inserted = true;
      }
      result.push(o);
    }
    if (!inserted) result.push(ordinal);
    return result;
  }
}

export function useOrdinalContext(): OrdinalContext|undefined {
  return useReactContext(OrdinalContext)
}

export function DebugOrdinalContext() {
  const ctx = useOrdinalContext()
  return <pre>{JSON.stringify(ctx, null, 2)}</pre>
}

export type DocumentContext = {
  parents: string[] // Array di ID dei genitori per evitare loop infiniti
  questionIds: string[] // Array ordinato degli ID delle domande
  answers: Record<string, ContextAnswer> // Mappa delle risposte per ID
  setAnswer: (id: string, answer: number) => void
}

// React Context per il tipo DocumentContext
const DocumentContextReact = createContext<DocumentContext | undefined>(undefined);

export function DocumentContextProvider({ value, children }: { value: DocumentContext, children: React.ReactNode }) {
  return <DocumentContextReact.Provider value={value}>
    {children}
  </DocumentContextReact.Provider>
}

export function useDocumentContext(): DocumentContext {
  const ctx = useReactContext(DocumentContextReact);
  if (!ctx) throw new Error('useDocumentContext must be used within a DocumentContextProvider');
  return ctx;
}

const DEFAULT_CONTEXT = {
  parents: [],
  questionIds: [],
  answers: {},
  setAnswer: () => {},
  counter: {
    counts: {},
    prefix: ''
  }
}

export default function DocumentElement({context,document,ordinal}:{
  context?: DocumentContext
  document: Document
  ordinal?: Ordinal
}) {
  return <DocumentContextProvider value={context || {...DEFAULT_CONTEXT}}>
      <DocumentParagraphs paragraphs={document.paragraphs} ordinal={ordinal || ''} />
  </DocumentContextProvider>
}

function DocumentParagraphs({paragraphs, ordinal}:{
  paragraphs:ParagraphMix[]
  ordinal: Ordinal
}) {
  return <>
  {paragraphs.map((paragraph,i) => <ParagraphElement key={i} paragraph={paragraph} ordinal={ordinal_pushed(ordinal,i)} />)}  
  </>
}

function ParagraphElement({paragraph, ordinal}:{
  paragraph: Paragraph|NoteRef|Document
  ordinal: Ordinal
}) {
  const context = useDocumentContext()
  if (paragraph.type === 'document') {
      return <DocumentEmbed variant={paragraph.variant} title={paragraph.title} note_id={paragraph?.note_id} ordinal={ordinal}>
          <DocumentParagraphs paragraphs={paragraph.paragraphs} ordinal={ordinal} />
      </DocumentEmbed>
  }
  if (paragraph.type === 'note-ref') {
    // caricamento asincrono
    if (context.parents.includes(paragraph.note_id)) {
      return <span className="ql-note-ref-simple">[Circular reference to note: {`${paragraph.note_id}`}]</span>
    }
    return <NoteEmbedAsync note_id={new ObjectId(paragraph.note_id)} title={paragraph.title} context={context} ordinal={ordinal}/>
  }
  if (paragraph.attribute === 'h1') return <h1 className="note"><LineElement nodes={paragraph.line.nodes} ordinal={ordinal}/></h1>
  if (paragraph.attribute === 'h2') return <h2 className="note"><LineElement nodes={paragraph.line.nodes} ordinal={ordinal}/></h2>
  
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
      return <p key={index}><LineElement nodes={item} ordinal={ordinal_pushed(ordinal,index)} /></p>
    } else {
      return <ListElement key={index} list={item} ordinal={ordinal_pushed(ordinal,index)} />
    }
  })
}

function LineElement({nodes,ordinal}:{nodes: Node[],ordinal:Ordinal}) {
  return nodes.map((node,i) => <NodeElement key={i} node={node} ordinal={ordinal_pushed(ordinal,i)} />)
}

function NodeElement({node,ordinal}:{node: Node,ordinal:Ordinal}) {
  if (typeof node === 'string') return node
  if (node && typeof node === 'object') {
    if (node.type === 'span') {
      const children = node.nodes.map((n,i) => <NodeElement key={i} node={n} ordinal={ordinal_pushed(ordinal,i)} />)
      if (node.attribute === 'bold') return <b>{children}</b>
      if (node.attribute === 'italic') return <i>{children}</i>
      if (node.attribute === 'underline') return <u>{children}</u>
      if (node.attribute === 'strike') return <s>{children}</s>
      if (node.attribute === 'error') return <span className="error">{children}</span>
      return <span>{children}</span>
    }
    if (node.type === 'formula') return <FormulaElement formula={node} />
    if (node.type === 'list') return <ListElement list={node} ordinal={ordinal} />
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

function ListElement({list,ordinal}:{list:List,ordinal:Ordinal}) {
  if (list.attribute === 'choice') return <ChoiceElement choice={list} ordinal={ordinal} />

  const children = list.lines.map((line,i) => <li key={i}>
        <LineElement nodes={line.nodes} ordinal={ordinal_pushed(ordinal,i)} />
    </li>)
  if (list.attribute === 'ordered') return <ol>{children}</ol>
  return <ul>{children}</ul>
}

function ChoiceElement({choice, ordinal}:{choice:Choice, ordinal:Ordinal}) {
  const context = useDocumentContext()
  const note_id = context?.parents.length>0 && context.parents[context.parents.length-1] || undefined
  const answer = note_id && context.answers ? context.answers[note_id] : undefined
  
  return <ul className="delta-choice-list">
    { choice.lines.map((line,i) => <li 
          key={i} 
          data-list="choice" 
          style={{...style(answer, i), padding: '1px', margin: '1px',borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '0.5em'}}
          >
        <input
          type="radio"
          style={{marginRight: '0.5em', backgroundColor: 'lightgreen'}}
          checked={answer?.answer===i || (answer === undefined && i === 0)}
          onChange={() => {
            if (!(note_id && context.setAnswer)) return;
            context.setAnswer(note_id, i)
          }}
        />
        <div>
          <LineElement nodes={line.nodes} ordinal={ordinal_pushed(ordinal,i)} />
        </div>
      </li>
    )}
  </ul>

  function style(answer: ContextAnswer|undefined, i:number) {
    if (answer?.correct_answer == null) return {} // undefined == null (!)
    if (i === answer.correct_answer) return {backgroundColor: 'lightgreen'}
    if (i === answer.answer && i !== answer?.correct_answer ) return {backgroundColor: 'lightcoral'}
    return {}
  }
}
