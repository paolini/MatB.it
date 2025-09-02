// Migrazione per rimuovere l'underscore finale dalle email degli utenti
// SOLO se non esiste già un utente con l'email pulita (senza underscore).
// Questo permette agli utenti con email modificate dalla migrazione precedente
// di accedere con le loro email originali, sfruttando il collegamento automatico
// degli account OAuth implementato in NextAuth.

module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Trova tutti gli utenti con email che finisce con '_'
    const usersWithUnderscore = await db.collection('users')
      .find({ email: { $regex: /_$/ } })
      .toArray();

    console.log(`Trovati ${usersWithUnderscore.length} utenti con email che finisce con '_'`);

    for (const user of usersWithUnderscore) {
      // Calcola l'email senza underscore
      const cleanEmail = user.email.slice(0, -1);
      
      // Verifica se esiste già un utente con l'email pulita
      const existingUser = await db.collection('users')
        .findOne({ email: cleanEmail });

      if (!existingUser) {
        // Sicuro rimuovere l'underscore - nessun conflitto
        // Marca anche l'email come verificata dato che sono utenti fidati
        await db.collection('users').updateOne(
          { _id: user._id },
          { 
            $set: { 
              email: cleanEmail,
              emailVerified: true  // I vecchi utenti sono considerati fidati
            } 
          }
        );
        console.log(`✅ Rimosso underscore e marcato come verificato: ${user.email} -> ${cleanEmail}`);
      } else {
        // Conflitto! Mantieni l'underscore ma marca come verificato comunque
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { emailVerified: true } }
        );
        console.log(`⚠️  Mantenuto underscore per ${user.email} (esiste già ${cleanEmail}), ma marcato come verificato`);
      }
    }

    // Marca come verificati anche tutti gli altri utenti esistenti che non hanno il campo
    const result = await db.collection('users').updateMany(
      { emailVerified: { $exists: false } },
      { $set: { emailVerified: true } }
    );
    console.log(`✅ Marcati come verificati ${result.modifiedCount} utenti esistenti senza il campo emailVerified`);
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Per sicurezza, non implementiamo il rollback automatico
    // perché potrebbe creare conflitti inaspettati.
    // Se necessario, il rollback deve essere fatto manualmente
    // analizzando caso per caso.
    console.log('⚠️  Rollback non implementato per sicurezza.');
    console.log('Se necessario, ripristinare manualmente gli underscore');
    console.log('per gli utenti che ne avevano bisogno.');
  }
};
