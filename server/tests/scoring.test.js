import test from 'node:test';
import assert from 'node:assert/strict';
import { alignCharacters, alignWords, calculateResult, classifyErrors } from '../src/utils/scoring.js';

function assertAlignment(source, typed, expected) {
  const result = alignCharacters(source, typed);
  assert.deepEqual(result, { referenceCharacters: Array.from(source.normalize('NFC')).length, typedCharacters: Array.from(typed.normalize('NFC')).length, ...expected });
  assert.equal(result.correctCharacters + result.wrongCharacters + result.omittedCharacters, result.referenceCharacters);
  assert.equal(result.correctCharacters + result.wrongCharacters + result.extraCharacters, result.typedCharacters);
  assert.equal(result.wrongCharacters + result.omittedCharacters + result.extraCharacters, result.totalErrors);
}

test('exact text has full accuracy and word-based gross WPM', () => {
  const result = calculateResult('hello world', 'hello world', 60, { totalKeystrokes: 13, backspaceCount: 2 });
  assert.equal(result.totalErrors, 0);
  assert.equal(result.accuracy, 100);
  assert.equal(result.grossWpm, 2);
  assert.equal(result.netWpm, 2);
  assert.equal(result.typedWords, 2);
  assert.equal(result.totalKeystrokes, 13);
  assert.equal(result.backspaceCount, 2);
});

test('distinguishes substitution, middle omission and middle insertion without cascading', () => {
  assertAlignment('abcdef', 'abcXef', { correctCharacters: 5, wrongCharacters: 1, omittedCharacters: 0, extraCharacters: 0, totalErrors: 1 });
  assertAlignment('abcdef', 'abdef', { correctCharacters: 5, wrongCharacters: 0, omittedCharacters: 1, extraCharacters: 0, totalErrors: 1 });
  assertAlignment('abcdef', 'abcXdef', { correctCharacters: 6, wrongCharacters: 0, omittedCharacters: 0, extraCharacters: 1, totalErrors: 1 });
});

test('classifies empty, space-only, leading, trailing and repeated whitespace input', () => {
  assertAlignment('abc', '', { correctCharacters: 0, wrongCharacters: 0, omittedCharacters: 3, extraCharacters: 0, totalErrors: 3 });
  assertAlignment('abc', '   ', { correctCharacters: 0, wrongCharacters: 0, omittedCharacters: 3, extraCharacters: 3, totalErrors: 6 });
  assertAlignment('abc', ' abc ', { correctCharacters: 3, wrongCharacters: 0, omittedCharacters: 0, extraCharacters: 2, totalErrors: 2 });
  assertAlignment('a b', 'a  b', { correctCharacters: 3, wrongCharacters: 0, omittedCharacters: 0, extraCharacters: 1, totalErrors: 1 });
});

test('handles line breaks and tab characters as significant input', () => {
  assertAlignment('a\nb\tc', 'a b\tc', { correctCharacters: 4, wrongCharacters: 1, omittedCharacters: 0, extraCharacters: 0, totalErrors: 1 });
});

test('normalizes Unicode and handles Hindi and mixed-language text', () => {
  assertAlignment('café', 'cafe\u0301', { correctCharacters: 4, wrongCharacters: 0, omittedCharacters: 0, extraCharacters: 0, totalErrors: 0 });
  const hindi = 'भारत एक देश है।';
  assert.equal(calculateResult(hindi, hindi, 60).accuracy, 100);
  assertAlignment('भारत SSC', 'भारत SC', { correctCharacters: 7, wrongCharacters: 0, omittedCharacters: 1, extraCharacters: 0, totalErrors: 1 });
  const hindiMistake = calculateResult('भारत एक देश है', 'भारत एक देस है', 60, {}, { mode: 'standard-word', errorPenalty: 1 });
  const englishMistake = calculateResult('India is a country', 'India is the country', 60, {}, { mode: 'standard-word', errorPenalty: 1 });
  assert.ok(hindiMistake.netWpm < hindiMistake.grossWpm);
  assert.ok(englishMistake.netWpm < englishMistake.grossWpm);
  assert.ok(hindiMistake.accuracy < 100 && englishMistake.accuracy < 100);
});

