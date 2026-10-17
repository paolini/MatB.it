/** @jest-environment ./src/lib/__tests__/helpers/domEnvironment.cjs */

import { act, createElement } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { ApolloClient, ApolloLink, ApolloProvider, InMemoryCache, Observable } from '@apollo/client'
import NoteReferenceModal from '@/components/NoteReferenceModal'

describe('Note reference modal reopening (issue #98)', () => {
    let container: HTMLDivElement
    let root: Root
    let client: ApolloClient<unknown>
    let selected: jest.Mock
    let closed: jest.Mock
    const noteId = '000000000000000000000001'

    beforeEach(() => {
        jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] })
        jest.spyOn(console, 'log').mockImplementation(() => {})
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
        selected = jest.fn()
        closed = jest.fn()
        client = new ApolloClient({
            cache: new InMemoryCache(),
            link: new ApolloLink(operation => new Observable(observer => {
                observer.next({ data: operation.operationName === 'NewNote' ? { newNote: noteId } : {
                    notes: [{ __typename: 'Note', _id: noteId, title: 'Lemma di prova', variant: 'lemma',
                        private: false, author: { __typename: 'User', name: 'Autore' } }],
                } })
                observer.complete()
            })),
        })
    })

    afterEach(async () => {
        await act(async () => root.unmount())
        client.stop()
        container.remove()
        await act(async () => jest.runOnlyPendingTimers())
        jest.useRealTimers()
        jest.restoreAllMocks()
    })

    async function render(isOpen: boolean, initialVariant = 'default') {
        await act(async () => {
            root.render(createElement(ApolloProvider, {
                client,
                children: createElement(NoteReferenceModal, {
                    isOpen, initialVariant, onNoteSelected: selected, onClose: closed,
                }),
            }))
        })
    }

    function input(placeholder: string): HTMLInputElement {
        const element = container.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`)
        if (!element) throw new Error(`Input not found: ${placeholder}`)
        return element
    }

    async function fill(placeholder: string, value: string) {
        const element = input(placeholder)
        await act(async () => {
            // Bypass React's value tracker to simulate a real user input event.
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value)
            element.dispatchEvent(new Event('input', { bubbles: true }))
        })
        expect(element.value).toBe(value)
    }

    async function click(label: string) {
        const button = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.trim() === label)
        if (!button) throw new Error(`Button not found: ${label}`)
        await act(async () => button.click())
    }

    async function createNote() {
        await render(true, 'lemma')
        await fill('Titolo della nota', 'Titolo precedente')
        await act(async () => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click())
        await click('Crea e Seleziona')
        expect(selected).toHaveBeenCalledWith(noteId)
        // Match the parent editor: hide the mounted modal after selection.
        await render(false, 'lemma')
    }

    it('clears the previous search after selecting an existing note', async () => {
        await render(true)
        await fill('Cerca note...', 'Lemma')
        await click('Seleziona →')
        expect(selected).toHaveBeenCalledWith(noteId)
        await render(false)
        await render(true)
        expect(input('Cerca note...').value).toBe('')
    })

    it('opens the existing-note tab on generic reopening after creation', async () => {
        await createNote()
        await render(true)
        expect(container.querySelector('input[placeholder="Cerca note..."]')).not.toBeNull()
        expect(container.querySelector('input[placeholder="Titolo della nota"]')).toBeNull()
    })

    it('clears the title and privacy when reopening the same environment after creation', async () => {
        await createNote()
        await render(true, 'lemma')
        expect(input('Titolo della nota').value).toBe('')
        expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(false)
        expect(container.querySelector('select')!.value).toBe('lemma')
    })

    it('resets cancelled drafts and still prefills the newly requested environment', async () => {
        await render(true, 'lemma')
        await fill('Titolo della nota', 'Bozza annullata')
        await act(async () => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click())
        await click('Annulla')
        expect(closed).toHaveBeenCalledTimes(1)
        await render(false, 'lemma')
        await render(true)
        expect(input('Cerca note...').value).toBe('')
        await render(false)
        await render(true, 'theorem')
        expect(input('Titolo della nota').value).toBe('')
        expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(false)
        expect(container.querySelector('select')!.value).toBe('theorem')
    })

    it('clears validation errors when the parent hides and reopens the modal', async () => {
        await render(true, 'lemma')
        await click('Crea e Seleziona')
        expect(container.textContent).toContain('Il titolo è obbligatorio')
        expect(selected).not.toHaveBeenCalled()
        await render(false, 'lemma')
        await render(true, 'lemma')
        expect(container.textContent).not.toContain('Il titolo è obbligatorio')
        expect(input('Titolo della nota').value).toBe('')
    })
})
