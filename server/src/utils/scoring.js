const segmentCharacters = (value) => Array.from(String(value ?? '').normalize('NFC'));
const segmentWords = (value) => String(value ?? '').normalize('NFC').match(/\S+/gu) || [];

export function alignWords(source, typed) {
  const target = segmentWords(source);
  const input = segmentWords(typed);
  const width = input.length + 1;
  let previousCost = new Uint32Array(width); let previousWrong = new Uint32Array(width); let previousOmitted = new Uint32Array(width); let previousExtra = new Uint32Array(width);
  for (let index = 0; index < width; index += 1) { previousCost[index] = index; previousExtra[index] = index; }
  for (let i = 1; i <= target.length; i += 1) {
    const cost = new Uint32Array(width); const wrong = new Uint32Array(width); const omitted = new Uint32Array(width); const extra = new Uint32Array(width);
    cost[0] = i; omitted[0] = i;
    for (let j = 1; j <= input.length; j += 1) {
      if (target[i - 1] === input[j - 1]) { cost[j] = previousCost[j - 1]; wrong[j] = previousWrong[j - 1]; omitted[j] = previousOmitted[j - 1]; extra[j] = previousExtra[j - 1]; continue; }
      const substitution = previousCost[j - 1] + 1; const deletion = previousCost[j] + 1; const insertion = cost[j - 1] + 1;
      if (substitution <= deletion && substitution <= insertion) { cost[j] = substitution; wrong[j] = previousWrong[j - 1] + 1; omitted[j] = previousOmitted[j - 1]; extra[j] = previousExtra[j - 1]; }
      else if (deletion <= insertion) { cost[j] = deletion; wrong[j] = previousWrong[j]; omitted[j] = previousOmitted[j] + 1; extra[j] = previousExtra[j]; }
      else { cost[j] = insertion; wrong[j] = wrong[j - 1]; omitted[j] = omitted[j - 1]; extra[j] = extra[j - 1] + 1; }
    }
    previousCost = cost; previousWrong = wrong; previousOmitted = omitted; previousExtra = extra;
  }
  return { typedWords: input.length, referenceWords: target.length, wrongWords: previousWrong[input.length], omittedWords: previousOmitted[input.length], extraWords: previousExtra[input.length], totalWordErrors: previousCost[input.length] };
}

/**
 * Computes a Unicode code-point edit alignment using rolling rows.
 * Substitution = wrong, target deletion = omitted, input insertion = extra.
 */
export function alignCharacters(source, typed) {
  const target = segmentCharacters(source);
  const input = segmentCharacters(typed);
  const maximumBand = Math.max(target.length, input.length);
  let band = Math.min(maximumBand, Math.max(32, Math.abs(target.length - input.length) + 16));
  let alignment;
  do {
    alignment = alignWithinBand(target, input, band);
    if (alignment.totalErrors <= band || band >= maximumBand) break;
    band = Math.min(maximumBand, band * 2);
  } while (true);
  return { ...alignment, referenceCharacters: target.length, typedCharacters: input.length };
}

const isWhitespace = (value) => /\s/u.test(value);
const isLineBreak = (value) => value === '\n' || value === '\r';
const isPunctuation = (value) => /[\p{P}\p{S}]/u.test(value);
const isLetter = (value) => /\p{L}/u.test(value);

/**
 * Builds the canonical, character-level edit script used for both scoring and UI.
 * Costs are computed with rolling rows; only one byte per cell is retained for
 * backtracking, keeping normal exam passages comfortably bounded in memory.
 */
