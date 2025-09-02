module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Aggiungi private=false a tutti i test che non hanno già questo campo
    await db.collection('tests').updateMany(
      { private: { $exists: false } },
      { $set: { private: false } }
    );
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Rimuovi il campo private da tutti i test
    await db.collection('tests').updateMany(
      {},
      { $unset: { private: 1 } }
    );
  }
};
