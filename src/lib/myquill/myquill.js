import MyQuill from 'quill-next'
import MyQuillEditor from 'quill-next-react'

import { MyFormula, FormulaEditorModule } from './formula.js'
import { MyEnvironmentLine, MyEnvironmentContainer } from './environment.js'

export { Delta } from 'quill-next'

MyQuill.register('formats/formula', MyFormula, true);
MyQuill.register('modules/formulaEditor', FormulaEditorModule);

MyQuill.register('formats/environment', MyEnvironmentLine, true);
MyQuill.register('formats/environment-container', MyEnvironmentContainer, true);

export const Quill = MyQuill
export const QuillEditor = MyQuillEditor
