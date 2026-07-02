const characters = (value) => Array.from(String(value ?? '').normalize('NFC'));
const isPunctuation = (value) => /[\p{P}\p{S}]/u.test(value);
const isLetter = (value) => /\p{L}/u.test(value);
const HALF_CATEGORIES = new Set(['spacing', 'capitalization', 'punctuation', 'transposition', 'paragraphic']);
const EMPTY_COUNTS = Object.freeze({ omission: 0, addition: 0, spelling: 0, substitution: 0, repetition: 0, incompleteWord: 0, spacing: 0, capitalization: 0, punctuation: 0, transposition: 0, paragraphic: 0 });

const canonicalWord = (value) => String(value).normalize('NFC').toLocaleLowerCase().replace(/[\p{P}\p{S}]/gu, '');

function tokenize(value) {
  const text = String(value ?? '').normalize('NFC').replace(/\r\n?/g, '\n');
  const words = []; let separator = '';
  for (const match of text.matchAll(/\s+|\S+/gu)) {
    if (/^\s+$/u.test(match[0])) separator += match[0];
    else { words.push({ text: match[0], separator, canonical: canonicalWord(match[0]) }); separator = ''; }
  }
  return { words, trailing: separator };
}

/**
 * Finds the maximum ordered set of normalized word matches. These anchors are
 * immutable: unmatched regions are classified without sacrificing later matches.
 */
function longestCommonWordAnchors(source, typed) {
  const width = typed.length + 1;
  const directions = new Uint8Array((source.length + 1) * width);
  let twoBack = new Uint16Array(width); let previous = new Uint16Array(width);
  for (let i = 1; i <= source.length; i += 1) {
    const current = new Uint16Array(width);
    for (let j = 1; j <= typed.length; j += 1) {
      const index = i * width + j;
      const matches = source[i - 1].canonical && source[i - 1].canonical === typed[j - 1].canonical;
      if (matches) { current[j] = previous[j - 1] + 1; directions[index] = 1; }
      else if (previous[j] >= current[j - 1]) { current[j] = previous[j]; directions[index] = 2; }
      else { current[j] = current[j - 1]; directions[index] = 3; }
      const transposed = i > 1 && j > 1 && source[i - 2].canonical && source[i - 2].canonical === typed[j - 1].canonical && source[i - 1].canonical === typed[j - 2].canonical;
      if (transposed && twoBack[j - 2] + 2 >= current[j]) { current[j] = twoBack[j - 2] + 2; directions[index] = 4; }
    }
    twoBack = previous; previous = current;
  }
  const anchors = []; let i = source.length; let j = typed.length;
  while (i && j) {
    const direction = directions[i * width + j];
    if (direction === 1) { anchors.push({ sourceIndex: --i, typedIndex: --j }); }
    else if (direction === 4) { anchors.push({ sourceIndex: i - 2, typedIndex: j - 2, transposition: true }); i -= 2; j -= 2; }
    else if (direction === 2) i -= 1;
    else j -= 1;
  }
  return anchors.reverse();
}

function characterAlignment(sourceValue, typedValue) {
  const source = characters(sourceValue); const typed = characters(typedValue);
  const width = typed.length + 1;
  const costs = new Uint16Array((source.length + 1) * width);
  const directions = new Uint8Array(costs.length);
  for (let i = 1; i <= source.length; i += 1) { costs[i * width] = i; directions[i * width] = 2; }
  for (let j = 1; j <= typed.length; j += 1) { costs[j] = j; directions[j] = 3; }
  for (let i = 1; i <= source.length; i += 1) for (let j = 1; j <= typed.length; j += 1) {
    const index = i * width + j;
    if (source[i - 1] === typed[j - 1]) { costs[index] = costs[(i - 1) * width + j - 1]; directions[index] = 1; continue; }
    let cost = costs[(i - 1) * width + j - 1] + 1; let direction = 4;
    const deletion = costs[(i - 1) * width + j] + 1; if (deletion < cost) { cost = deletion; direction = 2; }
    const insertion = costs[i * width + j - 1] + 1; if (insertion < cost) { cost = insertion; direction = 3; }
    if (i > 1 && j > 1 && source[i - 2] === typed[j - 1] && source[i - 1] === typed[j - 2]) {
      const transpose = costs[(i - 2) * width + j - 2] + 1;
      if (transpose <= cost) { cost = transpose; direction = 5; }
    }
    costs[index] = cost; directions[index] = direction;
  }
  const operations = []; let i = source.length; let j = typed.length;
  while (i || j) {
    const direction = directions[i * width + j];
    if (direction === 1) operations.push({ source: source[--i], typed: typed[--j], equal: true });
    else if (direction === 5) { operations.push({ source: source.slice(i - 2, i).join(''), typed: typed.slice(j - 2, j).join(''), transposed: true }); i -= 2; j -= 2; }
    else if (direction === 4 && i && j) operations.push({ source: source[--i], typed: typed[--j] });
    else if ((direction === 2 || !j) && i) operations.push({ source: source[--i], typed: '' });
    else operations.push({ source: '', typed: typed[--j] });
  }
  return operations.reverse();
}