test('formulas remain internally consistent with errors and early submission', () => {
  const oneError = calculateResult('abcdefghijklmnopqrstuvwxy', 'abcdefghijklmnopqrstuvwxZ', 60);
  assert.equal(oneError.grossWpm, 1);
  assert.equal(oneError.netWpm, 0);
  assert.equal(oneError.accuracy, 0);
  assert.equal(oneError.wrongWords, 1);
  assert.equal(oneError.errorUnits, 1);
  const empty = calculateResult('five chars', '', 60);
  assert.equal(empty.grossWpm, 0);
  assert.equal(empty.netWpm, 0);
  assert.equal(empty.accuracy, 0);
});

test('word alignment identifies wrong, omitted and extra words independently', () => {
  assert.deepEqual(alignWords('one two three', 'one too three'), { typedWords: 3, referenceWords: 3, wrongWords: 1, omittedWords: 0, extraWords: 0, totalWordErrors: 1 });
  assert.deepEqual(alignWords('one two three', 'one three'), { typedWords: 2, referenceWords: 3, wrongWords: 0, omittedWords: 1, extraWords: 0, totalWordErrors: 1 });
  assert.deepEqual(alignWords('one two three', 'one extra two three'), { typedWords: 4, referenceWords: 3, wrongWords: 0, omittedWords: 0, extraWords: 1, totalWordErrors: 1 });
});

test('the classified error total controls Net WPM independently of legacy display mode', () => {
  const source = 'one two three'; const typed = 'one too three';
  const wordMode = calculateResult(source, typed, 60, {}, { mode: 'standard-word', errorPenalty: 1 });
  const characterMode = calculateResult(source, typed, 60, {}, { mode: 'character', errorPenalty: 1 });
  const doublePenalty = calculateResult(source, typed, 60, {}, { mode: 'standard-word', errorPenalty: 2 });
  assert.equal(wordMode.grossWpm, 3);
  assert.equal(characterMode.grossWpm, 3);
  assert.equal(wordMode.accuracy, characterMode.accuracy);
  assert.equal(wordMode.netWpm, 2);
  assert.equal(characterMode.netWpm, 2);
  assert.equal(doublePenalty.netWpm, 1);
  for (const result of [wordMode, characterMode, doublePenalty]) assert.ok(result.netWpm <= result.grossWpm);
});

test('result formulas cover perfect, many-error, no-input, short and long passages', () => {
  const cases = [
    ['perfect', 'short text', 'short text', 60],
    ['many errors', 'one two three four', 'bad input words here', 60],
    ['no typing', 'one two three', '', 60],
    ['short', 'abc', 'abc', 30],
    ['long', 'word '.repeat(400).trim(), 'word '.repeat(400).trim(), 600]
  ];
  for (const [name, source, typed, seconds] of cases) {
    const result = calculateResult(source, typed, seconds, {}, { mode: 'standard-word', errorPenalty: 1 });
    const expectedGross = Math.round(((result.typedWords / (seconds / 60))) * 100) / 100;
    const expectedAccuracy = result.referenceWords ? Math.round((Math.max(0, result.referenceWords - result.weightedErrors) / result.referenceWords * 100) * 100) / 100 : (result.typedWords ? 0 : 100);
    assert.equal(result.grossWpm, expectedGross, name);
    assert.equal(result.accuracy, expectedAccuracy, name);
    assert.ok(result.netWpm >= 0 && result.netWpm <= result.grossWpm, name);
    assert.equal(result.totalErrors, result.totalWordErrors, name);
  }
});

test('non-steno mode classifies half errors and exposes the exact highlighted spans', () => {
  const capitalization = classifyErrors('Hello', 'hello');
  assert.equal(capitalization.halfErrors, 1);
  assert.equal(capitalization.weightedErrors, 0.5);
  assert.equal(capitalization.typedParts.find((part) => part.severity !== 'correct').category, 'capitalization');
  const spacing = calculateResult('one two', 'one  two', 60);
  assert.equal(spacing.halfErrors, 1);
  assert.equal(spacing.fullErrors, 0);
  assert.equal(spacing.accuracy, 75);
  assert.equal(spacing.comparison.typedParts.some((part) => part.severity === 'half'), true);
});

test('Steno mode promotes every half-category mistake to a full error', () => {
  const practice = calculateResult('Hello, world', 'hello world', 60);
  const ssc = calculateResult('Hello, world', 'hello world', 60, {}, { evaluationMode: 'ssc-stenographer' });
  assert.equal(practice.fullErrors, 0);
  assert.equal(practice.halfErrors, 2);
  assert.equal(ssc.fullErrors, 2);
  assert.equal(ssc.halfErrors, 0);
  assert.equal(ssc.weightedErrors, 2);
  assert.ok(ssc.accuracy < practice.accuracy);
  assert.equal(ssc.comparison.typedParts.filter((part) => part.severity !== 'correct').every((part) => part.severity === 'full'), true);
});

