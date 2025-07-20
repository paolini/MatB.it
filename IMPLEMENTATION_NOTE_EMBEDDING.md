# MatBit - Note Embedding Implementation Plan

## Objective
Implement note references/embedding system in MatBit to allow notes to contain references to other notes, creating structured mathematical documents like books with chapters, theorems, proofs, etc.

## Architecture Decision
- **Approach**: Embed references in Quill Delta format (not hierarchical, not separate collection)
- **Reference Target**: Always point to Note (HEAD), not NoteVersion for dynamic updates
- **Ownership Model**: Only author can modify notes, others clone + pull request
- **Clone Strategy**: Clone-on-edit for dependencies when user tries to modify external note

## Current System Overview
MatBit has:
- **Notes Collection**: Git-like branches pointing to HEAD version
- **NoteVersions Collection**: Immutable commits with full history
- **Quill.js Delta format**: JSON-based rich text content
- **GraphQL API**: Apollo Server with type-safe operations
- **Git-like versioning**: Full collaborative workflow with contributors tracking

## Implementation Steps

### Phase 1: Delta Format Extension
1. **Extend Quill Delta to support note references**:
   ```typescript
   // New Delta operation type
   {
     insert: { 
       "note-ref": { 
         note_id: ObjectId,           // Points to Note (HEAD)
         display: "inline" | "block", 
         fallback_text: string       // For broken references
       }
     }
   }
   ```

2. **Update TypeScript types** in `src/lib/models.ts`
3. **GraphQL schema extension** for note references

### Phase 2: Quill.js Integration
1. **Create NoteRefBlot** in `src/lib/myquill/`:
   - Extend Quill's `BlockEmbed` or `InlineEmbed`
   - Handle rendering of referenced notes
   - Support both inline and block display modes

2. **Update MyQuill component**:
   - Add note reference toolbar button
   - Implement note picker dialog
   - Handle note-ref insertion and editing

3. **Note picker component**:
   - Search/filter available notes
   - Respect privacy settings
   - Show note previews

### Phase 3: Rendering System
1. **Recursive note rendering**:
   - Detect note-ref in Delta
   - Fetch referenced notes (with permissions)
   - Render embedded content
   - Handle circular reference detection

2. **Visual styling**:
   - Different styles for inline vs block embeds
   - Author attribution for embedded content
   - External reference indicators

3. **Permission handling**:
   - Check view permissions at render time
   - Fallback to fallback_text for inaccessible notes

### Phase 4: Clone-on-Edit Feature
1. **Edit attempt detection**:
   - Intercept clicks on embedded content
   - Check if user owns the referenced note
   - Show clone/PR options if not owned

2. **Smart cloning workflow**:
   - Clone note when user chooses to edit
   - Update reference to point to cloned note
   - Support shallow/deep/selective clone strategies

3. **Dependency management UI**:
   - Visual indicators for external vs owned references
   - Dependency panel showing all references
   - Fork/unlink actions for each dependency

### Phase 5: GraphQL API Extensions
```graphql
extend type Note {
  referencedNotes: [Note!]!     # Notes this note references
  referencedBy: [Note!]!        # Notes that reference this note
  dependencyCount: Int!         # Number of external dependencies
}

input NoteRefInput {
  noteId: ID!
  display: EmbedDisplayType!
  fallbackText: String!
}

enum EmbedDisplayType {
  INLINE
  BLOCK
}

extend type Mutation {
  embedNote(parentNoteId: ID!, noteRef: NoteRefInput!): Note!
  cloneNoteDependency(noteId: ID!, dependencyId: ID!): Note!
  updateNoteReference(noteId: ID!, oldRefId: ID!, newRefId: ID!): Note!
}
```

### Phase 6: Advanced Features
1. **Change notifications**:
   - Notify when referenced notes are updated
   - Show which notes are affected by changes

2. **Dependency analysis**:
   - Visual dependency graphs
   - Impact analysis for changes
   - Circular reference prevention

3. **Export/Import**:
   - Handle note references in export
   - Bundle dependencies when needed

## Key Files to Modify

### Frontend
- `src/lib/models.ts` - Type definitions
- `src/lib/myquill/MyQuill.tsx` - Editor component
- `src/lib/myquill/` - New NoteRefBlot
- `src/components/Note.tsx` - Rendering logic
- `src/app/graphql/schema.graphql` - GraphQL schema

### Backend
- `src/app/graphql/typedefs.ts` - GraphQL types
- `src/app/graphql/resolvers.ts` - Reference resolution
- New migration for any schema changes

## Implementation Priority
1. **Start with basic Delta embedding** (Phase 1)
2. **Simple Quill integration** (Phase 2)
3. **Basic rendering** (Phase 3)
4. **Clone-on-edit** (Phase 4) - This is the key innovation
5. **Polish and advanced features** (Phases 5-6)

## Testing Strategy
- Unit tests for Delta parsing
- Integration tests for reference resolution
- E2E tests for clone-on-edit workflow
- Permission boundary testing

## Notes
- The clone-on-edit pattern solves all consistency issues elegantly
- Always reference Note (HEAD) for dynamic updates, never NoteVersion
- The existing git-like versioning system works perfectly with embedding
- Focus on user experience: make embedding and cloning feel natural

## Success Criteria
- Users can embed notes in other notes seamlessly
- Clone-on-edit workflow is intuitive and fast
- No breaking changes to existing functionality
- Performance remains good with complex documents
- Collaborative workflows are enhanced, not complicated
