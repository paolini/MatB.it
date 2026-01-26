import { Document, ParagraphMix, Line, Node } from './myquill/document'

export function documentToLatex(doc: Document): string {
    const header = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{hyperref}
\\usepackage{ulem}
\\usepackage{xcolor}

\\title{${escapeLatex(doc.title || 'Note')}}
\\date{}

\\begin{document}

\\maketitle

`
    const footer = `
\\end{document}
`
    return header + doc.paragraphs.map(p => paragraphToLatex(p)).join('\n\n') + footer
}

function paragraphToLatex(p: ParagraphMix): string {
    if (p.type === 'document') {
        // Flatten nested documents for LaTeX export for simplicity
        return p.paragraphs.map(paragraphToLatex).join('\n\n')
    }
    if (p.type === 'note-ref') {
        return `\\paragraph{${escapeLatex(p.title || 'Ref')}}`
    }
    if (p.type === 'paragraph') {
        const text = lineToLatex(p.line)
        if (p.attribute === 'h1') return `\\section*{${text}}`
        if (p.attribute === 'h2') return `\\subsection*{${text}}`
        // Standard paragraph
        return text
    }
    return ''
}

function lineToLatex(line: Line): string {
    return line.nodes.map(nodeToLatex).join('')
}

function nodeToLatex(node: Node): string {
    if (typeof node === 'string') return escapeLatex(node)
    if (node.type === 'formula') {
        if (node.displaystyle) return `\n\\[ ${node.value} \\]\n`
        return `$${node.value}$`
    }
    if (node.type === 'span') {
        const content = node.nodes.map(nodeToLatex).join('')
        if (node.attribute === 'bold') return `\\textbf{${content}}`
        if (node.attribute === 'italic') return `\\textit{${content}}`
        if (node.attribute === 'underline') return `\\underline{${content}}`
        if (node.attribute === 'strike') return `\\sout{${content}}`
        if (node.attribute === 'code') return `\\texttt{${content}}`
        if (node.attribute === 'link') return `\\href{${(node as any).value}}{${content}}`
        return content
    }
    if (node.type === 'list') {
        const env = node.attribute === 'ordered' ? 'enumerate' : 'itemize'
        const items = node.lines.map(line => `  \\item ${lineToLatex(line)}`).join('\n')
        return `\\begin{${env}}\n${items}\n\\end{${env}}`
    }
    return ''
}

function escapeLatex(text: string): string {
    return text
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\$/g, '\\$')
        .replace(/&/g, '\\&')
        .replace(/#/g, '\\#')
        .replace(/\^/g, '\\textasciicircum{}')
        .replace(/_/g, '\\_')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/%/g, '\\%')
}

export function documentToMarkdown(doc: Document): string {
    const title = doc.title ? `# ${doc.title}\n\n` : ''
    return title + doc.paragraphs.map(p => paragraphToMarkdown(p)).join('\n\n')
}

function paragraphToMarkdown(p: ParagraphMix): string {
    if (p.type === 'document') {
        return p.paragraphs.map(paragraphToMarkdown).join('\n\n')
    }
    if (p.type === 'note-ref') {
        return `**Note Reference: ${p.title || ''}**`
    }
    if (p.type === 'paragraph') {
        const text = lineToMarkdown(p.line)
        if (p.attribute === 'h1') return `# ${text}`
        if (p.attribute === 'h2') return `## ${text}`
        return text
    }
    return ''
}

function lineToMarkdown(line: Line): string {
    return line.nodes.map(nodeToMarkdown).join('')
}

function nodeToMarkdown(node: Node): string {
    if (typeof node === 'string') return node
    if (node.type === 'formula') {
        if (node.displaystyle) return `\n$$\n${node.value}\n$$\n`
        return `$${node.value}$`
    }
    if (node.type === 'span') {
        const content = node.nodes.map(nodeToMarkdown).join('')
        if (node.attribute === 'bold') return `**${content}**`
        if (node.attribute === 'italic') return `*${content}*`
        if (node.attribute === 'strike') return `~~${content}~~`
        if (node.attribute === 'code') return `\`${content}\``
        if (node.attribute === 'link') return `[${content}](${(node as any).value})`
        return content
    }
    if (node.type === 'list') {
        const items = node.lines.map((line, i) => {
            const prefix = node.attribute === 'ordered' ? `${i + 1}. ` : '- '
            return `${prefix}${lineToMarkdown(line)}`
        }).join('\n')
        return '\n' + items + '\n'
    }
    return ''
}
