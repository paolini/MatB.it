module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('🎓 Inizia migrazione sistema classi...');
    
    // 1. Crea la collezione classes se non esiste
    const collections = await db.listCollections().toArray();
    const classesExists = collections.some(col => col.name === 'classes');
    
    if (!classesExists) {
      await db.createCollection('classes');
      console.log('✅ Creata collezione classes');
    }
    
    // 2. Crea indici per la collezione classes
    await db.collection('classes').createIndex({ owner_id: 1 });
    await db.collection('classes').createIndex({ teachers: 1 });
    await db.collection('classes').createIndex({ students: 1 });
    await db.collection('classes').createIndex({ active: 1 });
    await db.collection('classes').createIndex({ name: 1, owner_id: 1, active: 1 });
    console.log('✅ Creati indici per classes');
    
    // 3. Crea la collezione deleted_classes se non esiste
    const deletedClassesExists = collections.some(col => col.name === 'deleted_classes');
    if (!deletedClassesExists) {
      await db.createCollection('deleted_classes');
      console.log('✅ Creata collezione deleted_classes');
    }
    
    // 4. Aggiungi indici per le collezioni notes e tests per supportare class_id
    await db.collection('notes').createIndex({ class_id: 1 });
    await db.collection('notes').createIndex({ class_id: 1, private: 1 });
    await db.collection('notes').createIndex({ author_id: 1, class_id: 1 });
    console.log('✅ Creati indici class_id per notes');
    
    await db.collection('tests').createIndex({ class_id: 1 });
    await db.collection('tests').createIndex({ class_id: 1, private: 1 });
    await db.collection('tests').createIndex({ author_id: 1, class_id: 1 });
    console.log('✅ Creati indici class_id per tests');
    
    // 5. Indici compositi per performance delle query di visibilità
    await db.collection('notes').createIndex({ 
      class_id: 1, 
      private: 1, 
      updated_on: -1 
    }, { name: 'class_visibility_updated' });
    
    await db.collection('tests').createIndex({ 
      class_id: 1, 
      private: 1, 
      created_on: -1 
    }, { name: 'class_visibility_created' });
    
    console.log('✅ Creati indici compositi per performance');
    
    // 6. Verifica che tutti i documenti note e test abbiano i campi corretti
    const notesStats = await db.collection('notes').updateMany(
  { class_id: { $exists: false } },
  { $set: { class_id: null } }
    );
    
    const testsStats = await db.collection('tests').updateMany(
  { class_id: { $exists: false } },
  { $set: { class_id: null } }
    );
    
    console.log(`✅ Aggiornati ${notesStats.modifiedCount} documenti notes`);
    console.log(`✅ Aggiornati ${testsStats.modifiedCount} documenti tests`);
    
    console.log('🎉 Migrazione sistema classi completata!');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('⚠️ Rollback migrazione sistema classi...');
    
    // 1. Rimuovi gli indici specifici per le classi dalle collezioni notes e tests
    try {
      await db.collection('notes').dropIndex({ class_id: 1 });
      await db.collection('notes').dropIndex({ class_id: 1, private: 1 });
      await db.collection('notes').dropIndex({ author_id: 1, class_id: 1 });
      await db.collection('notes').dropIndex('class_visibility_updated');
      console.log('✅ Rimossi indici class_id da notes');
    } catch (error) {
      console.log('⚠️ Alcuni indici notes non trovati:', error.message);
    }
    
    try {
      await db.collection('tests').dropIndex({ class_id: 1 });
      await db.collection('tests').dropIndex({ class_id: 1, private: 1 });
      await db.collection('tests').dropIndex({ author_id: 1, class_id: 1 });
      await db.collection('tests').dropIndex('class_visibility_created');
      console.log('✅ Rimossi indici class_id da tests');
    } catch (error) {
      console.log('⚠️ Alcuni indici tests non trovati:', error.message);
    }
    
    // 2. Rimuovi il campo class_id da note e test esistenti
    await db.collection('notes').updateMany(
      { class_id: { $exists: true } },
      { $unset: { class_id: 1 } }
    );
    
    await db.collection('tests').updateMany(
      { class_id: { $exists: true } },
      { $unset: { class_id: 1 } }
    );
    
    console.log('✅ Rimosso campo class_id da notes e tests');
    
    // 3. Nota: Non eliminiamo le collezioni classes e deleted_classes
    // perché potrebbero contenere dati importanti
    console.log('⚠️ Le collezioni classes e deleted_classes sono state mantenute');
    console.log('⚠️ Per rimuoverle completamente, fallo manualmente se necessario');
    
    console.log('✅ Rollback completato');
  }
};