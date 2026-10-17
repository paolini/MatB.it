import type { Range } from 'quill-next'

type EditorSelection = { getSelection(focus?: boolean): Range | null }

export function getNoteReferenceRange(editor: EditorSelection | null, previous: Range | null): Range | null {
    // Quill restores its last editor selection when focus=true, including when
    // the visible Snow picker has already taken keyboard focus.
    const range = editor?.getSelection(true) ?? previous
    return range ? { index: range.index, length: range.length } : null
}

export function noteReferenceToolbarHandlers(openModal: (variant?: string) => void) {
    return {
        'note-ref': () => openModal('default'),
        environment: (variant: string | false) => {
            if (variant) openModal(variant)
        },
    }
}
