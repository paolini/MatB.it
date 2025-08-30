module.exports = {
  async up(db) {
    // Aggiungi hide_title=false a tutte le note che non hanno già questo campo
    await db.collection('notes').updateMany(
      { hide_title: { $exists: false } },
      { $set: { hide_title: false } }
    );
  },

  async down(db) {
    // Rimuovi il campo hide_title da tutte le note
    await db.collection('notes').updateMany(
      {},
      { $unset: { hide_title: 1 } }
    );
  }
};
