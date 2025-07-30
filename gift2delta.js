#!/usr/bin/env node

test_input = `// question: 49382 name: controimmagine
::controimmagine::[html]<p></p><p>Sia \\( f\\colon \\{1,2,3\\}\\to \\{1,2,3,4\\} \\) la funzione definita da<br>$$<br>  f = \\{ 1\\mapsto 3, 2\\mapsto 3, 3\\mapsto 1\\}.<br>$$<br>Allora l'insieme \\( f^{-1}(\\{2,3\\}) \\) è</p><p></p>{
=<p>\\( \\{1,2\\} \\)</p>
~<p>\\( \\{2,3\\} \\)</p>
~<p>\\( \\emptyset \\)</p>
~<p>\\( (1,2) \\)</p>
}`

const readline = require('readline');
const { createContext } = require('vm');
const { MongoClient, ObjectId } = require('mongodb');

function extractTextAndFormulas(html) {
  // Semplice estrattore: separa testo e formule LaTeX (\( ... \), $$ ... $$)
  // e rimuove tag HTML basilari.
  const ops = [];
  let text = html
    .replace(/\\(.)/g, '$1') // unescape 
    .replace(/<p[^>]*>/g, '') // rimuove solo il tag di apertura <p ...>
    .replace(/<\/p>/g, '')   // rimuove solo il tag di chiusura </p>
    .replace(/<br\s*\/?>(?![^<]*<\/p>)/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/^[\n]*|[\n]*$/g, '') // rimuove spazi all'inizio e alla fine
    .replace(/&lt;/g, '<') // unescape
    .replace(/&gt;/g, '>') // unescape
//    .replace(/<[^>]+>/g, ''); // rimuove altri tag HTML

  // Regex per formule LaTeX
  const regex = /(\$\$.*?\$\$|\\\(.*?\\\)|\\\[.*?\\\])/gs;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      ops.push({ insert: text.slice(lastIndex, match.index) });
    }
    let value = match[0]
      .replace(/^\$\$|^\\\(|^\\\[|\\\)$|\\\]$|\$\$$/g, '') // rimuove delimitatori
      .trim();
    ops.push({
      insert: {
        formula: {
          value,
          displaystyle: /^\$\$|^\\\[/.test(match[0])
        }
      }
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    ops.push({ insert: text.slice(lastIndex) });
  }
  return ops;
}

function parseGiftToDelta(input) {
  // Split input in righe e separa domanda e risposte in modo robusto
  const lines = input.split(/\r?\n/).map(l => l.trim());
  let ops = [];
  let firstAnswer = true;
  const deltas = [];
  let title = '';
  let id = ''

  for (const line of lines) {
    if (line == '') {
      // completata domanda
      if (ops.length > 0) deltas.push({ title, id, ops });
      ops = []
      firstAnswer = true
      title = ''
      id = ''
    }
    if (line.startsWith('//')) {
      // expect: \/\/ question: 49383  name: composizione
      const [, questionId, questionName] = line.match(/\/\/ question: (\d+)  name: (.+)/) || [];
      if (questionId && questionName) {
        id = questionId
        title = questionName
      }
      continue; // salta la riga con commento
    }
    if (line.startsWith('::')) {
      ops.push(...extractTextAndFormulas(line.split('[html]')[1].replace(/{$/, '').trim()));
      ops.push({insert: "\n"})
    }
    if (line.startsWith('=') || line.startsWith('~')) {
      const isCorrect = line.startsWith('=');
      const isDefault = (firstAnswer && isCorrect) || (!firstAnswer && !isCorrect);
      firstAnswer = false
      const list = isDefault ? {
        list: 'choice'
      } : {
        list: 'choice',
        score: isCorrect ? 1 : 0
      }
      const ansText = line
        .replace(/^=|^~/, '')
        .replace(/^\n*|\n*$/g, '')
        .replace(/^\s*<p>|<\/p>\s*$/g, '') // rimuove <p> e </p>
      if (ansText) {
//        ops.push("answer: ");
        ops.push(...extractTextAndFormulas(ansText));
        if (ops.length > 0 && ops[ops.length - 1].insert === '\n') {
          ops.pop(); // rimuove l'ultimo \n se c'è
        }
        ops.push({
          attributes: { list },
          insert: '\n'
        });
      }
    }
  }
  return deltas;
}

const args = process.argv.slice(2);
const doInsert = args.includes('--insert');
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB || 'matbit';

const now = new Date().toISOString();
const author_id = new ObjectId('683fe820c25aac9b42af9327');

let input = '';
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', line => { input += line + '\n'; });
rl.on('close', async () => {
  const deltas = parseGiftToDelta(input);
  if (doInsert) {
    // Inserimento diretto su MongoDB
    const client = new MongoClient(mongoUrl);
    try {
      await client.connect();
      const db = client.db(dbName);
      for (const note of deltas) {
        const noteVersionDoc = {
          title: note.title,
          delta: Array.isArray(note.ops) ? { ops: note.ops } : note.ops,
          created_on: new Date(now),
          author_id: author_id
        };
        const versionResult = await db.collection('note_versions').insertOne(noteVersionDoc);
        const noteDoc = {
          title: note.title,
          variant: 'question',
          delta: Array.isArray(note.ops) ? { ops: note.ops } : note.ops,
          note_version_id: versionResult.insertedId,
          created_on: new Date(now),
          private: false,
          author_id: author_id
        };
        const noteResult = await db.collection('notes').insertOne(noteDoc);
        console.log(`Inserted note_version _id: ${versionResult.insertedId}, note _id: ${noteResult.insertedId}`);
      }
    } catch (err) {
      console.error('MongoDB insert error:', err);
      process.exit(1);
    } finally {
      await client.close();
    }
  } else {
    // Output comandi MongoDB
    deltas.forEach(note => {
      const noteVersionStr = `{
        title: ${JSON.stringify(note.title)},
        delta: ${Array.isArray(note.ops) ? JSON.stringify({ops:note.ops}, null, 2) : note.ops},
        created_on: ISODate(${JSON.stringify(now)}),
        author_id: ObjectId('683fe820c25aac9b42af9327')
      }`;
      console.log(`const versionResult = db.note_versions.insertOne(${noteVersionStr});`);
      const noteDocStr = `{
        title: ${JSON.stringify(note.title)},
        variant: 'question',
        delta: ${Array.isArray(note.ops) ? JSON.stringify({ops:note.ops}, null, 2) : note.ops},
        note_version_id: versionResult.insertedId,
        created_on: ISODate(${JSON.stringify(now)}),
        private: false,
        author_id: ObjectId('683fe820c25aac9b42af9327')
      }`;
      console.log(`db.notes.insertOne(${noteDocStr})`);
    });
  }
});
