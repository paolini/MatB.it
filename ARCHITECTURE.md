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
- Session management with JWT tokens
- User profile management
- Legacy user migration support

### 2. Note Management
- **Create** new notes with titles and rich content
- **Edit** notes with real-time WYSIWYG editor
- **Delete** notes (author-only with confirmation)
- **Privacy control** - notes can be public or private
- **Author attribution** - notes display creator information

### 3. Rich Text Editing
- Custom Quill.js implementation with mathematical extensions
- **LaTeX formula support** (inline: `$formula$`, display: `$$formula$$`)
- Text formatting (bold, italic, underline)
- Headers, lists, and code blocks
- Mathematical environments (theorem, lemma, proof, etc.)
- Image and link insertion

### 4. Content Storage & Versioning
- Notes stored as **Quill Delta format** (JSON) for rich text
- Automatic migration from legacy text format to Delta
- **Git-like versioning system** with branches (Notes) and commits (NoteVersions)

### 5. Git-like Versioning System
- **Note** acts as a Git-like branch pointing to the latest version (HEAD)
- **NoteVersion** acts as immutable commits storing the complete history
- **Denormalized data** in Note (title, delta) for performance optimization
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
│   └── Providers.tsx     # App-wide providers
├── lib/                  # Utility libraries
│   ├── models.ts         # MongoDB type definitions
│   ├── mongodb.ts        # Database connection
│   └── myquill/          # Custom Quill.js integration
migrations/               # Database migration scripts
```

## Database Schema

### Notes Collection (Git-like Branches)
```typescript
type MongoNote = {
    _id: ObjectId
    title: string               // Title dell'ultima versione (HEAD)
    delta: object               // Contenuto dell'ultima versione (HEAD) in formato Quill Delta
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
```

### Note Versions Collection (Git-like Commits)
```typescript
type NoteVersion = {
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
    image: string           // Profile picture URL
    emailVerified: boolean
    pro: boolean           // Premium feature flag
    first_login: Date
    last_login: Date
    createdAt: Date
}
```

## GraphQL API

### Queries
- `notes`: List all accessible notes (respects privacy)
- `note(_id)`: Get specific note by ID
- `profile`: Get current user profile

### Mutations
- `newNote(title, delta, private)`: Create new note with versioning
- `updateNote(_id, title, delta, private)`: Update existing note (creates new version)
- `deleteNote(_id)`: Move note to deleted_notes collection (preserves history)

## Key Components

### Note.tsx
Complex component handling:
- **NoteWrapper**: Data fetching and mutation setup
- **NoteInner**: Display/edit mode switching
- **NoteEditInner**: Rich editing interface with:
  - Title editing
  - Quill editor integration
  - Privacy toggle
  - Save/cancel/delete actions
  - Confirmation dialogs

### MyQuill Custom Editor
- Extended Quill.js with mathematical features
- LaTeX formula insertion and rendering
- Mathematical environments (theorem, proof, etc.)
- Custom toolbar configuration
- Delta format content handling

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
- OAuth-based authentication (no passwords stored)
- JWT tokens for session management
- User sessions persisted in MongoDB

### Authorization
- Users can only edit/delete their own notes
- Private notes only visible to authors
- Profile information access controlled

### Data Migration
- Automatic migration system for schema changes
- Legacy user account consolidation
- Text-to-Delta content format migration

## Deployment
- Dockerized application with multi-stage builds
- Environment-based configuration
- Docker Compose for production deployment
- MongoDB Atlas or self-hosted MongoDB support

## AI Integration Considerations

### Content Format
- Notes stored as Quill Delta JSON (structured, parseable)
- LaTeX formulas preserved and identifiable
- Rich metadata (author, timestamps, privacy, versioning)
- Complete version history available for analysis

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

This application demonstrates a modern full-stack approach with strong typing, real-time editing capabilities, mathematical content support, and **Git-like versioning for collaborative research scenarios**.
