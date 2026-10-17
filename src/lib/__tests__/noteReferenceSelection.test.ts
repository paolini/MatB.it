import { getNoteReferenceRange, noteReferenceToolbarHandlers } from '../myquill/noteReferenceSelection'

describe('Note reference selection (issue #94)', () => {
    it('restores editor focus before saving the insertion point from the environment picker', () => {
        const cursor = { index: 6, length: 0 }
        const editor = { getSelection: jest.fn((focus?: boolean) => focus ? cursor : null) }
        let saved = null as ReturnType<typeof getNoteReferenceRange>
        const openModal = jest.fn(() => { saved = getNoteReferenceRange(editor, saved) })
        const handlers = noteReferenceToolbarHandlers(openModal)

        handlers.environment('lemma')

        expect(editor.getSelection).toHaveBeenCalledWith(true)
        expect(openModal).toHaveBeenCalledWith('lemma')
        expect(saved).toEqual({ index: 6, length: 0 })
        // Later selection changes must not mutate the modal's snapshot.
        cursor.index = 20
        expect(saved?.index).toBe(6)
    })

    it('keeps a saved selection if focus restoration yields no selection', () => {
        const previous = { index: 6, length: 3 }
        expect(getNoteReferenceRange({ getSelection: () => null }, previous)).toEqual(previous)
        expect(getNoteReferenceRange(null, null)).toBeNull()
    })

    it('captures a new cursor on reopening instead of reusing the previous position', () => {
        const editor = { getSelection: () => ({ index: 13, length: 0 }) }
        expect(getNoteReferenceRange(editor, { index: 6, length: 0 })).toEqual({ index: 13, length: 0 })
    })

    it('ignores the empty environment value and opens generic references normally', () => {
        const openModal = jest.fn()
        const handlers = noteReferenceToolbarHandlers(openModal)
        handlers.environment(false)
        handlers.environment('')
        expect(openModal).not.toHaveBeenCalled()
        handlers['note-ref']()
        expect(openModal).toHaveBeenCalledWith('default')
    })
})
