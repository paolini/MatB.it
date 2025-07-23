import MyQuill from 'quill-next'
import MyQuillEditor from 'quill-next-react'

import { MyFormula, FormulaEditorModule } from './formula.js'
import { NoteRefBlot } from './noteref.js'

import { ChoiceListItem } from './choice-list.js'

export { Delta } from 'quill-next'

MyQuill.register('formats/formula', MyFormula, true);
MyQuill.register('modules/formulaEditor', FormulaEditorModule);

MyQuill.register('formats/note-ref', NoteRefBlot, true);

// Registra il nuovo blot per le liste multiple choice
MyQuill.register('formats/list/item', ChoiceListItem, true);

export const Quill = MyQuill
export const QuillEditor = MyQuillEditor
