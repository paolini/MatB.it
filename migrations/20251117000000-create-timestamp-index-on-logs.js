// Migrazione: crea un indice decrescente su timestamp nella collezione logs
module.exports = {
  async up(db) {
    await db.collection('logs').createIndex({ timestamp: -1 });
  },

  async down(db) {
    await db.collection('logs').dropIndex('timestamp_-1');
  }
};
