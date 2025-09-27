m
## Classi (Entità)

Le **classi** sono entità che raccolgono note, test, studenti e docenti. Ogni classe ha:

- Un proprietario (owner)
- Una lista di insegnanti (teachers)
- Una lista di studenti (students)
- Un elenco di note e test associati tramite il campo `class_id`.

### Struttura dati semplificata
```typescript
type MongoClass = {
    _id: ObjectId
    name: string
    description?: string
    owner_id: ObjectId
    teachers: ObjectId[]
    students: ObjectId[]
    created_on: Date
    academic_year?: string
    active: boolean
    // Codici di arruolamento per studenti e docenti
    student_enrollment_code?: string   // Codice segreto per arruolamento studenti
    teacher_enrollment_code?: string   // Codice segreto per arruolamento docenti
}
```

### Arruolamento tramite codice segreto
- Ogni classe può avere codici di arruolamento generati e gestiti tramite una collection dedicata (`secrets`).
- Ogni codice contiene: stringa segreta, timestamp di scadenza, azione (`enroll_student` o `enroll_teacher`), e un `class_id`.
- I codici possono essere generati, copiati e revocati tramite UI e API GraphQL.
- Chi accede tramite codice viene aggiunto al ruolo corrispondente (studente/docente) nella classe specificata.
- I codici sono segreti, sufficientemente lunghi e randomici (UUID v4).
- Solo owner e docenti possono generare/revocare i codici.
- Un utente non può arruolarsi due volte nella stessa classe.
- L'accesso avviene tramite endpoint `/u/<secret>` che gestisce la validazione e l'iscrizione automatica.

### Regole di visibilità
- **Note/Test con `private=true` e collegate a una classe**: possono essere visualizzate da tutti i docenti della classe (owner e teachers), ma non dagli studenti.
- **Note/Test con `private=true` e senza classe (`class_id=null`)**: possono essere visualizzate solo dal proprietario (author).
- **Note/Test pubbliche (`private=false`)**: sono visibili a tutti gli utenti che hanno accesso alla classe, oppure a tutti se non collegate a una classe.

### Relazioni
- Le classi aggregano e organizzano contenuti (note, test) e utenti (docenti, studenti).
- I permessi di visualizzazione e modifica sono gestiti tramite i ruoli e il campo `private` sugli oggetti.

Questa struttura permette di gestire ambienti collaborativi, corsi, gruppi di studio e classi virtuali con regole di privacy flessibili e granulari.
# MatBit - Project Overview for AI

## Project Description
MatBit is a **collaborative note-taking web application** built with Next.js and MongoDB. It allows users to create, edit, share, and manage mathematical notes with rich text editing capabilities, including LaTeX formula support.

## Technology Stack

### Frontend
- **Next.js 15.3.1** with React 19.0.0 (App Router)
- **TypeScript** for type safety
- **TailwindCSS** for styling
- **Apollo Client** for GraphQL state management
- **NextAuth.js** for authentication (GitHub/Google OAuth)
- **Quill.js** (custom build) for rich text editing with LaTeX support
- **KaTeX** for mathematical formula rendering

### Backend
- **GraphQL** API with Apollo Server
- **MongoDB** as primary database
- **NextAuth.js** with MongoDB adapter for user sessions
- **Custom authentication context** for GraphQL resolvers

### Infrastructure
- **Docker** support for development and deployment
- **MongoDB** containerized with docker-compose
- **Database migrations** using migrate-mongo
- **ESLint** for code linting

## Core Features

### 1. User Authentication
- OAuth login via GitHub and Google providers
- **Email authentication** with magic link (passwordless)
- Support for SMTP and modern email services (Resend)
- Session management with JWT tokens
- User profile management
- Legacy user migration support
- Custom sign-in page with multiple authentication options

### 2. Note Management
- **Create** new notes with titles, rich content, and variant types
- **Edit** notes with real-time WYSIWYG editor and variant modification
- **Delete** notes (author-only with confirmation)
- **Privacy control** - notes can be public or private
- **Title visibility control** - option to hide title when displaying notes
- **Variant selection** - categorize notes as theorems, lemmas, proofs, exercises, tests, definitions, examples, questions, remarks, etc.
- **Author attribution** - notes display creator information

### 3. Rich Text Editing
- Custom Quill.js implementation with mathematical extensions
- **LaTeX formula support** (inline: `$formula$`, display: `$$formula$$`)
- Text formatting (bold, italic, underline)
- Headers, lists, and code blocks
- **Mathematical environments (theorem, lemma, proof, etc.) as separate Note entities**
- **Note references** - embed links to other notes within content with full recursive rendering
- **Delta variants system** - visual styling for different note types with CSS-based labels
- Image and link insertion

