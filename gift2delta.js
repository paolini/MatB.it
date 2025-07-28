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

function extractTextAndFormulas(html) {
  // Semplice estrattore: separa testo e formule LaTeX (\( ... \), $$ ... $$)
  // e rimuove tag HTML basilari.
  const ops = [];
  let text = html
    .replace(/\\(.)/g, '$1') // unescape 
    .replace(/<p>|<\/p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/^\n*|\n*$/g, '') // rimuove spazi all'inizio e alla fine
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

if (false) {
  process.stdout.write(JSON.stringify(parseGiftToDelta(test_input), null, 2) + '\n');
}

const now = new Date().toISOString();
const author_id = 'ObjectId("687cc301fd6ed5d69eebfbbb")';

// Leggi tutto lo stdin
let input = '';
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', line => { input += line + '\n'; });
rl.on('close', () => {
  const deltas = parseGiftToDelta(input);
  deltas.forEach(note => {
    // Lascia che MongoDB generi l'ObjectId per la NoteVersion
    // Costruisci manualmente la stringa per db.note_versions.insertOne, author_id letterale
    const noteVersionStr = `{
      title: ${JSON.stringify(note.title)},
      delta: ${Array.isArray(note.ops) ? JSON.stringify({ops:note.ops}, null, 2) : note.ops},
      created_on: ISODate(${JSON.stringify(now)}),
      author_id: ${author_id}
    }`;
    // Inserisci la NoteVersion e salva l'_id generato
    console.log(`const versionResult = db.note_versions.insertOne(${noteVersionStr});`);
    // Costruisci manualmente la stringa per db.notes.insertOne, senza apici su versionResult.insertedId
    const noteDocStr = `{
      title: ${JSON.stringify(note.title)},
      variant: 'question',
      delta: ${Array.isArray(note.ops) ? JSON.stringify({ops:note.ops}, null, 2) : note.ops},
      note_version_id: versionResult.insertedId,
      created_on: ISODate(${JSON.stringify(now)}),
      private: false,
      author_id: ${author_id}
    }`;
    console.log(`db.notes.insertOne(${noteDocStr})`);
  });
});
