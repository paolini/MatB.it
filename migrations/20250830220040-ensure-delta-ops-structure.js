module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('Fixing delta structure in notes collection...');
    
    // Fix notes collection - ensure delta has ops property
    const notesResult = await db.collection('notes').updateMany(
      {
        $or: [
          { delta: { $exists: false } },
          { delta: null },
          { 'delta.ops': { $exists: false } }
        ]
      },
      { $set: { delta: { ops: [] } } }
    );
    
    console.log(`Fixed ${notesResult.modifiedCount} documents in notes collection`);

    console.log('Fixing delta structure in noteVersions collection...');
    
    // Fix noteVersions collection - ensure delta has ops property  
    const versionsResult = await db.collection('noteVersions').updateMany(
      {
        $or: [
          { delta: { $exists: false } },
          { delta: null },
          { 'delta.ops': { $exists: false } }
        ]
      },
      { $set: { delta: { ops: [] } } }
    );
    
    console.log(`Fixed ${versionsResult.modifiedCount} documents in noteVersions collection`);
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // This migration fixes data consistency, so rollback is not recommended
    // but if needed, it could be implemented to revert only empty deltas
    console.log('Rollback not implemented - this migration ensures data consistency');
  }
};
