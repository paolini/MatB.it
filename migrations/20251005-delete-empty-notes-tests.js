// Migrazione: sposta tutte le note e i test con titolo vuoto e delta vuoto nelle collection deleted_notes e deleted_tests
// Esegui con migrate-mongo

module.exports = {
  async up(db) {
    // Sposta note con titolo vuoto e delta vuoto o solo newline in deleted_notes
    const notesToDelete = await db.collection('notes').find({
      title: '',
      $or: [
        { delta: '' },
        { delta: { ops: [] } },
        { delta: { ops: [{ insert: '\n' }] } }
      ]
    }).toArray();
    if (notesToDelete.length > 0) {
      await db.collection('deleted_notes').insertMany(
        notesToDelete.map(note => ({ ...note, deleted_on: new Date() }))
      );
      await db.collection('notes').deleteMany({
        _id: { $in: notesToDelete.map(n => n._id) }
      });
    }
    // Sposta test con titolo vuoto e delta vuoto o solo newline in deleted_tests
    const testsToDelete = await db.collection('tests').find({
      title: '',
      $or: [
        { delta: '' },
        { delta: { ops: [] } },
        { delta: { ops: [{ insert: '\n' }] } }
      ]
    }).toArray();
    if (testsToDelete.length > 0) {
      await db.collection('deleted_tests').insertMany(
        testsToDelete.map(test => ({ ...test, deleted_on: new Date() }))
      );
      await db.collection('tests').deleteMany({
        _id: { $in: testsToDelete.map(t => t._id) }
      });
    }
  },

  async down(db) {
    // Down non ripristina le note/test cancellate
    // (operazione irreversibile)
    return;
  }
};
