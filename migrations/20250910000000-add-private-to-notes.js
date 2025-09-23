module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Aggiungi private=false a tutte le note che non hanno già questo campo
    await db.collection('notes').updateMany(
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
  }
};
