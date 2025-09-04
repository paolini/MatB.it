function text_to_delta(inputText) {
    const operations = []
    // Espressione regolare per trovare formule LaTeX:
    // - \$[^$]*\$ : Cattura formule inline (es. $a+b$)
    // - \$\$[^$]*\$\$ : Cattura formule a blocco (es. $$x^2$$)
    // La 'g' alla fine assicura che vengano trovate tutte le occorrenze.
    const formulaRegex = /(\$\$[^$]*\$\$|\$[^$]*\$)/g;
    let lastIndex = 0; // Tiene traccia dell'ultimo indice processato nel testo.
  
    // Sostituisce tutte le occorrenze delle formule trovate.
    // La funzione di callback riceve il match completo, il gruppo catturato (la formula),
    // e l'offset (indice di inizio del match).
    inputText.replace(formulaRegex, (match, formulaContent, offset) => {
      // Se c'è del testo prima della formula corrente, aggiungilo come operazione di testo.
      if (offset > lastIndex) {
        add_text_to_delta(operations, inputText.substring(lastIndex, offset));
      }
  
      // Rimuovi i delimitatori ($ o $$) dalla stringa della formula.
      const cleanFormula= formulaContent
        .replace(/^\$\$|\$\$$/g, '')
        .replace(/^\$|\$$/g, '')
        .replace(/^\s+|\s+$/g, '') // rimuove spazi dall'inizio e dalla fine

      // Determina se la formula è di tipo "display" (racchiusa tra $$)
      let isDisplayFormula = formulaContent.startsWith('$$') && formulaContent.endsWith('$$');
      // Se la formula è all'inizio del testo o preceduta solo da whitespace, forza display
      const before = inputText.substring(lastIndex, offset);
      if (!isDisplayFormula && (offset === 0 || /^\s*$/.test(before))) {
        isDisplayFormula = true;
      }
  
      // Crea l'oggetto embed per la formula
      const formulaEmbed = { formula: cleanFormula };
      if (isDisplayFormula) {
        operations.push({insert: formulaEmbed, attributes: {displaystyle: true}})
      } else {
        operations.push({insert: formulaEmbed});
      }
  
      // Aggiorna l'ultimo indice processato.
      lastIndex = offset + match.length;

      return match // inutile ma fa contento typescript
    });
  
    // Dopo aver processato tutte le formule, aggiungi il testo rimanente (se presente)
    // alla fine del documento.
    if (lastIndex < inputText.length) {
      add_text_to_delta(operations, inputText.substring(lastIndex, inputText.length))
    }
  
    // Restituisce l'oggetto Quill Delta.
    return operations;
}

function add_text_to_delta(opts, text) {
  my_split(text).forEach(line => {
    opts.push({insert: line})
  })
}

function my_split(text) {
  const arr = text
  
  // 1. Spezza la stringa dove ci sono almeno due \n (eventualmente preceduti/seguiti da spazi, \t o \r)
    .split(/[\t\r ]*\n{2,}[\t\r ]*/)

  // 2. Per ogni parte, rimpiazza le sequenze di spazi, \t, \r, \n con un singolo spazio
    .map(part => part.replace(/[\t\r\n ]+/g, ' '))
  
  // rimuove eventuali stringhe vuote
    .filter(p => p.length > 0)

  return arr
  // separa le stringhe con un singolo \n
    .map((str, i) => i < arr.length - 1 ? str + '\n' : str)
}

module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db) {
    // Trova tutte le note che hanno text ma delta.ops vuoto
    const cursor = db.collection('notes').find({ 
      text: { $exists: true },
      $or: [
        { delta: { $exists: false } },
        { 'delta.ops': { $exists: false } },
        { 'delta.ops': { $size: 0 } }
      ]
    });

    let processedCount = 0;
    let skippedCount = 0;

    while (await cursor.hasNext()) {
      const note = await cursor.next();
      
      console.log(`Processing note ${note._id}`);
      
      if (!note.text || note.text.trim() === '') {
        console.log(`Note ${note._id} has no text or empty text, skipping...`);
        skippedCount++;
        continue;
      }
      
      console.log(`Original text for ${note._id}:`, note.text.substring(0, 100) + '...');
      
      const delta = { ops: text_to_delta(note.text) };
      
      console.log(`Generated delta for ${note._id}:`, JSON.stringify(delta, null, 2));

      await db.collection('notes').updateOne(
        { _id: note._id },
        { $set: { delta } }
      );
      
      processedCount++;
      console.log(`Note ${note._id} updated successfully`);
    }
    
    console.log(`Migration completed. Processed: ${processedCount}, Skipped: ${skippedCount}`);
  },

  async down(db) {
    // Reset delta field per tutte le note che hanno text
    const result = await db.collection('notes').updateMany(
      { text: { $exists: true } },
      { $set: { delta: { ops: [] } } }
    );
    
    console.log(`Delta field reset for ${result.modifiedCount} notes`);
  },
};