test('every configured half-error category receives exactly half weight in non-steno mode', () => {
  const cases = [
    ['spacing', 'one two', 'one  two'],
    ['capitalization', 'Hello', 'hello'],
    ['punctuation', 'Hello, world', 'Hello world'],
    ['transposition', 'ab', 'ba'],
    ['paragraphic', 'one\ntwo', 'one two']
  ];
  for (const [category, source, typed] of cases) {
    const result = classifyErrors(source, typed);
    assert.equal(result.counts[category], 1, category);
    assert.equal(result.fullErrors, 0, category);
    assert.equal(result.halfErrors, 1, category);
    assert.equal(result.weightedErrors, 0.5, category);
  }
});

test('typed review exposes visible markers for half errors missing from typed input', () => {
  const punctuation = classifyErrors('Hello, world', 'Hello world');
  const punctuationMarker = punctuation.typedReviewParts.find((part) => part.missing);
  assert.equal(punctuationMarker.text, ',');
  assert.equal(punctuationMarker.category, 'punctuation');
  assert.equal(punctuationMarker.severity, 'half');

  const spacing = classifyErrors('one two', 'onetwo');
  const spacingMarker = spacing.typedReviewParts.find((part) => part.missing);
  assert.equal(spacingMarker.text, '␠');
  assert.equal(spacingMarker.category, 'spacing');
});

test('comparison realigns after single, multiple and long word omissions', () => {
  const cases = [
    ['one two three four', 'one three four', 1],
    ['one two three four five', 'one four five', 2],
    ['start this entire middle sentence must disappear safely before the stable ending', 'start before the stable ending', 7]
  ];
  for (const [source, typed, omissions] of cases) {
    const result = classifyErrors(source, typed);
    assert.equal(result.counts.omission, omissions);
    assert.equal(result.counts.spelling, 0);
    assert.equal(result.counts.substitution, 0);
    assert.equal(result.referenceReviewParts.at(-1).text.endsWith('ending') || result.referenceReviewParts.at(-1).text.endsWith('four') || result.referenceReviewParts.at(-1).text.endsWith('five'), true);
    assert.equal(result.referenceReviewParts.at(-1).severity, 'correct');
    assert.equal(result.typedReviewParts.at(-1).severity, 'correct');
  }
});

test('LCS anchors preserve every match after an omitted middle word', () => {
  const result = classifyErrors('The quick brown fox jumps over the lazy dog', 'The quick fox jumps over the lazy dog');
  assert.equal(result.counts.omission, 1);
  assert.equal(result.counts.spelling, 0);
  assert.equal(result.counts.substitution, 0);
  assert.equal(result.referenceReviewParts.some((part) => part.category === 'omission' && part.text.includes('brown')), true);
  assert.equal(result.referenceReviewParts.at(-1).severity, 'correct');
  assert.equal(result.referenceReviewParts.at(-1).text.includes('fox jumps over the lazy dog'), true);
  assert.equal(result.typedReviewParts.at(-1).severity, 'correct');
  assert.equal(result.typedReviewParts.at(-1).text.includes('fox jumps over the lazy dog'), true);
});

test('later matching sequences outrank locally similar substitutions', () => {
  const source = 'Public service requires patience, accuracy and a strong sense of responsibility.\nA candidate preparing for a competitive examination...';
  const typed = 'Public service requires patience accuracy and a strong sense of responsibility a candidate';
  const result = classifyErrors(source, typed);
  assert.equal(result.counts.omission, 5);
  assert.equal(result.counts.spelling, 0);
  assert.equal(result.counts.substitution, 0);
  assert.equal(result.counts.punctuation, 2);
  assert.equal(result.counts.paragraphic, 1);
  assert.equal(result.counts.capitalization, 1);
  const referenceCandidate = result.referenceReviewParts.find((part) => part.severity === 'correct' && part.text.includes('candidate'));
  const typedCandidate = result.typedReviewParts.find((part) => part.severity === 'correct' && part.text.includes('candidate'));
  assert.ok(referenceCandidate);
  assert.ok(typedCandidate);
});

