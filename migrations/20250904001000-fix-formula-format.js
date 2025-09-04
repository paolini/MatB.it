module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db) {
    const cursor = db.collection('notes').find({ 
      'delta.ops': { $exists: true }
    });

    let processedCount = 0;
    let skippedCount = 0;

    while (await cursor.hasNext()) {
      const note = await cursor.next();
      
      if (!note.delta || !note.delta.ops || !Array.isArray(note.delta.ops)) {
        skippedCount++;
        continue;
      }

      let needsUpdate = false;
      const newOps = note.delta.ops.map(op => {
        // Controlla se è un'operazione di inserimento con formula nel formato sbagliato
        if (op.insert && 
            typeof op.insert === 'object' && 
            'formula' in op.insert && 
            typeof op.insert.formula === 'string') {
          
          needsUpdate = true;
          console.log(`Fixing formula in note ${note._id}: ${op.insert.formula.substring(0, 50)}...`);
          
          // Determina se era displaystyle (dalla presenza di attributes.displaystyle)
          const isDisplayStyle = op.attributes && op.attributes.displaystyle === true;
          
          // Crea il nuovo formato
          const newInsert = {
            formula: {
              value: op.insert.formula
            }
          };
          
          if (isDisplayStyle) {
            newInsert.formula.displaystyle = true;
          }
          
          // Rimuovi displaystyle dagli attributes se presente
          const newAttributes = op.attributes ? { ...op.attributes } : undefined;
          if (newAttributes && 'displaystyle' in newAttributes) {
            delete newAttributes.displaystyle;
            // Se attributes è ora vuoto, rimuovilo completamente
            if (Object.keys(newAttributes).length === 0) {
              return { insert: newInsert };
            }
          }
          
          return {
            insert: newInsert,
            ...(newAttributes ? { attributes: newAttributes } : {})
          };
        }
        
        return op; // Non modificare operazioni che non hanno il problema
      });

      if (needsUpdate) {
        await db.collection('notes').updateOne(
          { _id: note._id },
          { $set: { 'delta.ops': newOps } }
        );
        
        processedCount++;
        console.log(`Note ${note._id} updated successfully`);
      } else {
        skippedCount++;
      }
    }
    
    console.log(`Migration completed. Processed: ${processedCount}, Skipped: ${skippedCount}`);
  },

  async down(db) {
    const cursor = db.collection('notes').find({ 
      'delta.ops': { $exists: true }
    });

    let processedCount = 0;

    while (await cursor.hasNext()) {
      const note = await cursor.next();
      
      if (!note.delta || !note.delta.ops || !Array.isArray(note.delta.ops)) {
        continue;
      }

      let needsUpdate = false;
      const newOps = note.delta.ops.map(op => {
        // Controlla se è un'operazione con formula nel formato nuovo
        if (op.insert && 
            typeof op.insert === 'object' && 
            'formula' in op.insert && 
            typeof op.insert.formula === 'object' &&
            op.insert.formula &&
            'value' in op.insert.formula) {
          
          needsUpdate = true;
          
          const formula = op.insert.formula;
          const isDisplayStyle = formula.displaystyle === true;
          
          // Torna al formato vecchio
          const newOp = {
            insert: { formula: formula.value }
          };
          
          if (isDisplayStyle) {
            newOp.attributes = { 
              ...op.attributes, 
              displaystyle: true 
            };
          } else if (op.attributes) {
            newOp.attributes = op.attributes;
          }
          
          return newOp;
        }
        
        return op;
      });

      if (needsUpdate) {
        await db.collection('notes').updateOne(
          { _id: note._id },
          { $set: { 'delta.ops': newOps } }
        );
        
        processedCount++;
      }
    }
    
    console.log(`Rollback completed. Processed: ${processedCount} notes`);
  },
};
