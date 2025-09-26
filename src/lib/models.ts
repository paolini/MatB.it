// Log collection: traccia azioni utenti (login, logout, query, ecc.)
export type MongoLog = {
    _id: ObjectId;
    user_id: ObjectId | null; // Utente che ha eseguito l’azione (null per guest)
    action: string;           // login, logout, query, ecc.
    timestamp: Date;
    ip?: string;              // IP dell’utente
    userAgent?: string;       // User agent/browser
    metadata?: Record<string, any>; // Info aggiuntive (query, errori, ecc.)
};
import { Db, ObjectId, OptionalId } from 'mongodb'
import { QuillDelta } from './myquill/document'

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

export const VARIANT_NAMES: Record<string, string> = {
    "": "",
    "test": "Test",
    "theorem": "Teorema",
    "lemma": "Lemma",
    "proof": "Dimostrazione",
    "remark": "Osservazione",
    "exercise": "Esercizio",
    "definition": "Definizione",
    "example": "Esempio",
    "question": "Domanda"
}

export type MongoNote = {
    _id: ObjectId
    title: string               // Title dell'ultima versione (HEAD)
    hide_title: boolean         // Non mostrare il titolo quando si visualizza la nota
    delta: QuillDelta           // Contenuto dell'ultima versione (HEAD) in formato Quill Delta
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
    class_id: ObjectId|null         // ✨ NUOVO: appartenenza alla classe
    created_on: Date
    description?: string        // Descrizione del branch
}

export type NoteVersion = {
    _id: ObjectId
    title: string
    delta: QuillDelta            // Contenuto in formato Quill Delta
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
    _id: ObjectId
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
    private: boolean // solo l'autore può vederlo
    class_id: ObjectId|null // classe di appartenenza
}

// risposte date da un utente al test
export type MongoSubmission = {
    _id: ObjectId
    test_id: ObjectId
    author_id: ObjectId // chi ha svolto il test (studente)
    started_on: Date // quando è iniziato
    completed_on: Date|null // quando (e se) è stato inviato
    answers: MongoAnswer[]
    score?: number // calcolato quando la submission è completata
}

export type MongoAnswer = {
    note_id: ObjectId // id della nota (HEAD) a cui si riferisce la risposta
    permutation: number[] | null
    answer: number | null // risposta depermutata 0-index
}

export type MongoAccessToken = {
    _id: ObjectId
    resource_id: ObjectId         // ID della nota o test
    secret: string               // codice segreto (UUID)
    permission: 'read' | 'write' // livello di accesso
    created_on: Date             // quando è stato creato
}

// ✨ NUOVO: Collezione classi per organizzare note e test
export type MongoClass = {
    _id: ObjectId
    name: string                    // "3A Scientifico", "Analisi I - 2024"
    description?: string            // Descrizione opzionale
    owner_id: ObjectId             // Proprietario principale
    teachers: ObjectId[]           // Array di user_id degli insegnanti
    students: ObjectId[]           // Array di user_id degli studenti
    created_on: Date
    academic_year?: string         // "2023/2024"
    subject?: string              // "Matematica", "Fisica", etc.
    active: boolean               // Per disattivare classi passate
}

// ✨ Tipi per la visibilità dei contenuti

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

export function getAccessTokensCollection(db: Db) {
    return db.collection<OptionalId<MongoAccessToken>>('access_tokens')
}

// ✨ NUOVO: Helper per collezioni classi
export function getClassesCollection(db: Db) {
    return db.collection<OptionalId<MongoClass>>('classes')
}

export function getDeletedClassesCollection(db: Db) {
    return db.collection<OptionalId<MongoClass>>('deleted_classes')
}

// Collezione dei log
export function getLogsCollection(db: Db) {
    return db.collection<OptionalId<MongoLog>>('logs')
}

