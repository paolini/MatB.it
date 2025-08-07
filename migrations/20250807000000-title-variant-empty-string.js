module.exports = {
  async up(db) {
    // Notes: title e variant
    await db.collection('notes').updateMany(
      { $or: [{ title: { $exists: false } }, { title: null }] },
      { $set: { title: '' } }
    );
    await db.collection('notes').updateMany(
      { $or: [{ variant: { $exists: false } }, { variant: null }] },
      { $set: { variant: '' } }
    );

    // NoteVersions: title e variant
    await db.collection('note_versions').updateMany(
      { $or: [{ title: { $exists: false } }, { title: null }] },
      { $set: { title: '' } }
    );
    await db.collection('note_versions').updateMany(
      { $or: [{ variant: { $exists: false } }, { variant: null }] },
      { $set: { variant: '' } }
    );
  },

  async down(db) {
    // Non si ripristina null/undefined per sicurezza
    // ...nessuna azione...
  }
};
