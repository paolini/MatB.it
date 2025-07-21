module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('Starting migration: copy variant from NoteVersion to Note...');
    
    // Trova tutte le note che non hanno il campo variant o ce l'hanno undefined/null
    const notesWithoutVariant = await db.collection('notes')
      .find({ 
        $or: [
          { variant: { $exists: false } },
          { variant: null },
          { variant: undefined }
        ]
      })
      .toArray();
    
    console.log(`Found ${notesWithoutVariant.length} notes without variant field`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const note of notesWithoutVariant) {
      console.log(`Processing note: ${note._id} - ${note.title}`);
      
      // Trova la NoteVersion corrispondente
      if (!note.note_version_id) {
        console.log(`  Skipping note ${note._id}: no note_version_id`);
        skippedCount++;
        continue;
      }
      
      const noteVersion = await db.collection('note_versions')
        .findOne({ _id: note.note_version_id });
      
      if (!noteVersion) {
        console.log(`  Skipping note ${note._id}: corresponding NoteVersion not found`);
        skippedCount++;
        continue;
      }
      
      // Copia il variant dalla NoteVersion alla Note
      const variantToCopy = noteVersion.variant || 'default';
      
      await db.collection('notes').updateOne(
        { _id: note._id },
        { $set: { variant: variantToCopy } }
      );
      
      console.log(`  Updated note ${note._id} with variant: ${variantToCopy}`);
      updatedCount++;
    }
    
    console.log(`Migration completed: ${updatedCount} notes updated, ${skippedCount} notes skipped`);
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('Starting rollback: remove variant field from notes...');
    
    // Rimuovi il campo variant da tutte le note
    const result = await db.collection('notes').updateMany(
      {},
      { $unset: { variant: "" } }
    );
    
    console.log(`Rollback completed: removed variant field from ${result.modifiedCount} notes`);
  }
};
