import { Db, ObjectId, OptionalId } from 'mongodb'

// Types for Note Reference in Quill Delta
export type NoteRef = {
    note_id: ObjectId           // Points to Note (HEAD)
}

// Extended Delta operation types
export type DeltaInsert = string | { "note-ref": NoteRef } | object

// Helper functions for note references
export function isNoteRef(insert: unknown): insert is { "note-ref": NoteRef } {
    return typeof insert === 'object' && insert !== null && 'note-ref' in insert
}

export function extractNoteRef(insert: unknown): NoteRef | null {
    return isNoteRef(insert) ? insert["note-ref"] : null
}

export type MongoNote = {
    _id: ObjectId
    title: string               // Title dell'ultima versione (HEAD)
    hide_title: boolean         // Non mostrare il titolo quando si visualizza la nota
    delta: object               // Contenuto dell'ultima versione (HEAD) in formato Quill Delta
    variant?: string            // Tipo di contenuto dell'ultima versione (HEAD)
    author_id: ObjectId         // Chi controlla questo branch (può spostare il tip)
    note_version_id: ObjectId   // Punta alla versione corrente (HEAD)
    contributors: {             // Lista denormalizzata dei contributori
        user_id: ObjectId
        contribution_count: number
        first_contribution: Date
        last_contribution: Date
    }[]
    private: boolean            // Solo l'autore può vederla
    created_on: Date
    description?: string        // Descrizione del branch
}

export type NoteVersion = {
    _id: ObjectId
    title: string
    delta: object                // Contenuto in formato Quill Delta (JSON flessibile)
    variant: string            // Tipo di contenuto opzionale (es: teorema, dimostrazione, esercizio, etc.)
    author_id: ObjectId         // Chi ha creato questa versione
    parent_version_id?: ObjectId          // Primo parent (catena principale)
    second_parent_version_id?: ObjectId   // Secondo parent (per merge)
    created_on: Date
    message?: string            // Messaggio di commit
}

// Tipi per inserimenti (senza _id che viene generato da MongoDB)
export type MongoNoteInsert = Omit<MongoNote, '_id'>
export type NoteVersionInsert = Omit<NoteVersion, '_id'>

export type MongoUser = {
    name: string
    email: string
    emailVerified: boolean
    first_login: Date
    last_login: Date
    image: string
    pro: boolean
    createdAt: Date
}

// somministrazione di un test, compito, questionario...
// il testo del test è nella nota note_id
export type MongoTest = {
    _id: ObjectId
    note_id: ObjectId // il testo del compito (ultima versione)
    title: string // nome del test
    created_on: Date // quando è stato creato
    author_id: ObjectId // chi l'ha creato
    open_on: Date|null // quando è possibile aprirlo
    close_on: Date|null // entro quando è possibile compilarlo
}

// risposte date da un utente al test
export type MongoSubmission = {
    _id: ObjectId
    test_id: ObjectId
    author_id: ObjectId // chi ha svolto il test (studente)
    started_on: Date // quando è iniziato
    completed_on: Date|null // quando (e se) è stato inviato
    answers: MongoAnswer[]
}

export type MongoAnswer = {
    note_id: ObjectId // id della nota (HEAD) a cui si riferisce la risposta
    permutation: number[] | null
    answer: number | null // risposta depermutata 0-index
}

export function getNotesCollection(db: Db) {
    return db.collection<OptionalId<MongoNote>>('notes')
}

export function getDeletedNotesCollection(db: Db) {
    return db.collection<OptionalId<MongoNote>>('deleted_notes')
}

export function getNoteVersionsCollection(db: Db) {
    return db.collection<OptionalId<NoteVersion>>('note_versions')
}

export function getUsersCollection(db: Db) {
    return db.collection<MongoUser>('users')
}

export function getTestsCollection(db: Db) {
    return db.collection<OptionalId<MongoTest>>('tests')
}

export function getDeletedTestsCollection(db: Db) {
    return db.collection<OptionalId<MongoTest>>('deleted_tests')
}

export function getSubmissionsCollection(db: Db) {
    return db.collection<OptionalId<MongoSubmission>>('submissions')
}

export function getDeletedSubmissionsCollection(db: Db) {
    return db.collection<OptionalId<MongoSubmission>>('deleted_submissions')
}

export const TEST_PIPELINE = [
  // inserisce i dati dell'autore
  {
    $lookup: {
      from: 'users',
      localField: 'author_id',
      foreignField: '_id',
      as: 'author'
    }
  }, {
    $unwind: '$author'
  },
  {
    $lookup: {
        from: 'notes',
        localField: 'note_id',
        foreignField: '_id',
        as: 'note'
    }
  }, {
    $unwind: '$note'
  },
]

export const NOTE_PIPELINE = [
  {
    $lookup: {
      from: 'users',
      localField: 'author_id',
      foreignField: '_id',
      as: 'author'
    }
  }, {
    // da array a oggetto singolo, se l'autore non esiste, sarà null
    $unwind: { path: '$author', preserveNullAndEmptyArrays: true }
  },
  {
    // Aggiungiamo updated_on basato sulla versione corrente
    $lookup: {
      from: 'note_versions',
      localField: 'note_version_id',
      foreignField: '_id',
      as: 'version'
    }
  }, {
    $unwind: '$version'
  }, {
    $addFields: {
      updated_on: '$version.created_on' // L'ultima modifica è quando è stata creata l'ultima versione
    }
  }
]

export const SUBMISSION_PIPELINE = [
  // inserisce i dati dell'autore
  {
    $lookup: {
      from: 'users',
      localField: 'author_id',
      foreignField: '_id',
      as: 'author'
    }
  }, {
    $unwind: { path: '$author', preserveNullAndEmptyArrays: true }
  },
  // inserisce i dati del test
  {
    $lookup: {
      from: 'tests',
      localField: 'test_id',
      foreignField: '_id',
      as: 'test',
      pipeline: [
        { $lookup: {
          from: 'users',
          localField: 'author_id',
          foreignField: '_id',
          as: 'author'
        }},
        { $unwind: { path: '$author', preserveNullAndEmptyArrays: true }}
      ]
    }
  }, {
    $unwind: { path: '$test', preserveNullAndEmptyArrays: true }
  },
]

