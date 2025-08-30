import { ObjectId } from 'bson'
import { AttributeMap } from './myquill'

// Tipi per Quill Delta
export type DeltaInsert = string | {
  formula: {
    value: string
    displaystyle?: boolean
  }
} | {
  "note-ref": {
    note_id: string
    title?: string
  }
}

export type DeltaOperation = {
  insert: DeltaInsert
  attributes?: AttributeMap
}

export type QuillDelta = {
  ops: DeltaOperation[]
}


export type Formula = {
  type: "formula"
  value: string
  displaystyle?: boolean
}

export type Node = string | Formula | Span | List

export type Span = {
  type: "span"
  attribute: "bold" | "italic" | "underline" | "strike" | "error"
  nodes: Node[]
} | {
  type: "span"
  attribute: "code" | "color" | "background" | "link"
  nodes: Node[]
  value: string
}

export type Line = {
  type: "line"
  nodes: Node[]
}

export type List = {
  type: "list"
  attribute: "bullet" | "ordered"
  lines: Line[] 
} | Choice

export type Choice = {
  type: "list"
  attribute: "choice"
  lines: Line[]
  selected?: number // 0-index of selected choice, undefined if not selected
}

export type Paragraph = {
  type: "paragraph"
  attribute: "" | "h1" | "h2"
  line: Line
}

export interface NoteData {
  title: string
  variant?: string | null
  delta: QuillDelta
  _id: ObjectId
}

export type Options = {
  note_loader?: (note_id: string) => Promise<NoteData|null>
  variant?: string
  title?: string
  note_id?: string
}

export type NoteRef = {
  type: "note-ref"
  note_id: string
  title?: string
}

export type Document = {
  type: "document"
  paragraphs: (Paragraph|NoteRef|Document)[]
  variant?: string
  title?: string
  note_id?: string
}

export type Context = {
  parents: string[]
  options: Options
}

function last_paragraph(document: Document): Paragraph {
  const l = document.paragraphs.length
  if (l>0) {
    const last = document.paragraphs[l - 1]
    if (last.type === "paragraph") return last
  } 
  const paragraph: Paragraph = { type: "paragraph", attribute: "", line: {type: "line", nodes: []} }
  document.paragraphs.push(paragraph)
  return paragraph
}

function push_node(nodes: Node[], node: Node) {
  const l = nodes.length
  if (l>0) {
    // check if possible to merge with last node
    const lastNode = nodes[l - 1]
    if (typeof node === 'string' && typeof lastNode === 'string') {
        nodes[l - 1] = lastNode + node
        return
    } 
    if (typeof node === 'object' && node.type === 'span' && 
        typeof lastNode === 'object' && lastNode.type === 'span' && 
        lastNode.attribute === node.attribute) {
          node.nodes.forEach(n => {
            push_node(lastNode.nodes, n)
          })
      }
  }
  nodes.push(node)
}

function decorate_node(node:Node, attributes: AttributeMap | undefined): Node {
  if (attributes === undefined) return node
  if (attributes.bold) node = { type: "span", attribute: "bold", nodes: [node] }
  if (attributes.italic) node = { type: "span", attribute: "italic", nodes: [node] }
  if (attributes.underline) node = { type: "span", attribute: "underline", nodes: [node] }
  if (attributes.strike) node = { type: "span", attribute: "strike", nodes: [node] }
  if (attributes.code) node = { type: "span", attribute: "code", nodes: [node], value: attributes.code as string }
  return node
}

function push_text(line: Line, text: string, attributes: AttributeMap | undefined) {
  if (text === '') return
  push_node(line.nodes,decorate_node(text, attributes))
}

function push_newline(document: Document, given_line: Line, attributes: AttributeMap | undefined) {
  const new_line: Line = { type:"line", nodes: given_line.nodes }
  given_line.nodes = []

  const listType: "" | "bullet" | "ordered" | "choice" 
    = attributes && typeof attributes.list === 'string' && (attributes.list as 'bullet' | 'ordered' | 'choice')
    || attributes && typeof attributes.list === 'object' && attributes.list && 'list' in attributes.list && (attributes.list.list as 'choice')
    || ''
  if (listType) {
    // TODO: take into account the number of '\t' to define depth
    // add list line
    const paragraph = last_paragraph(document)
    const line = paragraph.line
    const nodes = line.nodes
    const l = nodes.length
    if (l>0) {
      const node = nodes[l-1]
      if (typeof node === 'object' && node.type === 'list' && node.attribute === listType) {
        // add line to existing list with same listType
        node.lines.push(new_line)
        return
      }
    }
    // add new list to last paragraph
    line.nodes.push({type:'list',attribute:listType,lines:[new_line]})
    return
  } else {
    // add paragraph to document
    let attribute: '' | 'h1' | 'h2' = ''
    if (attributes) {
      if (attributes.header === 1) attribute = 'h1'
      if (attributes.header === 2) attribute = 'h2'
    }
    document.paragraphs.push({type: "paragraph", attribute: attribute, line: new_line})
  }
}

