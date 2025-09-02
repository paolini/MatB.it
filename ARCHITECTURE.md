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

## Key Components

### Note.tsx
Complex component handling:
- **NoteWrapper**: Data fetching and mutation setup
- **NoteInner**: Display/edit mode switching with DeltaContent integration
- **NoteEditInner**: Rich editing interface with:
  - Title editing
  - **Variant selection** - dropdown for choosing note type (theorem, lemma, proof, etc.)
  - Quill editor integration
  - Privacy toggle
  - **Streamlined UI** - action buttons (Save/Cancel/Delete) managed by MyQuill component
  - Confirmation dialogs handled by MyQuill

### MyQuill Custom Editor
- Extended Quill.js with mathematical features
- LaTeX formula insertion and rendering with proper cursor positioning
- **Note reference system** with visual embedding and recursive content rendering
- **DeltaContent React component integration** for view mode with full embedded note display
- **Edit mode note references** display as styled badges with variant information
- Custom toolbar configuration with note reference button (※)
- Delta format content handling with consistent `note-ref` blot naming
- **Variant-aware styling** with CSS-based labels and color coding
- **Formula editor improvements** - proper cursor positioning after formula insertion and editing
- **Unified action button system** - all Save/Cancel/Delete buttons consolidated in MyQuill component
- **NoteReferenceModal integration** with both existing note selection and new note creation workflows
- **Selection range preservation** - automatically saves cursor position before opening modals to ensure accurate note insertion

### DeltaContent React Component
- **Modern React component** replacing legacy HTML string generation
- **Apollo GraphQL integration** with useQuery for direct note fetching
- **Synchronous KaTeX rendering** using renderToString for mathematical formulas
- **Recursive note embedding** with configurable depth limits and loading states
- **Variant styling** using CSS classes for visual distinction
- **Note information popups** for metadata access (author, dates, privacy)
- **TypeScript support** with proper type definitions for better development experience
- **Security improvements** with controlled dangerouslySetInnerHTML only for KaTeX-rendered content
- **Proper HTML structure** - embedded notes rendered as block elements to prevent hydration errors
- **Standardized note reference parsing** - consistent handling of `{ "note-ref": { "note_id": "..." } }` format

## Development Workflow

### Setup
```bash
docker-compose up -d        # Start MongoDB
npm ci                      # Install dependencies
npm run dev                 # Start development server
```

### Database Management
```bash
npm run migrate:status      # Check migration status
npm run migrate:up          # Apply pending migrations
npm run migrate:create      # Create new migration
```

### Code Generation
```bash
npm run codegen            # Generate TypeScript types from GraphQL schema
```

## Security & Privacy

### Authentication
- OAuth-based authentication (GitHub, Google)
- **Passwordless email authentication** with magic links
- JWT tokens for session management
- User sessions persisted in MongoDB
- Email verification through trusted providers (SMTP/Resend)

### Authorization
- Users can only edit/delete their own notes
- Private notes only visible to authors
- Profile information access controlled

### Data Migration
- Automatic migration system for schema changes
- Legacy user account consolidation
- Text-to-Delta content format migration
- **Variant field migration** - copying variant from NoteVersion to Note for denormalization

## Deployment
- Dockerized application with multi-stage builds
- Environment-based configuration
- Docker Compose for production deployment
- MongoDB Atlas or self-hosted MongoDB support

## AI Integration Considerations

### Content Format
- Notes stored as Quill Delta JSON (structured, parseable)
- LaTeX formulas preserved and identifiable
- **Note references** embedded as structured data with note IDs
- **Variant system** for mathematical content classification
- Rich metadata (author, timestamps, privacy, versioning)
- Complete version history available for analysis
- **Recursive embedding structure** enables content relationship analysis

### API Access
- GraphQL endpoint provides structured data access
- Type-safe operations with generated TypeScript types
- Authentication context available for user-specific operations
- Version history accessible for content evolution analysis

### Extension Points
- Custom Quill modules for additional features
- GraphQL schema extensible for new functionality
- Component-based architecture allows easy feature additions
- Migration system supports schema evolution
- **Versioning system** enables content timeline analysis and collaboration insights
- **DeltaContent React component** extensible for new content types and rendering modes
- **Variant system** supports new mathematical environment types
- **Apollo GraphQL integration** enables real-time data fetching and caching
- **Standardized note references** with consistent Delta format across the entire system

This application demonstrates a modern full-stack approach with strong typing, real-time editing capabilities, mathematical content support, **recursive note embedding**, **visual variant system**, **Git-like versioning for collaborative research scenarios**, **modern React patterns** with Apollo GraphQL integration, and **robust content format consistency** for note references.
