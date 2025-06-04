// Migrazione per rinominare il campo displayName in name e photoURL in image nella collezione users.
// Serve a uniformare lo schema utenti a quello richiesto da NextAuth e dal nuovo sistema.

module.exports = {
  async up(db) {
    await db.collection('users').updateMany(
      { displayName: { $exists: true } },
      [
        { $set: { name: "$displayName" } },
        { $unset: "displayName" }
      ]
    );
    await db.collection('users').updateMany(
      { photoURL: { $exists: true } },
      [
        { $set: { image: "$photoURL" } },
        { $unset: "photoURL" }
      ]
    );
  },

  async down(db) {
    await db.collection('users').updateMany(
      { name: { $exists: true } },
      [
        { $set: { displayName: "$name" } },
        { $unset: "name" }
      ]
    );
    await db.collection('users').updateMany(
      { image: { $exists: true } },
      [
        { $set: { photoURL: "$image" } },
        { $unset: "image" }
      ]
    );
  },
};
