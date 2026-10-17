import { execFileSync } from 'node:child_process'

const cases = [
    { name: 'ordinary titles', title: 'Teorema di prova', customTitle: null },
    {
        name: 'markup in the original title',
        title: 'Teorema <em data-injected="original-title">di prova</em> & "citazione"',
        customTitle: null,
    },
    {
        name: 'quotes in the custom title',
        title: 'Teorema di prova',
        customTitle: 'Titolo " autofocus data-injected="custom-title" data-rest="',
    },
]

// Exercise the application's real configuration panel in a DOM parser.
// Keep script execution disabled: structural HTML injection is enough to
// reproduce the bug, without running event handlers from title strings.
const panelProbe = `
import { JSDOM } from 'jsdom';
import { NoteRefBlot } from './src/lib/myquill/noteref.js';
const cases = ${JSON.stringify(cases)};
const results = cases.map(testCase => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    try {
        const node = document.createElement('span');
        if (testCase.customTitle !== null) node.setAttribute('data-custom-title', testCase.customTitle);
        document.body.appendChild(node);
        NoteRefBlot.showConfigMenu(node, { _id: '000000000000000000000001', title: testCase.title });
        const panel = document.querySelector('.note-ref-config-panel');
        const title = panel.querySelector('#original-title-link');
        const input = panel.querySelector('#custom-title-input');
        return {
            title: title.textContent,
            titleChildren: title.children.length,
            customTitle: input.value,
            autofocus: input.hasAttribute('autofocus'),
            injectedNodes: panel.querySelectorAll('[data-injected]').length,
        };
    } finally {
        dom.window.close();
        delete globalThis.window;
        delete globalThis.document;
    }
});
console.log(JSON.stringify(results));
`

describe('Note reference configuration title safety (issue #97)', () => {
    let results: {
        title: string; titleChildren: number; customTitle: string; autofocus: boolean; injectedNodes: number;
    }[]

    beforeAll(() => {
        results = JSON.parse(execFileSync(process.execPath, ['--input-type=module'], {
            cwd: process.cwd(), input: panelProbe, encoding: 'utf8',
        }))
    })

    it.each(cases.map((testCase, index) => ({ ...testCase, index })))(
        'renders $name literally without adding HTML elements or attributes',
        ({ index, title, customTitle }) => {
            expect(results[index]).toEqual({
                title, titleChildren: 0, customTitle: customTitle ?? '', autofocus: false, injectedNodes: 0,
            })
        },
    )
})