function missingMarker(category, text) {
  if (category === 'spacing') return '␠';
  if (category === 'paragraphic') return '↵';
  if (category === 'punctuation') return text || '·';
  return '∅';
}

export function compareTexts(sourceValue, typedValue, allErrorsAreFull = false) {
  const source = tokenize(sourceValue); const typed = tokenize(typedValue);
  const counts = { ...EMPTY_COUNTS };
  const alignmentTree = [];
  const characterStats = { correctCharacters: 0, wrongCharacters: 0, omittedCharacters: 0, extraCharacters: 0 };
  const wordStats = { wrongWords: 0, omittedWords: 0, extraWords: 0 };
  const referenceParts = []; const typedParts = []; const referenceReviewParts = []; const typedReviewParts = [];
  const severityFor = (category) => !allErrorsAreFull && HALF_CATEGORIES.has(category) ? 'half' : 'full';
  const push = (parts, text, severity = 'correct', category = 'correct', missing = false) => {
    if (!text) return;
    const previous = parts.at(-1);
    if (!missing && !previous?.missing && previous?.severity === severity && previous?.category === category) previous.text += text;
    else parts.push({ text, severity, category, ...(missing && { missing: true }) });
  };
  const record = (category, sourceText, typedText, amount = 1) => {
    counts[category] += amount; const severity = severityFor(category);
    alignmentTree.push({ sourceText, typedText, category, severity });
    for (const operation of characterAlignment(sourceText, typedText)) {
      const sourceLength = characters(operation.source).length; const typedLength = characters(operation.typed).length;
      if (operation.equal) characterStats.correctCharacters += sourceLength;
      else { const paired = Math.min(sourceLength, typedLength); characterStats.wrongCharacters += paired; characterStats.omittedCharacters += sourceLength - paired; characterStats.extraCharacters += typedLength - paired; }
    }
    if (sourceText) { push(referenceParts, sourceText, severity, category); push(referenceReviewParts, sourceText, severity, category); }
    else push(referenceReviewParts, missingMarker(category, typedText), severity, category, true);
    if (typedText) { push(typedParts, typedText, severity, category); push(typedReviewParts, typedText, severity, category); }
    else push(typedReviewParts, missingMarker(category, sourceText), severity, category, true);
  };
  const equal = (sourceText, typedText) => {
    if (sourceText || typedText) alignmentTree.push({ sourceText, typedText, category: 'correct', severity: 'correct' });
    characterStats.correctCharacters += characters(sourceText).length;
    push(referenceParts, sourceText); push(referenceReviewParts, sourceText);
    push(typedParts, typedText); push(typedReviewParts, typedText);
  };
  const compareSeparators = (left, right) => {
    if (left === right) equal(left, right);
    else record(/[\n\r]/u.test(left + right) ? 'paragraphic' : 'spacing', left, right);
  };
  const compareWords = (left, right) => {
    if (left === right) { equal(left, right); return; }
    const operations = characterAlignment(left, right);
    for (let cursor = 0; cursor < operations.length;) {
      if (operations[cursor].equal) { const operation = operations[cursor++]; equal(operation.source, operation.typed); continue; }
      let end = cursor + 1; while (end < operations.length && !operations[end].equal) end += 1;
      const run = operations.slice(cursor, end);
      const sourceText = run.map((operation) => operation.source).join(''); const typedText = run.map((operation) => operation.typed).join('');
      let category;
      if (run.length === 1 && run[0].transposed) category = 'transposition';
      else if (sourceText && typedText && sourceText.localeCompare(typedText, undefined, { sensitivity: 'accent' }) === 0) category = 'capitalization';
      else if ([...sourceText, ...typedText].length && [...sourceText, ...typedText].every(isPunctuation)) category = 'punctuation';
      else if (!typedText && sourceText) category = 'incompleteWord';
      else if ([...sourceText, ...typedText].every(isLetter)) category = 'spelling';
      else category = 'substitution';
      record(category, sourceText, typedText); cursor = end;
    }
  };

  const sourceFrequency = source.words.reduce((map, word) => map.set(word.canonical, (map.get(word.canonical) || 0) + 1), new Map());
  const typedFrequency = typed.words.reduce((map, word) => map.set(word.canonical, (map.get(word.canonical) || 0) + 1), new Map());
  const omit = (word) => { wordStats.omittedWords += 1; record('omission', word.separator + word.text, ''); };
  const add = (word) => {
    const sourceCount = sourceFrequency.get(word.canonical) || 0;
    const repetition = sourceCount > 0 && (typedFrequency.get(word.canonical) || 0) > sourceCount;
    wordStats.extraWords += 1; record(repetition ? 'repetition' : 'addition', '', word.separator + word.text);
  };
  const pair = (sourceWord, typedWord) => {
    const fullBefore = counts.omission + counts.addition + counts.spelling + counts.substitution + counts.repetition + counts.incompleteWord;
    compareSeparators(sourceWord.separator, typedWord.separator); compareWords(sourceWord.text, typedWord.text);
    const fullAfter = counts.omission + counts.addition + counts.spelling + counts.substitution + counts.repetition + counts.incompleteWord;
    if (fullAfter > fullBefore) wordStats.wrongWords += 1;
  };
  const resolveRegion = (sourceRegion, typedRegion) => {
    if (!sourceRegion.length) { typedRegion.forEach(add); return; }
    if (!typedRegion.length) { sourceRegion.forEach(omit); return; }
    if (sourceRegion.length === 2 && typedRegion.length === 2 && sourceRegion[0].canonical === typedRegion[1].canonical && sourceRegion[1].canonical === typedRegion[0].canonical) {
      wordStats.wrongWords += 2;
      record('transposition', sourceRegion.map((word) => word.separator + word.text).join(''), typedRegion.map((word) => word.separator + word.text).join('')); return;
    }
    if (sourceRegion.length === 2 && typedRegion.length === 1 && sourceRegion.map((word) => word.canonical).join('') === typedRegion[0].canonical) {
      compareSeparators(sourceRegion[0].separator, typedRegion[0].separator); compareWords(sourceRegion[0].text, typedRegion[0].text.slice(0, sourceRegion[0].text.length));
      compareSeparators(sourceRegion[1].separator, ''); compareWords(sourceRegion[1].text, typedRegion[0].text.slice(sourceRegion[0].text.length)); return;
    }
    if (sourceRegion.length === 1 && typedRegion.length === 2 && sourceRegion[0].canonical === typedRegion.map((word) => word.canonical).join('')) {
      compareSeparators(sourceRegion[0].separator, typedRegion[0].separator); compareWords(sourceRegion[0].text.slice(0, typedRegion[0].text.length), typedRegion[0].text);
      compareSeparators('', typedRegion[1].separator); compareWords(sourceRegion[0].text.slice(typedRegion[0].text.length), typedRegion[1].text); return;
    }
    const paired = Math.min(sourceRegion.length, typedRegion.length);
    for (let index = 0; index < paired; index += 1) pair(sourceRegion[index], typedRegion[index]);
    sourceRegion.slice(paired).forEach(omit); typedRegion.slice(paired).forEach(add);
  };

  const anchors = longestCommonWordAnchors(source.words, typed.words);
  let sourceCursor = 0; let typedCursor = 0;
  for (const anchor of [...anchors, { sourceIndex: source.words.length, typedIndex: typed.words.length, terminal: true }]) {
    resolveRegion(source.words.slice(sourceCursor, anchor.sourceIndex), typed.words.slice(typedCursor, anchor.typedIndex));
    if (anchor.transposition) {
      wordStats.wrongWords += 2;
      record('transposition', source.words.slice(anchor.sourceIndex, anchor.sourceIndex + 2).map((word) => word.separator + word.text).join(''), typed.words.slice(anchor.typedIndex, anchor.typedIndex + 2).map((word) => word.separator + word.text).join(''));
      sourceCursor = anchor.sourceIndex + 2; typedCursor = anchor.typedIndex + 2;
    } else {
      if (!anchor.terminal) pair(source.words[anchor.sourceIndex], typed.words[anchor.typedIndex]);
      sourceCursor = anchor.sourceIndex + 1; typedCursor = anchor.typedIndex + 1;
    }
  }
  compareSeparators(source.trailing, typed.trailing);
  const halfErrors = allErrorsAreFull ? 0 : [...HALF_CATEGORIES].reduce((sum, category) => sum + counts[category], 0);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const referenceCharacters = characters(String(sourceValue ?? '').normalize('NFC').replace(/\r\n?/g, '\n')).length;
  const typedCharacters = characters(String(typedValue ?? '').normalize('NFC').replace(/\r\n?/g, '\n')).length;
  return {
    alignmentTree, counts, fullErrors: total - halfErrors, halfErrors, weightedErrors: total - halfErrors * 0.5,
    referenceCharacters, typedCharacters, ...characterStats,
    totalErrors: characterStats.wrongCharacters + characterStats.omittedCharacters + characterStats.extraCharacters,
    referenceWords: source.words.length, typedWords: typed.words.length, ...wordStats,
    totalWordErrors: wordStats.wrongWords + wordStats.omittedWords + wordStats.extraWords,
    referenceParts, typedParts, referenceReviewParts, typedReviewParts
  };
}