test('paired review highlights every requested error type in both panels', () => {
  const cases = [
    ['addition', 'one two', 'one extra two', 'full'],
    ['punctuation', 'Hello, world', 'Hello world', 'half'],
    ['punctuation', 'Done.', 'Done', 'half'],
    ['spacing', 'one two', 'one  two', 'half'],
    ['capitalization', 'Hello world', 'hello world', 'half'],
    ['transposition', 'one two three', 'one three two', 'half'],
    ['incompleteWord', 'complete word', 'comple word', 'full']
  ];
  for (const [category, source, typed, severity] of cases) {
    const result = classifyErrors(source, typed);
    assert.ok(result.counts[category] > 0, category);
    for (const parts of [result.referenceReviewParts, result.typedReviewParts]) {
      const highlight = parts.find((part) => part.category === category);
      assert.ok(highlight, `${category} missing from a panel`);
      assert.equal(highlight.severity, severity, category);
    }
  }
});

test('missing spaces and repeated words retain synchronized paired output', () => {
  const missingSpace = classifyErrors('one two three', 'onetwo three');
  assert.equal(missingSpace.counts.spacing, 1);
  assert.equal(missingSpace.counts.spelling, 0);
  assert.equal(missingSpace.referenceReviewParts.some((part) => part.category === 'spacing' && part.severity === 'half'), true);
  assert.equal(missingSpace.typedReviewParts.some((part) => part.category === 'spacing' && part.severity === 'half' && part.missing), true);

  const repeated = classifyErrors('one two three', 'one two two three');
  assert.equal(repeated.counts.repetition, 1);
  assert.equal(repeated.referenceReviewParts.some((part) => part.category === 'repetition' && part.missing), true);
  assert.equal(repeated.typedReviewParts.some((part) => part.category === 'repetition'), true);
});

test('classifies incomplete prefixes, repeated words and multi-word omissions precisely', () => {
  const incompletePrefix = classifyErrors('typing', 'yping');
  assert.equal(incompletePrefix.counts.incompleteWord, 1);
  assert.equal(incompletePrefix.counts.omission, 0);

  const repetition = classifyErrors('one two three', 'one two two three');
  assert.equal(repetition.counts.repetition, 1);
  assert.equal(repetition.counts.addition, 0);

  const omittedWords = classifyErrors('one two three four', 'one four');
  assert.equal(omittedWords.counts.omission, 2);
  assert.equal(omittedWords.fullErrors, 2);
});

test('persisted comparison spans and category totals share one source of truth', () => {
  const result = calculateResult('Hello, one two', 'hello one  too', 60);
  const categoryTotal = Object.values(result.errorBreakdown).reduce((sum, value) => sum + value, 0);
  assert.equal(categoryTotal, result.fullErrors + result.halfErrors);
  assert.equal(result.weightedErrors, result.fullErrors + result.halfErrors * 0.5);
  assert.equal(result.comparison.referenceParts.map((part) => part.text).join(''), 'Hello, one two');
  assert.equal(result.comparison.typedParts.map((part) => part.text).join(''), 'hello one  too');
});

test('full and half errors drive weighted scoring exactly', () => {
  const practice = calculateResult('Hello world', 'hello wurld', 60, {}, { errorPenalty: 1 });
  assert.equal(practice.fullErrors, 1);
  assert.equal(practice.halfErrors, 1);
  assert.equal(practice.weightedErrors, 1.5);
  assert.equal(practice.errorUnits, 1.5);
  assert.equal(practice.grossWpm, 2);
  assert.equal(practice.netWpm, 0.5);
  assert.equal(practice.accuracy, 25);

  const doublePenalty = calculateResult('Hello world', 'hello wurld', 60, {}, { errorPenalty: 2 });
  assert.equal(doublePenalty.weightedErrors, 1.5);
  assert.equal(doublePenalty.errorUnits, 3);
  assert.equal(doublePenalty.netWpm, 0);
  assert.equal(doublePenalty.accuracy, practice.accuracy);

  const steno = calculateResult('Hello world', 'hello wurld', 60, {}, { evaluationMode: 'ssc-stenographer' });
  assert.equal(steno.fullErrors, 2);
  assert.equal(steno.halfErrors, 0);
  assert.equal(steno.weightedErrors, 2);
  assert.equal(steno.errorUnits, 2);
  assert.equal(steno.netWpm, 0);
  assert.equal(steno.accuracy, 0);
});

