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
    private: boolean            // Controllo visibilità
    created_on: Date
    description?: string        // Descrizione del branch
}

export type NoteVersion = {
    _id: ObjectId
    title: string
    delta: object                // Contenuto in formato Quill Delta (JSON flessibile)
    variant?: string            // Tipo di contenuto opzionale (es: teorema, dimostrazione, esercizio, etc.)
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