### 4. Content Storage & Versioning
- Notes stored as **Quill Delta format** (JSON) for rich text
- Automatic migration from legacy text format to Delta
- **Git-like versioning system** with branches (Notes) and commits (NoteVersions)
- **Note variants system** for mathematical environments (theorem, lemma, proof, etc.)

### 5. Delta Rendering & Note Embedding
La rappresentazione e il rendering delle Note avvengono tramite una struttura dati Document, che astrae e normalizza il contenuto Quill Delta e i riferimenti ricorsivi:
- **Struttura Document**: ogni nota viene trasformata in un albero Document che rappresenta blocchi, inlines, formule, riferimenti e metadati, consentendo parsing, validazione e rendering coerente.
- **Componenti React (NoteContent, NoteEmbed, ecc.)**: il rendering avviene direttamente dal Document, senza generazione di HTML string, garantendo sicurezza, performance e coerenza tra server e client.
- **Gestione ricorsiva dei riferimenti**: i riferimenti ad altre note sono nodi speciali del Document e vengono risolti e renderizzati ricorsivamente, con controllo della profondità e fallback per cicli o errori.
- **Integrazione Apollo GraphQL**: i dati delle note referenziate vengono caricati on-demand tramite useQuery, evitando prop drilling e ottimizzando il caching.
- **Rendering KaTeX sincrono**: le formule matematiche sono nodi del Document e vengono renderizzate in modo sicuro e sincrono tramite KaTeX (renderToString).
- **Sistema di varianti visuali**: le varianti (teorema, lemma, esercizio, ecc.) sono rappresentate sia nei dati che nel Document, e il rendering applica classi CSS per colori, bordi e label.
- **Metadati e informazioni**: icone e popup contestuali mostrano autore, date, privacy e altre informazioni, integrati come nodi informativi nel Document.
- **Struttura HTML corretta**: le note embeddate sono sempre rese come blocchi, evitando errori di hydration e garantendo accessibilità.
- **Formato standardizzato dei riferimenti**: tutti i riferimenti usano `{ "note-ref": { "note_id": "..." } }` sia nel Delta che nel Document, assicurando interoperabilità e parsing affidabile.

### 6. Git-like Versioning System
- **Note** acts as a Git-like branch pointing to the latest version (HEAD)
- **NoteVersion** acts as immutable commits storing the complete history
- **Denormalized data** in Note (title, delta, variant) for performance optimization
- **Soft deletion** - deleted notes moved to `deleted_notes` collection
- **Shared versions** - multiple Notes can reference the same NoteVersion
- **Contributors tracking** - denormalized list of users who contributed to each Note
- **Version history** - complete audit trail of all changes with authorship

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/auth/          # NextAuth configuration
│   ├── graphql/           # GraphQL API endpoint and schema
│   ├── note/              # Note-related pages
│   │   ├── [_id]/         # Individual note view
│   │   └── new/           # Note creation form
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Home page (notes list)
├── components/            # Reusable React components
│   ├── Note.tsx          # Note display/edit component
│   ├── Notes.tsx         # Notes list component
│   ├── NavBar.tsx        # Navigation with auth
│   ├── NoteContent.tsx   # Rendering di una nota tramite struttura Document
│   ├── NoteEmbed.tsx     # Embedding ricorsivo di note tramite Document
│   ├── NoteReferenceModal.tsx  # Modal per inserimento riferimenti nota
│   └── Providers.tsx     # App-wide providers
├── lib/                  # Utility libraries
│   ├── models.ts         # Tipi MongoDB & tipi Document/NoteRef
│   ├── mongodb.ts        # Database connection
│   ├── document/         # Parsing, validazione e rendering struttura Document
│   │   ├── document.ts   # Definizione struttura Document e nodi
│   │   ├── parser.ts     # Conversione Delta → Document
│   │   ├── render.tsx    # Rendering React da Document
│   │   └── utils.ts      # Utility per Document
│   └── myquill/          # Custom Quill.js integration
│       ├── MyQuill.tsx   # Quill wrapper component
│       ├── myquill.js    # Quill configuration and blot registration
│       ├── noteref.js    # Note reference blot implementation (standardized format)
│       ├── environment.js # Mathematical environment blots (legacy)
│       ├── formula.js    # LaTeX formula blots with improved cursor handling
│       └── delta-variants.css   # Styling for Delta variants and note reference button
migrations/               # Database migration scripts
```

## Database Schema

### Note Reference Types
```typescript
// Types for Note Reference in Quill Delta
type NoteRef = {
    note_id: ObjectId           // Points to Note (HEAD)
}

// Extended Delta operation types
type DeltaInsert = string | { "note-ref": NoteRef } | object