function classifyErrorsLegacy(sourceValue, typedValue, allErrorsAreFull = false) {
  const sourceAll = segmentCharacters(sourceValue.replace(/\r\n?/g, '\n'));
  const typedAll = segmentCharacters(typedValue.replace(/\r\n?/g, '\n'));
  if (!typedAll.length && sourceAll.length) {
    const omittedWords = Math.max(1, segmentWords(sourceValue).length);
    const counts = { omission: omittedWords, addition: 0, spelling: 0, substitution: 0, repetition: 0, incompleteWord: 0, spacing: 0, capitalization: 0, punctuation: 0, transposition: 0, paragraphic: 0 };
    return { counts, fullErrors: omittedWords, halfErrors: 0, weightedErrors: omittedWords, referenceParts: [{ text: sourceAll.join(''), severity: 'full', category: 'omission' }], typedParts: [] };
  }
  const sourceWords = segmentWords(sourceValue); const typedWords = segmentWords(typedValue);
  const frequencies = (words) => words.reduce((counts, word) => counts.set(word, (counts.get(word) || 0) + 1), new Map());
  const sourceFrequency = frequencies(sourceWords); const typedFrequency = frequencies(typedWords);
  const typedTokens = []; let tokenStart = -1;
  for (let index = 0; index <= typedAll.length; index += 1) {
    if (index < typedAll.length && !isWhitespace(typedAll[index])) { if (tokenStart < 0) tokenStart = index; }
    else if (tokenStart >= 0) { typedTokens.push({ text: typedAll.slice(tokenStart, index).join(''), start: tokenStart }); tokenStart = -1; }
  }
  const repeatedToken = typedTokens.find((token, index) => index > 0 && token.text === typedTokens[index - 1].text && typedFrequency.get(token.text) > (sourceFrequency.get(token.text) || 0));
  const repetitionStart = repeatedToken?.start;
  let prefixLength = 0;
  while (prefixLength < sourceAll.length && prefixLength < typedAll.length && (repetitionStart == null || prefixLength < repetitionStart) && sourceAll[prefixLength] === typedAll[prefixLength]) prefixLength += 1;
  let suffixLength = 0;
  while (suffixLength < sourceAll.length - prefixLength && suffixLength < typedAll.length - prefixLength && sourceAll[sourceAll.length - 1 - suffixLength] === typedAll[typedAll.length - 1 - suffixLength]) suffixLength += 1;
  const source = sourceAll.slice(prefixLength, suffixLength ? sourceAll.length - suffixLength : sourceAll.length);
  const typed = typedAll.slice(prefixLength, suffixLength ? typedAll.length - suffixLength : typedAll.length);
  const width = typed.length + 1;
  const directions = new Uint8Array((source.length + 1) * width);
  let previous = Uint32Array.from({ length: width }, (_, index) => index);
  for (let j = 1; j <= typed.length; j += 1) directions[j] = 3;
  for (let i = 1; i <= source.length; i += 1) {
    const current = new Uint32Array(width); current[0] = i; directions[i * width] = 2;
    for (let j = 1; j <= typed.length; j += 1) {
      const index = i * width + j;
      if (source[i - 1] === typed[j - 1]) { current[j] = previous[j - 1]; directions[index] = 1; continue; }
      const substitute = previous[j - 1] + 1; const omit = previous[j] + 1; const add = current[j - 1] + 1;
      if (substitute <= omit && substitute <= add) { current[j] = substitute; directions[index] = 4; }
      else if (omit <= add) { current[j] = omit; directions[index] = 2; }
      else { current[j] = add; directions[index] = 3; }
    }
    previous = current;
  }
  const operations = []; let i = source.length; let j = typed.length;
  while (i || j) {
    const move = directions[i * width + j];
    if (move === 1) { operations.push({ source: source[--i], typed: typed[--j], equal: true }); }
    else if (move === 4) { operations.push({ source: source[--i], typed: typed[--j] }); }
    else if (move === 2 || j === 0) { operations.push({ source: source[--i], typed: '' }); }
    else { operations.push({ source: '', typed: typed[--j] }); }
  }
  operations.reverse();
  if (prefixLength) operations.unshift(...sourceAll.slice(0, prefixLength).map((character) => ({ source: character, typed: character, equal: true })));
  if (suffixLength) operations.push(...sourceAll.slice(sourceAll.length - suffixLength).map((character) => ({ source: character, typed: character, equal: true })));

  const counts = { omission: 0, addition: 0, spelling: 0, substitution: 0, repetition: 0, incompleteWord: 0, spacing: 0, capitalization: 0, punctuation: 0, transposition: 0, paragraphic: 0 };
  const classified = [];
  for (let cursor = 0; cursor < operations.length;) {
    if (operations[cursor].equal) { classified.push({ ...operations[cursor], severity: 'correct', category: 'correct' }); cursor += 1; continue; }
    let end = cursor + 1;
    while (end < operations.length && !operations[end].equal) end += 1;
    const run = operations.slice(cursor, end);
    const left = operations[cursor - 1]; const right = operations[end];
    const sourceText = run.map((item) => item.source).join(''); const typedText = run.map((item) => item.typed).join('');
    let category;
    if ([...sourceText, ...typedText].some(isLineBreak)) category = 'paragraphic';
    else if ([...sourceText, ...typedText].every(isWhitespace)) category = 'spacing';
    else if (sourceText && typedText && sourceText.localeCompare(typedText, undefined, { sensitivity: 'accent' }) === 0) category = 'capitalization';
    else if ([...sourceText, ...typedText].every((char) => isPunctuation(char))) category = 'punctuation';
    else if (sourceText.length === 2 && typedText === [...sourceText].reverse().join('')) category = 'transposition';
    else if (!typedText) {
      const touchesWord = (left?.source && !isWhitespace(left.source)) || (right?.source && !isWhitespace(right.source));
      category = sourceText && ![...sourceText].some(isWhitespace) && touchesWord ? 'incompleteWord' : 'omission';
    }
    else if (!sourceText) {
      const addedToken = typedText.trim();
      const beforeText = operations.slice(0, cursor).map((item) => item.typed).join('').trimEnd();
      const afterText = operations.slice(end).map((item) => item.typed).join('').trimStart();
      const previousWord = beforeText.match(/\S+$/u)?.[0]; const nextWord = afterText.match(/^\S+/u)?.[0];
      category = addedToken && (addedToken === previousWord || addedToken === nextWord) ? 'repetition' : 'addition';
    }
    else if ([...sourceText, ...typedText].every((char) => isLetter(char))) category = 'spelling';
    else category = 'substitution';
    const affectedWords = category === 'omission' ? segmentWords(sourceText).length : ['addition', 'repetition'].includes(category) ? segmentWords(typedText).length : 0;
    counts[category] += Math.max(1, affectedWords);
    const halfCategory = ['spacing', 'capitalization', 'punctuation', 'transposition', 'paragraphic'].includes(category);
    const severity = !allErrorsAreFull && halfCategory ? 'half' : 'full';
    for (const item of run) classified.push({ ...item, severity, category });
    cursor = end;
  }
  const merge = (side) => classified.reduce((parts, item) => {
    const text = item[side]; if (!text) return parts;
    const previousPart = parts.at(-1);
    if (previousPart?.severity === item.severity && previousPart?.category === item.category) previousPart.text += text;
    else parts.push({ text, severity: item.severity, category: item.category });
    return parts;
  }, []);
  const typedReviewParts = classified.reduce((parts, item) => {
    if (item.typed) {
      const previousPart = parts.at(-1);
      if (!previousPart?.missing && previousPart?.severity === item.severity && previousPart?.category === item.category) previousPart.text += item.typed;
      else parts.push({ text: item.typed, severity: item.severity, category: item.category });
      return parts;
    }
    if (item.severity !== 'half') return parts;
    const marker = item.category === 'spacing' ? '␠' : item.category === 'paragraphic' ? '↵' : item.source;
    if (marker) parts.push({ text: marker, severity: 'half', category: item.category, missing: true });
    return parts;
  }, []);
  const halfErrors = allErrorsAreFull ? 0 : counts.spacing + counts.capitalization + counts.punctuation + counts.transposition + counts.paragraphic;
  const classifiedTotal = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return { counts, fullErrors: classifiedTotal - halfErrors, halfErrors, weightedErrors: classifiedTotal - halfErrors * 0.5, referenceParts: merge('source'), typedParts: merge('typed'), typedReviewParts };
}

