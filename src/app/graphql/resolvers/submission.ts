import { ObjectId } from 'mongodb'
import { UserInputError, ForbiddenError, AuthenticationError } from 'apollo-server-errors'

import { Context } from '../types'
import { Submission } from '../generated'
import { getNotesCollection, getSubmissionsCollection, SUBMISSION_PIPELINE } from '@/lib/models'
import { document_from_note, Document, Paragraph, NoteRef, Node, NoteData } from '@/lib/myquill/document'
import { MongoSubmission, MongoAnswer } from '@/lib/models'

const submission = async function (_parent: unknown, {_id}: { _id: ObjectId }, context: Context): Promise<Submission | null> {
    const user = context.user
    const collection = getSubmissionsCollection(context.db)
    const notesCollection = getNotesCollection(context.db)
    
    const items = await collection.aggregate<Submission & MongoSubmission>([
        { $match: { _id } },
        ...SUBMISSION_PIPELINE,
    ]).toArray()

    if (items.length === 0) throw new UserInputError('Submission not found')
    const submission = items[0]
    const test = submission.test

    if (!user) throw new AuthenticationError('Not authenticated')
    if (!(test.author_id.equals(user._id)) 
        && !(submission.author_id.equals(user._id))) {
        throw new ForbiddenError('Not authorized to view this submission')
    }

    const note = await note_loader(test.note_id)
    if (!note) throw new UserInputError('Note not found')

    const options = {
        note_loader,
        note_id: test.note_id.toString()
    }
        
    const document = await document_from_note(note, options)
    const answers = submission.answers || []
    const answers_must_be_saved = shuffle_and_insert_answers(document, answers)
    const show_correct_answers = !!submission.completed_on 

    if (answers_must_be_saved) await collection.updateOne({_id: submission._id}, { $set: { answers } })

    return {
        ...submission,
        answers: answers.map((a:MongoAnswer) => {
            if (a.permutation && typeof a.answer === 'number') {
                const inv = inverse_permutation(a.permutation)
                return {
                    note_id: a.note_id,
                    answer: a.answer,
                    correct_answer: show_correct_answers
                        ? inv[0] // assuming the first permuted option is the correct one
                        : null,
                } 
            } else {
                return {
                    note_id: a.note_id,
                    answer: a.answer || null,
                    correct_answer: null,
                }
            }
        }),
        document,
    }

    async function note_loader(note_id: string): Promise<NoteData|null> {
        const note = await notesCollection.findOne({ _id: new ObjectId(note_id) })
        return note ? {
            delta: note.delta,
            variant: note.variant || null,
            title: note.title,
            _id: new ObjectId(note_id)
        } : null
    }
}

export default submission

function shuffle_and_insert_answers(document: Document, answers: MongoAnswer[]) {
    let answersUpdated = false
    const map = Object.fromEntries(answers.map(answer => [answer.note_id.toString(), answer]))

    recurse_document(document)
    return answersUpdated

    function recurse_document(document: Document) {
        const note_id = document.note_id
        if (!note_id) throw new Error("invalid document: no note_id")
        document.paragraphs.forEach((p: Paragraph|NoteRef|Document) => {
            if (p.type === 'document') {
                    recurse_document(p)
            } else if (p.type === 'paragraph') {
                p.line.nodes.forEach((node:Node) => {
                    if (typeof node === 'string') return
                    if (node.type === 'list' && node.attribute === 'choice') {
                        const n = node.lines.length
                        const answer = get_choice_answer(n, note_id)
                        if (!(answer.permutation && answer.permutation.length === node.lines.length)) {
                            throw new Error(`invalid permutation in question ${note_id}`)
                        }
                        node.lines = answer.permutation.map(i => node.lines[i])
                        if (answer.answer) {
                            const inv = inverse_permutation(answer.permutation)
                            node.selected = inv[answer.answer]
                        }
                    }
                })
            }
        })
    }

    function get_choice_answer(n: number, note_id: string): MongoAnswer {
        let answer = map[note_id]
        if (answer) return answer
        answer = {
            note_id: new ObjectId(note_id),
            permutation: shuffle([...Array(n).keys()]),
        }
        answers.push(answer)
        map[note_id] = answer
        answersUpdated = true
        return answer
    }
}

function shuffle(array: number[]) {
  let currentIndex = array.length;
  while (currentIndex != 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array
}

function inverse_permutation(array: number[]) {
  const inv = new Array(array.length)
  for (let i = 0; i < array.length; i++) {
    inv[array[i]] = i
  }
  return inv
}


/*
 toglie le permutazioni dal documento
*/
/*
function strip_answers(document: Document) {
    document.paragraphs.forEach(paragraph => {
        if (paragraph.type === 'note-ref') {
            if (paragraph.document) strip_answers(paragraph.document)
        } else {
            paragraph.line.nodes.forEach(strip_node)
        }
    })
}

function strip_node(node: Node) {
    if (typeof node === 'string') return
    else if (node.type === 'span') node.nodes.forEach(strip_node)
    else if (node.type === 'list') {
        node.
    }
} 
    */