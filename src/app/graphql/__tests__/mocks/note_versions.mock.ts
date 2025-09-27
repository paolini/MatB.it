import { mockNotes } from './notes.mock';

export const mockNoteVersions = mockNotes.map(note => ({
  _id: note.note_version_id,
  note_id: note._id,
  created_on: note.created_on,
  // altri campi necessari per la tua logica
}));
