module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('Starting migration: add note_version_id to legacy notes...');
    
    // Trova tutte le note che non hanno note_version_id
    const notesWithoutVersion = await db.collection('notes')
      .find({ note_version_id: { $exists: false } })
      .toArray();
    
    console.log(`Found ${notesWithoutVersion.length} notes without note_version_id`);
    
    for (const note of notesWithoutVersion) {
      console.log(`Processing note: ${note._id} - ${note.title}`);
      
      // Crea una NoteVersion basata sui dati della Note
      const noteVersion = {
        title: note.title,
        delta: note.delta || {},
        variant: note.variant || undefined,
        author_id: note.author_id,
        parent_version_id: undefined, // Prima versione, nessun parent
        second_parent_version_id: undefined,
        created_on: note.created_on,
        message: 'Initial version (migrated from legacy note)'
      };
      
      // Inserisci la NoteVersion
      const insertResult = await db.collection('note_versions').insertOne(noteVersion);
      const noteVersionId = insertResult.insertedId;
      
      console.log(`Created NoteVersion: ${noteVersionId} for note: ${note._id}`);
      
      // Aggiorna la Note per puntare alla nuova NoteVersion
      await db.collection('notes').updateOne(
        { _id: note._id },
        { 
          $set: { 
            note_version_id: noteVersionId,
            // Assicuriamoci che contributors esista se non c'è già
            ...(note.contributors ? {} : {
              contributors: [{
                user_id: note.author_id,
                contribution_count: 1,
                first_contribution: note.created_on,
                last_contribution: note.created_on
              }]
            })
          }
        }
      );
      
      console.log(`Updated note: ${note._id} with note_version_id: ${noteVersionId}`);
    }
    
    console.log('Migration completed successfully!');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('Rolling back migration: add note_version_id to legacy notes...');
    
    // Trova tutte le NoteVersions create da questa migrazione
    const migratedVersions = await db.collection('note_versions')
      .find({ message: 'Initial version (migrated from legacy note)' })
      .toArray();
    
    console.log(`Found ${migratedVersions.length} migrated note versions to remove`);
    
    // Rimuovi i note_version_id dalle Note
    for (const version of migratedVersions) {
      await db.collection('notes').updateOne(
        { note_version_id: version._id },
        { $unset: { note_version_id: "" } }
      );
    }
    
    // Rimuovi le NoteVersions create dalla migrazione
    await db.collection('note_versions').deleteMany({
      message: 'Initial version (migrated from legacy note)'
    });
    
    console.log('Rollback completed successfully!');
  }
};
