import { execFileSync } from 'node:child_process'

type NoteReference = { note_id: string; title?: string }
type Insert = { insert: { 'note-ref': NoteReference } }

// Run the installed ESM clipboard matcher and application blot in native Node,
// without Jest's CommonJS transformation or browser/database dependencies.
const clipboardProbe = `
import { NoteRefBlot } from './src/lib/myquill/noteref.js';
import { matchBlot } from './node_modules/quill-next/dist/modules/clipboard.js';
import Delta from 'quill-delta-es';

const id = '000000000000000000000001';
const results = [null, 'Lemma "speciale" <A & B>'].map(title => {
    const attributes = { 'data-note-id': id, 'data-custom-title': title };
    const node = { getAttribute: name => attributes[name] ?? null };
    const scroll = { query: () => NoteRefBlot };
    return {
        copied: NoteRefBlot.prototype.value.call({ domNode: node }),
        pasted: matchBlot(node, new Delta(), scroll).ops,
    };
});
console.log(JSON.stringify(results));
`

describe('Note reference clipboard (issue #95)', () => {
    let results: { copied: Insert['insert']; pasted: Insert[] }[]

    beforeAll(() => {
        results = JSON.parse(execFileSync(process.execPath, ['--input-type=module'], {
            cwd: process.cwd(),
            input: clipboardProbe,
            encoding: 'utf8',
        }))
    })

    it.each([
        ['without a custom title', 0, { note_id: '000000000000000000000001' }],
        ['with a custom title', 1, { note_id: '000000000000000000000001', title: 'Lemma "speciale" <A & B>' }],
    ] as const)('preserves the reference when pasted %s', (_description, index, reference) => {
        expect(results[index].copied).toEqual({ 'note-ref': reference })
        expect(results[index].pasted).toEqual([{ insert: { 'note-ref': reference } }])
    })
})