const errorCategories = Object.freeze({ omission: 0, addition: 0, spelling: 0, substitution: 0, repetition: 0, incompleteWord: 0, spacing: 0, capitalization: 0, punctuation: 0, transposition: 0, paragraphic: 0 });
const halfErrorCategories = new Set(['spacing', 'capitalization', 'punctuation', 'transposition', 'paragraphic']);

function tokenizeForAlignment(value) {
  const text = String(value ?? '').normalize('NFC').replace(/\r\n?/g, '\n');
  const words = []; let cursor = 0; let pending = '';
  for (const match of text.matchAll(/\s+|\S+/gu)) {
    if (/^\s+$/u.test(match[0])) pending += match[0];
    else { words.push({ text: match[0], before: pending }); pending = ''; }
    cursor = (match.index || 0) + match[0].length;
  }
  return { text, words, trailing: pending || text.slice(cursor) };
}

function characterDistance(leftValue, rightValue) {
  const left = segmentCharacters(leftValue); const right = segmentCharacters(rightValue);
  let previous = Uint16Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = new Uint16Array(right.length + 1); current[0] = i;
    for (let j = 1; j <= right.length; j += 1) current[j] = left[i - 1] === right[j - 1] ? previous[j - 1] : 1 + Math.min(previous[j - 1], previous[j], current[j - 1]);
    previous = current;
  }
  return previous[right.length];
}

