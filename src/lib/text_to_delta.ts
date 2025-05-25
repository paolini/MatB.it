/**
 * Converte un testo contenente formule LaTeX (delimitate da $ o $$)
 * in un oggetto Quill Delta. Le formule vengono rappresentate come embed "formula".
 * Le formule racchiuse tra $$ avranno anche l'attributo "display: true".
 *
 * @param {string} inputText Il testo da convertire.
 * @returns {object} Un oggetto Quill Delta con la struttura { ops: [...] }.
 */

type FORMULA =  { formula: string } 
type OP = { insert: string | FORMULA, attributes?:{displaystyle: boolean} }

export function text_to_delta(inputText: string): any {
    const operations: OP[] = []
    // Espressione regolare per trovare formule LaTeX:
    // - \$[^$]*\$ : Cattura formule inline (es. $a+b$)
    // - \$\$[^$]*\$\$ : Cattura formule a blocco (es. $$x^2$$)
    // La 'g' alla fine assicura che vengano trovate tutte le occorrenze.
    const formulaRegex = /(\$\$[^$]*\$\$|\$[^$]*\$)/g;
    let lastIndex: number = 0; // Tiene traccia dell'ultimo indice processato nel testo.
  
    // Sostituisce tutte le occorrenze delle formule trovate.
    // La funzione di callback riceve il match completo, il gruppo catturato (la formula),
    // e l'offset (indice di inizio del match).
    inputText.replace(formulaRegex, (match: string, formulaContent: string, offset: number) => {
      // Se c'è del testo prima della formula corrente, aggiungilo come operazione di testo.
      if (offset > lastIndex) {
        add_text_to_delta(operations, inputText.substring(lastIndex, offset));
      }
  
      // Rimuovi i delimitatori ($ o $$) dalla stringa della formula.
      const cleanFormula: string = formulaContent
        .replace(/^\$\$|\$\$$/g, '')
        .replace(/^\$|\$$/g, '')
        .replace(/^\s+|\s+$/g, '') // rimuove spazi dall'inizio e dalla fine

      // Determina se la formula è di tipo "display" (racchiusa tra $$)
      const isDisplayFormula: boolean = formulaContent.startsWith('$$') && formulaContent.endsWith('$$');
  
      // Crea l'oggetto embed per la formula
      const formulaEmbed: FORMULA = { formula: cleanFormula };
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

function add_text_to_delta(opts: any[], text:string) {
  my_split(text).forEach(line => {
    opts.push({insert: line})
  })
}

function my_split(text: string) {
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