function push_error(line: Line, error: string) {
  const node: Node = { type: "span", attribute: "error", nodes: [error] }
  push_node(line.nodes, node)
}

function push_formula(line: Line, formula: object, attributes: AttributeMap | undefined) {
  if (formula && 'value' in formula && typeof formula.value === 'string') {
    const value = formula.value
    let displaystyle = false
    if ('displaystyle' in formula && typeof formula.displaystyle === 'boolean') {
      displaystyle = formula.displaystyle 
    }
    const node: Formula = {type:"formula", value }
    if (displaystyle) node.displaystyle = true
    push_node(line.nodes, decorate_node(node, attributes))
  } else {
    push_error(line, `invalid formula ${JSON.stringify(formula)}`)
  }
}

function push_error_paragraph(document: Document, error: string) {
  const line: Line = { type: 'line', nodes: [] }
  push_error(line, error)
  document.paragraphs.push({type: "paragraph", attribute: "", line})
}

async function push_note_ref(context: Context, document: Document, note_ref: object, _attributes: AttributeMap | undefined) {
  if (note_ref && 'note_id' in note_ref && typeof note_ref.note_id === 'string') {
    const note_loader = context.options.note_loader
    const note_id = note_ref.note_id
    if (note_loader) {
      if (context.parents.includes(note_id)) {
          push_error_paragraph(document, `circular reference ${note_id}`)
          return
      }
      const data = await note_loader(note_id)
      if (data) {
        const sub_document = await document_from_note_recurse({
          ...context, 
          parents: [...context.parents, note_id]
        }, data)
        document.paragraphs.push(sub_document)
      }
    } else {
      const paragraph: NoteRef = {
          type: "note-ref",
          note_id,
        }
      if ('title' in note_ref && typeof note_ref.title === 'string') {
        paragraph.title = note_ref.title
      }
      document.paragraphs.push(paragraph)    
    }
  } else {
    push_error_paragraph(document, `invalid note reference ${JSON.stringify(note_ref)}`)
  }
}

export async function document_from_note(note: NoteData, options?: Options): Promise<Document> {
  const context: Context = {
    options: options || {},
    parents: []
  }
  return await document_from_note_recurse(context, note)
}
  
async function document_from_note_recurse(context: Context, note: NoteData): Promise<Document> {
  const document: Document = {
    type: "document",
    paragraphs: [],
    title: note.title,
    variant: note.variant||undefined,
    note_id: note._id.toString()
  }
  const line: Line = { type: 'line', nodes: []}
  const delta = note.delta

  for (const op of delta.ops) {
    const insert = op.insert
//    console.log(JSON.stringify({insert}))
    if (typeof insert === 'string') {
      const chunks = insert.split('\n')
      for (let i=0; i<chunks.length; i++) {
        if (i>0) push_newline(document, line, op.attributes as AttributeMap | undefined)
        push_text(line, chunks[i], op.attributes as AttributeMap | undefined)
      }
    } else if (typeof insert === 'object') {
      if (insert && 'formula' in insert) {
        push_formula(line, (insert as Record<string, unknown>).formula as object, op.attributes as AttributeMap | undefined)        
      } else if (insert && 'note-ref' in insert) {
        if (line.nodes.length > 0) push_newline(document, line, {})
        await push_note_ref(context, document, (insert as Record<string, unknown>)["note-ref"] as object, op.attributes as AttributeMap | undefined)
      } else {
        push_error(line, `invalid insert object ${JSON.stringify(insert)}`)
      }
    }
//    console.log(JSON.stringify({document,line}))
  }
  if (line.nodes.length > 0) push_newline(document, line, {})
  return document
}

