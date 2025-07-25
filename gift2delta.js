#!/usr/bin/env node

test_input = `// question: 49382 name: controimmagine
::controimmagine::[html]<p></p><p>Sia \\( f\\colon \\{1,2,3\\}\\to \\{1,2,3,4\\} \\) la funzione definita da<br>$$<br>  f = \\{ 1\\mapsto 3, 2\\mapsto 3, 3\\mapsto 1\\}.<br>$$<br>Allora l'insieme \\( f^{-1}(\\{2,3\\}) \\) è</p><p></p>{
=<p>\\( \\{1,2\\} \\)</p>
~<p>\\( \\{2,3\\} \\)</p>
~<p>\\( \\emptyset \\)</p>
~<p>\\( (1,2) \\)</p>
}`

/* expected output:
{
  "ops": [
    {
      "insert": "[49383]\nSia "
    },
    {
      "insert": {
        "formula": {
          "value": "x \\mapsto f(x)",
          "displaystyle": false
        }
      }
    },
    {
      "insert": " tale che"
    },
    {
      "insert": {
        "formula": {
          "value": "",
          "displaystyle": false
        }
      }
    },
    {
      "insert": {
        "formula": {
          "value": "f\\colon \\{1,2,3\\}\\to \\{1,2,3,4\\}",
          "displaystyle": true
        }
      }
    },
    {
      "insert": {
        "formula": {
          "value": "",
          "displaystyle": false
        }
      }
    },
    {
      "insert": "la funzione definita da"
    },
    {
      "insert": {
        "formula": {
          "value": "f = \\{ 1\\mapsto 3, 2\\mapsto 3, 3\\mapsto 1\\}.",
          "displaystyle": true
        }
      }
    },
    {
      "insert": "Allora "
    },
    {
      "insert": {
        "formula": {
          "value": " (f\\circ f)(3)",
          "displaystyle": false
        }
      }
    },
    {
      "insert": {
        "formula": {
          "value": "",
          "displaystyle": false
        }
      }
    },
    {
      "insert": " è uguale a...\n\t"
    },
    {
      "insert": {
        "formula": {
          "value": "3",
          "displaystyle": false
        }
      }
    },
    {
      "insert": {
        "formula": {
          "value": "",
          "displaystyle": false
        }
      }
    },
    {
      "attributes": {
        "list": {
          "list": "choice"
        }
      },
      "insert": "\n"
    },
    {
      "insert": "\t"
    },
    {
      "insert": {
        "formula": {
          "value": "1",
          "displaystyle": false
        }
      }
    },
    {
      "insert": {
        "formula": {
          "value": "",
          "displaystyle": false
        }
      }
    },
    {
      "attributes": {
        "list": {
          "list": "choice"
        }
      },
      "insert": "\n"
    },
    {
      "insert": "\t"
    },
    {
      "insert": {
        "formula": {
          "value": "",
          "displaystyle": false
        }
      }
    },
    {
      "insert": {
        "formula": {
          "value": "2",
          "displaystyle": false
        }
      }
    },
    {
      "insert": " "
    },
    {
      "attributes": {
        "list": {
          "list": "choice"
        }
      },
      "insert": "\n"
    },
    {
      "insert": "\t"
    },
    {
      "insert": {
        "formula": {
          "value": "(1,1)",
          "displaystyle": false
        }
      }
    },
    {
      "attributes": {
        "list": {
          "list": "choice"
        }
      },
      "insert": "\n"
    },
    {
      "insert": "\n"
    }
  ]
}
*/

const readline = require('readline');

function extractTextAndFormulas(html) {
  // Semplice estrattore: separa testo e formule LaTeX (\( ... \), $$ ... $$)
  // e rimuove tag HTML basilari.
  const ops = [];
  let text = html
    .replace(/<p>|<\/p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ''); // rimuove altri tag HTML

  // Regex per formule LaTeX
  const regex = /(\$\$.*?\$\$|\\\([^\)]*\\\)|\\\[[^\]]*\\\])/gs;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      ops.push({ insert: text.slice(lastIndex, match.index) });
    }
    let value = match[0]
      .replace(/^\$\$|^\(\\|^\\\[|\\\)$|\\\]$|\$\$$/g, '') // rimuove delimitatori
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
  let questionLines = [];
  let answerLines = [];
  let inAnswers = false;
  let inQuestion = false;
  for (const line of lines) {
    if (!inQuestion && line.startsWith('/')) {
      inQuestion = true;
      continue; // salta la riga con /
    }
    // Escludi la riga che inizia con '::' e contiene '[html]'
    if (inQuestion && line.startsWith('::') && line.includes('[html]')) {
      continue;
    }
    if (inQuestion && (line.startsWith('=') || line.startsWith('~'))) {
      inAnswers = true;
      inQuestion = false;
    }
    if (inAnswers) {
      if (line.startsWith('=') || line.startsWith('~')) {
        answerLines.push(line);
      }
    } else if (inQuestion) {
      if (line !== '' && line !== '{' && line !== '}') {
        questionLines.push(line);
      }
    }
  }

  const ops = [];
  if (questionLines.length > 0) {
    ops.push(...extractTextAndFormulas(questionLines.join(' ')));
  }

  if (answerLines.length > 0) {
    for (const ans of answerLines) {
      const isCorrect = ans.startsWith('=');
      const ansText = ans.replace(/^=|^~/, '').trim();
      if (ansText) {
        ops.push({ insert: '\t' });
        ops.push(...extractTextAndFormulas(ansText));
        ops.push({
          attributes: { list: { list: 'choice' } },
          insert: '\n'
        });
      }
    }
    ops.push({ insert: '\n' });
  }
  return { ops };
}

process.stdout.write(JSON.stringify(parseGiftToDelta(test_input), null, 2) + '\n');
/*

// Leggi tutto lo stdin
let input = '';
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', line => { input += line + '\n'; });
rl.on('close', () => {
  const delta = parseGiftToDelta(input);
  process.stdout.write(JSON.stringify(delta, null, 2));
});
*/