// Helper functions for note references
function isNoteRef(insert: unknown): insert is { "note-ref": NoteRef }
function extractNoteRef(insert: unknown): NoteRef | null
```

### Notes Collection (Git-like Branches)
```typescript
type MongoNote = {
    _id: ObjectId
    title: string               // Title dell'ultima versione (HEAD)
    hide_title: boolean         // Non mostrare il titolo quando si visualizza la nota
    delta: QuillDelta           // Contenuto dell'ultima versione (HEAD) in formato Quill Delta
    variant?: string            // Tipo di contenuto dell'ultima versione (HEAD) - denormalizzato da NoteVersion
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
```

### Note Versions Collection (Git-like Commits)
```typescript
type NoteVersion = {
    _id: ObjectId
    title: string
    delta: QuillDelta           // Contenuto in formato Quill Delta
    variant: string            // Tipo di contenuto (theorem, lemma, proof, remark, exercise, test, default, definition, example, question)
    author_id: ObjectId         // Chi ha creato questa versione
    parent_version_id?: ObjectId          // Primo parent (catena principale)
    second_parent_version_id?: ObjectId   // Secondo parent (per merge)
    created_on: Date
    message?: string            // Messaggio di commit
}
```

### Deleted Notes Collection
```typescript
// Same structure as MongoNote plus:
type MongoDeletedNote = MongoNote & {
    deleted_on: Date
    deleted_by: ObjectId
}
```

### Users Collection
```typescript
type MongoUser = {
    _id: ObjectId
    name: string
    email: string
    emailVerified: boolean
    first_login: Date
    last_login: Date
    image: string               // Profile picture URL
    pro: boolean               // Premium feature flag
    createdAt: Date
}

### Tests Collection
```typescript
type MongoTest = {
    _id: ObjectId
    note_id: ObjectId           // ID della nota con variant "test"
    title: string               // Nome del test
    created_on: Date
    author_id: ObjectId         // Chi ha creato il test
    open_on: Date|null          // Quando è possibile aprirlo
    close_on: Date|null         // Entro quando è possibile compilarlo
    private: boolean            // Solo l'autore può vederlo
}
```

### Submissions Collection
```typescript
type MongoSubmission = {
    _id: ObjectId
    test_id: ObjectId           // ID del test
    author_id: ObjectId         // Utente che ha svolto il test (studente)
    started_on: Date            // Quando è iniziato
    completed_on: Date|null     // Quando (e se) è stato inviato
    answers: MongoAnswer[]      // Array delle risposte
}

type MongoAnswer = {
    note_id: ObjectId           // ID della nota (HEAD) a cui si riferisce la risposta
    permutation: number[]|null  // Ordine delle opzioni per domande a scelta multipla
    answer: number|null         // Risposta depermutata 0-index
}
```

## GraphQL API
    max_score?: number
}
```

## GraphQL API

### Queries
- `notes(mine, private, title, variant, limit, skip)`: List all accessible notes with filtering options
- `note(_id)`: Get specific note by ID
- `profile`: Get current user profile
- `tests(mine, open, limit)`: List all accessible tests with filtering options
- `test(_id)`: Get specific test by ID
- `submission(_id)`: Get specific submission by ID

### Mutations
- `newNote(title, delta, private, variant, hide_title)`: Create new note with versioning and variant type
- `updateNote(_id, title, hide_title, delta, private, variant)`: Update existing note (creates new version) with variant modification
- `deleteNote(_id)`: Move note to deleted_notes collection (preserves history)
- `newTest(note_id, title, private)`: Create new test linked to a note
- `updateTest(_id, title, open_on, close_on, private)`: Update test properties
- `deleteTest(_id)`: Delete test
- `newSubmission(test_id)`: Create new submission for a test
- `updateSubmission(_id, answers, completed)`: Update submission with answers
- `deleteSubmission(_id)`: Delete submission

// Gestione codici di arruolamento classi
- `generateEnrollmentCode(class_id, role: "student"|"teacher")`: genera e salva un nuovo codice per il ruolo indicato (il codice è un UUID v4 generato tramite la funzione `generateSecret()` già usata per i token di accesso)
    - Solo owner o docenti possono chiamare la mutation.
    - Sovrascrive eventuale codice esistente.
    - Restituisce il nuovo codice.
- `deleteEnrollmentCode(class_id, role: "student"|"teacher")`: cancella il codice per il ruolo indicato (imposta a null)
    - Solo owner o docenti possono chiamare la mutation.
    - Imposta il campo corrispondente a null.
    - Restituisce conferma.
- `enrollWithCode(code: String)`: arruola l’utente nella classe corrispondente al codice (come studente o docente)
    - Cerca la classe con il codice (student/teacher).
    - Se trovato, aggiunge l’utente al ruolo corrispondente (se non già presente).
    - Restituisce la classe aggiornata.

// Token di accesso già presente
- `MongoAccessToken.secret`: codice segreto (UUID v4) usato per permessi granulari su risorse (note/test)
    - Generato tramite la stessa funzione `generateSecret()`.