// Funzioni di utilità per i token di accesso
export async function verifyAccessToken(
    db: Db, 
    resourceId: ObjectId, 
    secret: string, 
    requiredPermission: 'read' | 'write'
): Promise<boolean> {
    const token = await getAccessTokensCollection(db).findOne({
        resource_id: resourceId,
        secret: secret
    })
    
    if (!token) return false
    
    // Se richiesta lettura, sia 'read' che 'write' vanno bene
    // Se richiesta scrittura, serve 'write'
    if (requiredPermission === 'read') {
        return token.permission === 'read' || token.permission === 'write'
    } else {
        return token.permission === 'write'
    }
}

export function generateSecret(): string {
    // Genera un UUID v4 semplice per ora
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c == 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

// ✨ NUOVO: Funzioni per la gestione della visibilità dei contenuti

export async function getUserClassRole(
    db: Db,
    user_id: ObjectId,
    class_id: ObjectId
): Promise<'owner' | 'teacher' | 'student' | null> {
    const classDoc = await getClassesCollection(db).findOne({ _id: class_id })
    
    if (!classDoc) return null
    
    if (classDoc.owner_id.equals(user_id)) return 'owner'
    if (classDoc.teachers.some((t: ObjectId) => t.equals(user_id))) return 'teacher'
    if (classDoc.students.some((s: ObjectId) => s.equals(user_id))) return 'student'
    
    return null
}

export function canUserAccessContent(
    user: MongoUser | null,
    content: { class_id?: ObjectId, private: boolean, author_id: ObjectId },
    userClassRole?: 'owner' | 'teacher' | 'student' | null
): boolean {
  // Nuova logica: solo private e class_id
  if (!content.private) return true;
  if (content.class_id) {
    return userClassRole === 'owner' || userClassRole === 'teacher';
  }
  return user ? content.author_id.equals(user._id) : false;
}

export function validateContentCreation(
    class_id: ObjectId | null,
    isPrivate: boolean,
    user: MongoUser,
    userClasses: MongoClass[]
): { valid: boolean; error?: string; normalized?: any } {
    
    if (class_id) {
        const userClass = userClasses.find(c => 
            c._id.equals(class_id) && 
            (c.owner_id.equals(user._id) || c.teachers.includes(user._id))
        )
        if (!userClass) {
            return { valid: false, error: 'Non hai i permessi per questa classe' }
        }
    }
    
    return { valid: true, normalized: { class_id, private: isPrivate } }
}

// ✨ NUOVO: Pipeline per le aggregazioni delle classi
export const CLASS_PIPELINE = [
  {
    $lookup: {
      from: 'users',
      localField: 'owner_id',
      foreignField: '_id',
      as: 'owner'
    }
  }, {
    $unwind: '$owner'
  },
  {
    $lookup: {
      from: 'users',
      localField: 'teachers',
      foreignField: '_id',
      as: 'teachers'
    }
  },
  {
    $lookup: {
      from: 'users',
      localField: 'students', 
      foreignField: '_id',
      as: 'students'
    }
  }
]

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
  // ✨ NUOVO: Aggiungi informazioni sulla classe
  {
    $lookup: {
      from: 'classes',
      localField: 'class_id',
      foreignField: '_id',
      as: 'class'
    }
  }, {
    $unwind: { path: '$class', preserveNullAndEmptyArrays: true }
  }
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
  },
  // ✨ NUOVO: Aggiungi informazioni sulla classe
  {
    $lookup: {
      from: 'classes',
      localField: 'class_id',
      foreignField: '_id',
      as: 'class'
    }
  }, {
    $unwind: { path: '$class', preserveNullAndEmptyArrays: true }
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

// Funzione per inserire un log di azione utente
/**
 * Inserisce un log di azione utente nella collezione logs.
 * @param db - Connessione MongoDB
 * @param params - Parametri del log
 */
export async function logAction(db: Db, params: {
    user_id: ObjectId | null,
    action: string,
    ip?: string,
    userAgent?: string,
    metadata?: Record<string, any>
}) {
    const { user_id, action, ip, userAgent, metadata } = params;
    await getLogsCollection(db).insertOne({
        user_id,
        action,
        timestamp: new Date(),
        ip,
        userAgent,
        metadata
    });
}

