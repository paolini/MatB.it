import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { getTestsCollection, TEST_PIPELINE, getClassesCollection, getNotesCollection } from '@/lib/models'
import { QuillDelta, DeltaOperation } from '@/lib/myquill/document'

/**
 * Propaga ricorsivamente il class_id alle sotto-note/domande (nella collezione notes)
 * citate nei note-ref del Delta del test, SOLO SE la sotto-nota
 * condivideva la stessa classe precedente del test padre.
 */
async function propagateClassToEmbedded(
    db: any,
    delta: QuillDelta | undefined,
    oldClassIdStr: string | null,
    targetClassId: ObjectId | null,
    visited = new Set<string>()
): Promise<void> {
    if (!delta || !Array.isArray(delta.ops)) return

    const notesCollection = getNotesCollection(db)

    for (const op of delta.ops as DeltaOperation[]) {
        if (op.insert && typeof op.insert === 'object' && 'note-ref' in op.insert) {
            const noteRef = op.insert['note-ref']
            const embeddedId = noteRef?.note_id

            if (embeddedId && ObjectId.isValid(embeddedId)) {
                if (visited.has(embeddedId)) continue
                visited.add(embeddedId)

                const childObjectId = new ObjectId(embeddedId)
                const childNote = await notesCollection.findOne({ _id: childObjectId })

                if (childNote) {
                    const childClassStr = childNote.class_id ? childNote.class_id.toString() : null

                    // Sincronizzazione condizionale
                    if (childClassStr === oldClassIdStr) {
                        await notesCollection.updateOne(
                            { _id: childObjectId },
                            { $set: { class_id: targetClassId } }
                        )

                        // Ricorsione per eventuali sotto-livelli annidati
                        await propagateClassToEmbedded(
                            db,
                            childNote.delta,
                            oldClassIdStr,
                            targetClassId,
                            visited
                        )
                    }
                }
            }
        }
    }
}

const updateTest = async function (
    _parent: unknown,
    args: any, // Usando any per evitare problemi con i tipi generati
    context: Context
): Promise<any> {
    const { _id, title, open_on, close_on, private: isPrivate, class_id } = args
    const collection = getTestsCollection(context.db)
    const test = await collection.findOne({ _id: new ObjectId(_id) })
    if (!test) throw new Error('Test not found')

    if (!context.user) throw new Error('Not authenticated')

    if (!test.author_id.equals(new ObjectId(context.user._id))) throw new Error('Not authorized')

    const update: any = {}

    if (typeof title === 'string') update.title = title
    if (open_on !== undefined) update.open_on = open_on
    if (close_on !== undefined) update.close_on = close_on
    if (typeof isPrivate === 'boolean') update.private = isPrivate

    // Memorizza la classe precedente del test per il confronto condizionale
    const oldClassIdStr = test.class_id ? test.class_id.toString() : null
    let targetClassIdForChildren: ObjectId | null | undefined = undefined

    // Gestione class_id
    if (class_id !== undefined) {
        if (class_id === null) {
            // Rimuovi dalla classe
            update.class_id = null
            targetClassIdForChildren = null
        } else {
            // Assegna a una classe
            const classId = new ObjectId(class_id)

            // Verifica che la classe esista e che l'utente abbia i permessi
            const classDoc = await getClassesCollection(context.db).findOne({ _id: classId })
            if (!classDoc) {
                throw new Error('Classe non trovata')
            }

            const userId = new ObjectId(context.user._id)
            const isOwner = classDoc.owner_id.equals(userId)
            const isTeacher = classDoc.teachers.some((teacherId: ObjectId) => teacherId.equals(userId))

            if (!isOwner && !isTeacher) {
                throw new Error('Solo il proprietario o un insegnante possono spostare test in questa classe')
            }

            update.class_id = classId
            targetClassIdForChildren = classId
        }
    }

    if (Object.keys(update).length === 0) throw new Error('No fields to update')

    await collection.updateOne({ _id: new ObjectId(_id) }, { $set: update })

    // Se la classe del test è cambiata, avvia la propagazione condizionale alle domande/sotto-note
    if (
        targetClassIdForChildren !== undefined &&
        oldClassIdStr !== (targetClassIdForChildren ? targetClassIdForChildren.toString() : null)
    ) {
        await propagateClassToEmbedded(context.db, (test as any).delta, oldClassIdStr, targetClassIdForChildren)
    }

    // Restituisce il test aggiornato
    const tests = await collection.aggregate<any>([
        { $match: { _id: new ObjectId(_id) } },
        ...TEST_PIPELINE
    ]).toArray()

    return tests[0] || null
}

updateTest.displayName = 'updateTest'
export default updateTest