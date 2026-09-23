import { ObjectId } from 'mongodb'
import { Context } from '../types'
import { getNotesCollection } from '@/lib/models'
import { QuillDelta, DeltaOperation } from '@/lib/myquill/document'

/**
 * Attraversa il Delta di Quill e sostituisce gli ID dei note-ref
 * con i nuovi ID delle note ricorsivamente clonate.
 */
async function processDeltaAndCloneEmbedded(
    delta: QuillDelta,
    cloneNoteRecursive: (noteId: string | ObjectId) => Promise<ObjectId>
): Promise<QuillDelta> {
    if (!delta || !Array.isArray(delta.ops)) return delta

    const updatedOps: DeltaOperation[] = await Promise.all(
        delta.ops.map(async (op: DeltaOperation) => {
            if (op.insert && typeof op.insert === 'object' && 'note-ref' in op.insert) {
                const noteRef = op.insert['note-ref']
                const embeddedId = noteRef?.note_id

                if (embeddedId && ObjectId.isValid(embeddedId)) {
                    // Clona ricorsivamente la nota referenziata
                    const newEmbeddedId = await cloneNoteRecursive(embeddedId)

                    return {
                        ...op,
                        insert: {
                            ...op.insert,
                            'note-ref': {
                                ...noteRef,
                                note_id: newEmbeddedId.toString()
                            }
                        }
                    }
                }
            }
            return op
        })
    )

    return { ...delta, ops: updatedOps }
}

const cloneNote = async function (
    _parent: unknown,
    args: { note_id: string | ObjectId },
    context: Context
): Promise<ObjectId> {
    if (!context.user) throw new Error('Not authenticated')
    const user = context.user
    const userId = user._id.toString()
    const notesCollection = getNotesCollection(context.db)
    const rootNoteIdStr = args.note_id.toString()

    // Cache per l'intero processo di clonazione:
    // Mappa vecchio note_id (string) -> nuovo ID generato (ObjectId)
    const clonedMap = new Map<string, ObjectId>()

    /**
     * Helper ricorsivo per la clonazione delle note
     */
    const cloneNoteRecursive = async (noteIdToClone: string | ObjectId): Promise<ObjectId> => {
        const noteIdStr = noteIdToClone.toString()
        // 1. Riferimenti Circolari / Note già clonate
        if (clonedMap.has(noteIdStr)) {
            return clonedMap.get(noteIdStr)!
        }

        // 2. Lettura nota dal Database
        const originalNote = await notesCollection.findOne({ _id: new ObjectId(noteIdToClone) })
        if (!originalNote) throw new Error(`Nota ${noteIdToClone} non trovata`)

        // 3. Controllo Permessi
        let canAccess = false
        if (originalNote.author_id.toString() === userId) {
            canAccess = true
        } else if (originalNote.class_id) {
            const classDoc = await context.db.collection('classes').findOne({ _id: originalNote.class_id })
            if (classDoc) {
                const isTeacher = classDoc.teachers.some((t: any) => t.toString() === userId)
                const isOwner = classDoc.owner_id.toString() === userId
                const isStudent = classDoc.students.some((s: any) => s.toString() === userId)
                if (isTeacher || isOwner || isStudent) canAccess = true
            }
        } else if (!originalNote.private) {
            canAccess = true
        }

        if (!canAccess) {
            throw new Error(`Non hai i permessi per clonare la nota embedded (${noteIdToClone})`)
        }

        // 4. Pre-allocazione ID e inserimento in cache (interrompe riferimenti circolari)
        const newNoteId = new ObjectId()
        clonedMap.set(noteIdStr, newNoteId)

        // 5. Elaborazione ricorsiva del Delta
        const updatedDelta = await processDeltaAndCloneEmbedded(
            originalNote.delta,
            cloneNoteRecursive
        )

        // 6. Salvataggio del nuovo documento Nota
        const now = new Date()
        const contributors = Array.isArray(originalNote.contributors) ? [...originalNote.contributors] : []

        // Si appone "(copia)" soltanto sul titolo della nota principale invocata dall'utente
        const isRootNote = noteIdStr === rootNoteIdStr
        const title = isRootNote ? `${originalNote.title} (copia)` : originalNote.title

        const newNote = {
            _id: newNoteId,
            title,
            hide_title: originalNote.hide_title,
            delta: updatedDelta,
            variant: originalNote.variant,
            author_id: user._id,
            note_version_id: originalNote.note_version_id,
            contributors,
            private: originalNote.private,
            class_id: originalNote.class_id,
            created_on: now
        }

        const noteResult = await notesCollection.insertOne(newNote)
        if (!noteResult.acknowledged) {
            throw new Error(`Impossibile clonare la nota ${noteIdToClone}`)
        }

        return newNoteId
    }
    
    const rootInsertedId = await cloneNoteRecursive(rootNoteIdStr)

    return rootInsertedId
}

export default cloneNote