function wordSubstitutionCost(left, right) {
  if (left === right) return 0;
  const maximum = Math.max(segmentCharacters(left).length, segmentCharacters(right).length, 1);
  return Math.max(0.2, Math.min(1.25, characterDistance(left, right) / maximum));
}

function alignWordTokens(sourceWords, typedWords) {
  const height = sourceWords.length + 1; const width = typedWords.length + 1;
  const directions = new Uint8Array(height * width);
  let twoBack = new Float64Array(width); let previous = Float64Array.from({ length: width }, (_, index) => index);
  for (let j = 1; j < width; j += 1) directions[j] = 3;
  for (let i = 1; i < height; i += 1) {
    const current = new Float64Array(width); current[0] = i; directions[i * width] = 2;
    for (let j = 1; j < width; j += 1) {
      const source = sourceWords[i - 1].text; const typed = typedWords[j - 1].text;
      let best = previous[j - 1] + wordSubstitutionCost(source, typed); let direction = 1;
      const deletion = previous[j] + 1;
      if (deletion < best - 1e-9) { best = deletion; direction = 2; }
      const insertion = current[j - 1] + 1;
      if (insertion < best - 1e-9) { best = insertion; direction = 3; }
      if (i > 1 && j > 1 && sourceWords[i - 2].text === typed && source === typedWords[j - 2].text) {
        const transposition = twoBack[j - 2] + 1;
        if (transposition <= best + 1e-9) { best = transposition; direction = 4; }
      }
      if (i > 1 && sourceWords[i - 2].text + source === typed) {
        const merged = twoBack[j - 1] + 0.5;
        if (merged <= best + 1e-9) { best = merged; direction = 5; }
      }
      if (j > 1 && source === typedWords[j - 2].text + typed) {
        const split = previous[j - 2] + 0.5;
        if (split <= best + 1e-9) { best = split; direction = 6; }
      }
      current[j] = best; directions[i * width + j] = direction;
    }
    twoBack = previous; previous = current;
  }
  const operations = []; let i = sourceWords.length; let j = typedWords.length;
  while (i || j) {
    const direction = directions[i * width + j];
    if (direction === 4) { operations.push({ type: 'transpose', source: [sourceWords[i - 2], sourceWords[i - 1]], typed: [typedWords[j - 2], typedWords[j - 1]] }); i -= 2; j -= 2; }
    else if (direction === 5) { operations.push({ type: 'merge', source: [sourceWords[i - 2], sourceWords[i - 1]], typed: typedWords[j - 1] }); i -= 2; j -= 1; }
    else if (direction === 6) { operations.push({ type: 'split', source: sourceWords[i - 1], typed: [typedWords[j - 2], typedWords[j - 1]] }); i -= 1; j -= 2; }
    else if (direction === 1 && i && j) { operations.push({ type: 'pair', source: sourceWords[--i], typed: typedWords[--j] }); }
    else if ((direction === 2 || !j) && i) { operations.push({ type: 'delete', source: sourceWords[--i] }); }
    else { operations.push({ type: 'insert', typed: typedWords[--j] }); }
  }
  return operations.reverse();
}