test('alignment invariants hold across representative short strings', () => {
  const samples = ['', 'a', ' ', 'ab', 'a b', 'है', 'A\nB'];
  for (const source of samples) for (const typed of samples) {
    const result = alignCharacters(source, typed);
    assert.equal(result.correctCharacters + result.wrongCharacters + result.omittedCharacters, result.referenceCharacters);
    assert.equal(result.correctCharacters + result.wrongCharacters + result.extraCharacters, result.typedCharacters);
    assert.equal(result.totalErrors, result.wrongCharacters + result.omittedCharacters + result.extraCharacters);
  }
});

test('compatibility projections use the unified alignment tree', () => {
  let seed = 1234567;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const alphabet = Array.from('ab cह');
  for (let run = 0; run < 100; run += 1) {
    const make = () => Array.from({ length: Math.floor(random() * 30) }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
    const source = make(); const typed = make();
    const comparison = classifyErrors(source, typed); const characterResult = alignCharacters(source, typed); const wordResult = alignWords(source, typed);
    assert.deepEqual(characterResult, {
      correctCharacters: comparison.correctCharacters, wrongCharacters: comparison.wrongCharacters,
      omittedCharacters: comparison.omittedCharacters, extraCharacters: comparison.extraCharacters,
      totalErrors: comparison.totalErrors, referenceCharacters: comparison.referenceCharacters, typedCharacters: comparison.typedCharacters
    });
    assert.deepEqual(wordResult, {
      typedWords: comparison.typedWords, referenceWords: comparison.referenceWords, wrongWords: comparison.wrongWords,
      omittedWords: comparison.omittedWords, extraWords: comparison.extraWords, totalWordErrors: comparison.totalWordErrors
    });
  }
});

test('backspace and highlight preference combinations cannot alter scoring rules', () => {
  for (const backspaceEnabled of [true, false]) {
    for (const wordHighlight of [true, false]) {
      const finalText = backspaceEnabled ? 'correct text' : 'corrext text';
      const telemetry = backspaceEnabled ? { totalKeystrokes: 14, backspaceCount: 1 } : { totalKeystrokes: 12, backspaceCount: 0 };
      const result = calculateResult('correct text', finalText, 60, telemetry);
      assert.equal(result.totalErrors, backspaceEnabled ? 0 : 1, `backspace=${backspaceEnabled}, highlight=${wordHighlight}`);
      assert.equal(result.backspaceCount, backspaceEnabled ? 1 : 0);
      assert.equal(result.totalWordErrors, backspaceEnabled ? 0 : 1);
      assert.equal(result.netWpm, backspaceEnabled ? result.grossWpm : Math.max(0, result.grossWpm - 1));
    }
  }
});

test('local capitalization aligns the current word and never searches future words', () => {
  const result = classifyErrors('responsibility. A candidate a', 'responsibility. a candidate a');
  assert.equal(result.counts.capitalization, 1);
  assert.equal(result.counts.omission, 0);
  assert.equal(result.counts.addition, 0);
  const capitalizedPair = result.alignmentTree.find((node) => node.category === 'capitalization');
  assert.deepEqual(capitalizedPair, {
    sourceText: 'A',
    typedText: 'a',
    category: 'capitalization',
    severity: 'half'
  });
});

test('word spelling errors highlight the whole word in production parts', () => {
  const result = classifyErrors('strong', 'strog');
  assert.equal(result.counts.spelling, 1);
  assert.deepEqual(result.referenceParts, [{ text: 'strong', severity: 'full', category: 'spelling' }]);
  assert.deepEqual(result.typedParts, [{ text: 'strog', severity: 'full', category: 'spelling' }]);
});

test('production parts never contain internal placeholder glyphs', () => {
  const cases = [
    ['one two', 'onetwo'],
    ['Hello, world', 'Hello world'],
    ['one two three', 'one three'],
    ['one two', 'one extra two'],
    ['one\ntwo', 'one two']
  ];
  for (const [source, typed] of cases) {
    const result = classifyErrors(source, typed);
    const referenceText = result.referenceParts.map((part) => part.text).join('');
    const typedText = result.typedParts.map((part) => part.text).join('');
    assert.equal(/[∅␠↵]/u.test(referenceText), false, `${source} / ${typed} reference`);
    assert.equal(/[∅␠↵]/u.test(typedText), false, `${source} / ${typed} typed`);
    assert.equal(referenceText, source.normalize('NFC').replace(/\r\n?/g, '\n'));
    assert.equal(typedText, typed.normalize('NFC').replace(/\r\n?/g, '\n'));
  }
});
