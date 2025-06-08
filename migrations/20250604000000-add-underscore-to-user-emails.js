// Migrazione per distinguere i vecchi utenti: aggiunge un '_' alla fine dell'email di ogni utente.
// Serve a "liberare" l'email per permettere agli utenti di registrarsi ex-novo con NextAuth,
// mantenendo comunque traccia dei vecchi utenti per eventuali migrazioni o recuperi dati.
// Safe to run: la funzione down rimuove l'underscore finale se presente.

module.exports = {
  async up(db) {
    await db.collection('users').updateMany(
      {},
      [
        { $set: { email: { $concat: ["$email", "_"] } } }
      ]
    );
  },

  async down(db) {
    await db.collection('users').updateMany(
      { email: { $regex: /_$/ } },
      [
        { $set: { email: { $substr: ["$email", 0, { $subtract: [ { $strLenCP: "$email" }, 1 ] } ] } } }
      ]
    );
  },
};