function alignTokenCharacters(sourceValue, typedValue) {
  const source = segmentCharacters(sourceValue); const typed = segmentCharacters(typedValue);
  const width = typed.length + 1; const costs = new Uint16Array((source.length + 1) * width); const directions = new Uint8Array(costs.length);
  for (let i = 1; i <= source.length; i += 1) { costs[i * width] = i; directions[i * width] = 2; }
  for (let j = 1; j <= typed.length; j += 1) { costs[j] = j; directions[j] = 3; }
  for (let i = 1; i <= source.length; i += 1) for (let j = 1; j <= typed.length; j += 1) {
    const index = i * width + j;
    if (source[i - 1] === typed[j - 1]) { costs[index] = costs[(i - 1) * width + j - 1]; directions[index] = 1; continue; }
    let best = costs[(i - 1) * width + j - 1] + 1; let direction = 4;
    const deletion = costs[(i - 1) * width + j] + 1; if (deletion < best) { best = deletion; direction = 2; }
    const insertion = costs[i * width + j - 1] + 1; if (insertion < best) { best = insertion; direction = 3; }
    if (i > 1 && j > 1 && source[i - 2] === typed[j - 1] && source[i - 1] === typed[j - 2]) {
      const transposition = costs[(i - 2) * width + j - 2] + 1; if (transposition <= best) { best = transposition; direction = 5; }
    }
    costs[index] = best; directions[index] = direction;
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

export function classifyErrors(sourceValue, typedValue, allErrorsAreFull = false) {
  const source = tokenizeForAlignment(sourceValue); const typed = tokenizeForAlignment(typedValue);
  const counts = { ...errorCategories }; const referenceParts = []; const typedParts = []; const referenceReviewParts = []; const typedReviewParts = [];
  const severityFor = (category) => !allErrorsAreFull && halfErrorCategories.has(category) ? 'half' : 'full';
  const push = (parts, text, severity = 'correct', category = 'correct', missing = false) => {
    if (!text) return;
    const previous = parts.at(-1);
    if (!missing && !previous?.missing && previous?.severity === severity && previous?.category === category) previous.text += text;
    else parts.push({ text, severity, category, ...(missing && { missing: true }) });
  };
  const record = (category, sourceText, typedText, amount = 1) => {
    counts[category] += amount; const severity = severityFor(category);
    if (sourceText) { push(referenceParts, sourceText, severity, category); push(referenceReviewParts, sourceText, severity, category); }
    else push(referenceReviewParts, missingMarker(category, typedText), severity, category, true);
    if (typedText) { push(typedParts, typedText, severity, category); push(typedReviewParts, typedText, severity, category); }
    else push(typedReviewParts, missingMarker(category, sourceText), severity, category, true);
  };
  const compareSeparators = (sourceText, typedText) => {
    if (sourceText === typedText) { push(referenceParts, sourceText); push(typedParts, typedText); push(referenceReviewParts, sourceText); push(typedReviewParts, typedText); return; }
    const category = /[\n\r]/u.test(sourceText + typedText) ? 'paragraphic' : 'spacing'; record(category, sourceText, typedText);
  };
  const compareWords = (sourceText, typedText) => {
    if (sourceText === typedText) { push(referenceParts, sourceText); push(typedParts, typedText); push(referenceReviewParts, sourceText); push(typedReviewParts, typedText); return; }
    const operations = alignTokenCharacters(sourceText, typedText);
    for (let cursor = 0; cursor < operations.length;) {
      if (operations[cursor].equal) { const item = operations[cursor++]; push(referenceParts, item.source); push(typedParts, item.typed); push(referenceReviewParts, item.source); push(typedReviewParts, item.typed); continue; }
      let end = cursor + 1; while (end < operations.length && !operations[end].equal) end += 1;
      const run = operations.slice(cursor, end); const sourceRun = run.map((item) => item.source).join(''); const typedRun = run.map((item) => item.typed).join('');
      let category;
      if (run.length === 1 && run[0].transposed) category = 'transposition';
      else if (sourceRun && typedRun && sourceRun.localeCompare(typedRun, undefined, { sensitivity: 'accent' }) === 0) category = 'capitalization';
      else if ([...sourceRun, ...typedRun].length && [...sourceRun, ...typedRun].every(isPunctuation)) category = 'punctuation';
      else if (!typedRun && sourceRun) category = 'incompleteWord';
      else if ([...sourceRun, ...typedRun].every(isLetter)) category = 'spelling';
      else category = 'substitution';
      record(category, sourceRun, typedRun); cursor = end;
    }
  };
  const alignment = alignWordTokens(source.words, typed.words);
  const frequencyMap = (words) => words.reduce((map, word) => map.set(word.text, (map.get(word.text) || 0) + 1), new Map());
  const sourceFrequency = frequencyMap(source.words); const typedFrequency = frequencyMap(typed.words);
  for (let index = 0; index < alignment.length; index += 1) {
    const operation = alignment[index];
    if (operation.type === 'pair') { compareSeparators(operation.source.before, operation.typed.before); compareWords(operation.source.text, operation.typed.text); }
    else if (operation.type === 'delete') record('omission', operation.source.before + operation.source.text, '', 1);
    else if (operation.type === 'insert') {
      const sourceOccurrences = sourceFrequency.get(operation.typed.text) || 0;
      const repeated = sourceOccurrences > 0 && (typedFrequency.get(operation.typed.text) || 0) > sourceOccurrences;
      record(repeated ? 'repetition' : 'addition', '', operation.typed.before + operation.typed.text, 1);
    } else if (operation.type === 'transpose') {
      const sourceText = operation.source.map((word) => word.before + word.text).join(''); const typedText = operation.typed.map((word) => word.before + word.text).join('');
      record('transposition', sourceText, typedText, 1);
    } else if (operation.type === 'merge') {
      compareSeparators(operation.source[0].before, operation.typed.before);
      compareWords(operation.source[0].text, operation.typed.text.slice(0, operation.source[0].text.length));
      compareSeparators(operation.source[1].before, '');
      compareWords(operation.source[1].text, operation.typed.text.slice(operation.source[0].text.length));
    } else {
      compareSeparators(operation.source.before, operation.typed[0].before);
      compareWords(operation.source.text.slice(0, operation.typed[0].text.length), operation.typed[0].text);
      compareSeparators('', operation.typed[1].before);
      compareWords(operation.source.text.slice(operation.typed[0].text.length), operation.typed[1].text);
    }
  }
  compareSeparators(source.trailing, typed.trailing);
  const halfErrors = allErrorsAreFull ? 0 : [...halfErrorCategories].reduce((sum, category) => sum + counts[category], 0);
  const classifiedTotal = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return { counts, fullErrors: classifiedTotal - halfErrors, halfErrors, weightedErrors: classifiedTotal - halfErrors * 0.5, referenceParts, typedParts, referenceReviewParts, typedReviewParts };
}

function alignWithinBand(target, input, band) {
  const width = input.length + 1;
  const unreachable = 0x3fffffff;
  let previousCost = new Uint32Array(width);
  let previousCorrect = new Uint32Array(width);
  let previousWrong = new Uint32Array(width);
  let previousOmitted = new Uint32Array(width);
  let previousExtra = new Uint32Array(width);
  let currentCost = new Uint32Array(width);
  let currentCorrect = new Uint32Array(width);
  let currentWrong = new Uint32Array(width);
  let currentOmitted = new Uint32Array(width);
  let currentExtra = new Uint32Array(width);
  let previousStart = 0;
  let previousEnd = Math.min(input.length, band);
  for (let index = 0; index <= previousEnd; index += 1) { previousCost[index] = index; previousExtra[index] = index; }

  for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
    const currentStart = Math.max(0, targetIndex - band);
    const currentEnd = Math.min(input.length, targetIndex + band);
    if (currentStart === 0) {
      currentCost[0] = targetIndex; currentCorrect[0] = 0; currentWrong[0] = 0; currentOmitted[0] = targetIndex; currentExtra[0] = 0;
    }
    for (let inputIndex = Math.max(1, currentStart); inputIndex <= currentEnd; inputIndex += 1) {
      const diagonalAvailable = inputIndex - 1 >= previousStart && inputIndex - 1 <= previousEnd;
      if (diagonalAvailable && target[targetIndex - 1] === input[inputIndex - 1]) {
        currentCost[inputIndex] = previousCost[inputIndex - 1];
        currentCorrect[inputIndex] = previousCorrect[inputIndex - 1] + 1;
        currentWrong[inputIndex] = previousWrong[inputIndex - 1];
        currentOmitted[inputIndex] = previousOmitted[inputIndex - 1];
        currentExtra[inputIndex] = previousExtra[inputIndex - 1];
        continue;
      }
      let operation = 'substitute';
      let bestCost = diagonalAvailable ? previousCost[inputIndex - 1] + 1 : unreachable;
      let bestCorrect = diagonalAvailable ? previousCorrect[inputIndex - 1] : 0;
      const aboveAvailable = inputIndex >= previousStart && inputIndex <= previousEnd;
      const omittedCost = aboveAvailable ? previousCost[inputIndex] + 1 : unreachable;
      if (omittedCost < bestCost || (omittedCost === bestCost && previousCorrect[inputIndex] > bestCorrect)) {
        operation = 'omit'; bestCost = omittedCost; bestCorrect = previousCorrect[inputIndex];
      }
      const leftAvailable = inputIndex - 1 >= currentStart;
      const extraCost = leftAvailable ? currentCost[inputIndex - 1] + 1 : unreachable;
      if (extraCost < bestCost || (extraCost === bestCost && currentCorrect[inputIndex - 1] > bestCorrect)) {
        operation = 'extra'; bestCost = extraCost;
      }
      currentCost[inputIndex] = bestCost;
      if (operation === 'substitute') {
        currentCorrect[inputIndex] = previousCorrect[inputIndex - 1]; currentWrong[inputIndex] = previousWrong[inputIndex - 1] + 1; currentOmitted[inputIndex] = previousOmitted[inputIndex - 1]; currentExtra[inputIndex] = previousExtra[inputIndex - 1];
      } else if (operation === 'omit') {
        currentCorrect[inputIndex] = previousCorrect[inputIndex]; currentWrong[inputIndex] = previousWrong[inputIndex]; currentOmitted[inputIndex] = previousOmitted[inputIndex] + 1; currentExtra[inputIndex] = previousExtra[inputIndex];
      } else {
        currentCorrect[inputIndex] = currentCorrect[inputIndex - 1]; currentWrong[inputIndex] = currentWrong[inputIndex - 1]; currentOmitted[inputIndex] = currentOmitted[inputIndex - 1]; currentExtra[inputIndex] = currentExtra[inputIndex - 1] + 1;
      }
    }
    [previousCost, currentCost] = [currentCost, previousCost];
    [previousCorrect, currentCorrect] = [currentCorrect, previousCorrect];
    [previousWrong, currentWrong] = [currentWrong, previousWrong];
    [previousOmitted, currentOmitted] = [currentOmitted, previousOmitted];
    [previousExtra, currentExtra] = [currentExtra, previousExtra];
    previousStart = currentStart; previousEnd = currentEnd;
  }
  if (input.length < previousStart || input.length > previousEnd) return { correctCharacters: 0, wrongCharacters: 0, omittedCharacters: target.length, extraCharacters: input.length, totalErrors: unreachable };
  return {
    correctCharacters: previousCorrect[input.length],
    wrongCharacters: previousWrong[input.length],
    omittedCharacters: previousOmitted[input.length],
    extraCharacters: previousExtra[input.length],
    totalErrors: previousCost[input.length]
  };
}

export function calculateResult(source, typed, elapsedSeconds, telemetry = {}, scoringRule = {}) {
  const alignment = alignCharacters(source.replace(/\r\n?/g, '\n'), typed.replace(/\r\n?/g, '\n'));
  const wordAlignment = alignWords(source, typed);
  const safeSeconds = Math.max(1, Number(elapsedSeconds) || 1);
  const minutes = safeSeconds / 60;
  const grossWpm = (alignment.typedCharacters / 5) / minutes;
  const evaluationMode = scoringRule.evaluationMode === 'ssc-stenographer' ? 'ssc-stenographer' : 'practice';
  const errors = classifyErrors(source, typed, evaluationMode === 'ssc-stenographer');
  const scoringMode = scoringRule.mode === 'character' ? 'character' : 'standard-word';
  const errorPenalty = Math.min(10, Math.max(0.1, Number(scoringRule.errorPenalty) || 1));
  const errorUnits = errors.weightedErrors * errorPenalty;
  const netWpm = Math.min(grossWpm, Math.max(0, grossWpm - errorUnits / minutes));
  const accuracy = alignment.referenceCharacters ? Math.max(0, (alignment.referenceCharacters - errors.weightedErrors) / alignment.referenceCharacters * 100) : (alignment.typedCharacters ? 0 : 100);
  const round = (value) => Math.round(value * 100) / 100;
  const backspaceCount = Math.max(0, Math.floor(Number(telemetry.backspaceCount) || 0));
  const totalKeystrokes = Math.max(0, Math.floor(Number(telemetry.totalKeystrokes) || 0));

  return {
    grossWpm: round(grossWpm), netWpm: round(netWpm), accuracy: round(accuracy),
    ...alignment,
    ...wordAlignment,
    errorUnits: round(errorUnits), scoringMode, errorPenalty, evaluationMode,
    fullErrors: errors.fullErrors, halfErrors: errors.halfErrors, weightedErrors: errors.weightedErrors,
    errorBreakdown: errors.counts, comparison: { referenceParts: errors.referenceParts, typedParts: errors.typedParts, referenceReviewParts: errors.referenceReviewParts, typedReviewParts: errors.typedReviewParts },
    totalKeystrokes,
    backspaceCount,
    timeTaken: round(safeSeconds)
  };
}
