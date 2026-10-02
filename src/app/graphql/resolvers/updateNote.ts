import { ObjectId } from 'mongodb'

import { Context } from '../types'
import { getNotesCollection, NOTE_PIPELINE, getClassesCollection } from '@/lib/models'
import { QuillDelta, DeltaOperation } from '@/lib/myquill/document'

/**
 * Propaga ricorsivamente il class_id alle sotto-note citate nei note-ref del Delta
 * SOLO SE la sotto-nota condivideva la stessa classe precedente della nota padre.
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
                // Previene riferimenti circolari / ricorsione infinita
                if (visited.has(embeddedId)) continue
                visited.add(embeddedId)

                const childObjectId = new ObjectId(embeddedId)
                const childNote = await notesCollection.findOne({ _id: childObjectId })

                if (childNote) {
                    const childClassStr = childNote.class_id ? childNote.class_id.toString() : null

                    // SINCRONIZZAZIONE CONDIZIONALE:
                    // Aggiorna solo le sotto-note che appartenevano alla vecchia classe del padre
                    if (childClassStr === oldClassIdStr) {
                        await notesCollection.updateOne(
                            { _id: childObjectId },
                            { $set: { class_id: targetClassId } }
                        )

                        // Propagazione ricorsiva ai sotto-livelli
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

const updateNote = async function (
    _parent: unknown,
    args: any,
    context: Context
): Promise<any> {
    const { _id, title, hide_title, delta, private: isPrivate, variant, class_id } = args
    const collection = getNotesCollection(context.db)
    const note = await collection.findOne({ _id: new ObjectId(_id) })
    if (!note) throw new Error('Note not found')
    
    if (!context.user) throw new Error('Not authenticated')
    if (!note.author_id.equals(new ObjectId(context.user._id))) throw new Error('Not authorized')
    
    const update: any = {}
    if (typeof title === 'string') update.title = title
    if (typeof hide_title === 'boolean') update.hide_title = hide_title
    if (delta) update.delta = delta as QuillDelta
    if (typeof isPrivate === 'boolean') update.private = isPrivate
    if (typeof variant === 'string') update.variant = variant
    
    // Salva la classe attuale prima dell'aggiornamento per il confronto condizionale
    const oldClassIdStr = note.class_id ? note.class_id.toString() : null
    let targetClassIdForChildren: ObjectId | null | undefined = undefined

    // Gestione class_id
    if (class_id !== undefined) {
        if (class_id === null) {
            update.class_id = null
            targetClassIdForChildren = null
        } else {
            const classId = new ObjectId(class_id)
            
            const classDoc = await getClassesCollection(context.db).findOne({ _id: classId })
            if (!classDoc) {
                throw new Error('Classe non trovata')
            }
            
            const userId = new ObjectId(context.user._id)
            const isOwner = classDoc.owner_id.equals(userId)
            const isTeacher = classDoc.teachers.some((teacherId: ObjectId) => teacherId.equals(userId))
            
            if (!isOwner && !isTeacher) {
                throw new Error('Solo il proprietario o un insegnante possono spostare note in questa classe')
            }
            
            update.class_id = classId
            targetClassIdForChildren = classId
        }
    }
    
    if (Object.keys(update).length === 0) throw new Error('No fields to update')
    
    // Aggiorna i contributors
    const now = new Date()
    const userId = new ObjectId(context.user._id)
    let contributors = Array.isArray(note.contributors) ? [...note.contributors] : []
    let found = false
    contributors = contributors.map(c => {
        if (c.user_id.equals(userId)) {
            found = true
            return {
                ...c,
                contribution_count: (c.contribution_count || 0) + 1,
                last_contribution: now
            }
        }
        return c
    })
    if (!found) {
        contributors.push({
            user_id: userId,
            contribution_count: 1,
            first_contribution: now,
            last_contribution: now
        })
    }
    update.contributors = contributors

    await collection.updateOne({ _id: new ObjectId(_id) }, { $set: update })
    
    // Se il class_id è cambiato, avvia la propagazione condizionale
    if (targetClassIdForChildren !== undefined && oldClassIdStr !== (targetClassIdForChildren ? targetClassIdForChildren.toString() : null)) {
        const deltaToUse = (delta as QuillDelta) || note.delta
        await propagateClassToEmbedded(context.db, deltaToUse, oldClassIdStr, targetClassIdForChildren)
    }

    const notes = await collection.aggregate<any>([
        { $match: { _id: new ObjectId(_id) } },
        ...NOTE_PIPELINE
    ]).toArray()
    
    return notes[0] || null
}

updateNote.displayName = 'updateNote'
export default updateNote