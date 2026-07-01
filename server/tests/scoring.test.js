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

test('exact text has full accuracy and five-keystroke gross WPM', () => {
  const result = calculateResult('hello world', 'hello world', 60, { totalKeystrokes: 13, backspaceCount: 2 });
  assert.equal(result.correctCharacters, 11);
  assert.equal(result.totalErrors, 0);
  assert.equal(result.accuracy, 100);
  assert.equal(result.grossWpm, 2.2);
  assert.equal(result.netWpm, 2.2);
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
  assertAlignment('abc', '   ', { correctCharacters: 0, wrongCharacters: 3, omittedCharacters: 0, extraCharacters: 0, totalErrors: 3 });
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
  assert.equal(oneError.grossWpm, 5);
  assert.equal(oneError.netWpm, 4);
  assert.equal(oneError.accuracy, 96);
  assert.equal(oneError.wrongWords, 1);
  assert.equal(oneError.errorUnits, 1);
  const empty = calculateResult('five chars', '', 60);
  assert.equal(empty.grossWpm, 0);
  assert.equal(empty.netWpm, 0);
  assert.equal(empty.accuracy, 80);
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
  assert.equal(wordMode.grossWpm, 2.6);
  assert.equal(characterMode.grossWpm, 2.6);
  assert.equal(wordMode.accuracy, characterMode.accuracy);
  assert.equal(wordMode.netWpm, 1.6);
  assert.equal(characterMode.netWpm, 1.6);
  assert.equal(doublePenalty.netWpm, 0.6);
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
    const expectedGross = Math.round((((Array.from(typed).length / 5) / (seconds / 60))) * 100) / 100;
    const expectedAccuracy = result.referenceCharacters ? Math.round((Math.max(0, result.referenceCharacters - result.weightedErrors) / result.referenceCharacters * 100) * 100) / 100 : (result.typedCharacters ? 0 : 100);
    assert.equal(result.grossWpm, expectedGross, name);
    assert.equal(result.accuracy, expectedAccuracy, name);
    assert.ok(result.netWpm >= 0 && result.netWpm <= result.grossWpm, name);
    assert.equal(result.totalErrors, result.wrongCharacters + result.omittedCharacters + result.extraCharacters, name);
  }
});

test('practice mode classifies half errors and exposes the exact highlighted spans', () => {
  const capitalization = classifyErrors('Hello', 'hello');
  assert.equal(capitalization.halfErrors, 1);
  assert.equal(capitalization.weightedErrors, 0.5);
  assert.equal(capitalization.typedParts.find((part) => part.severity !== 'correct').category, 'capitalization');
  const spacing = calculateResult('one two', 'one  two', 60);
  assert.equal(spacing.halfErrors, 1);
  assert.equal(spacing.fullErrors, 0);
  assert.equal(spacing.accuracy, 92.86);
  assert.equal(spacing.comparison.typedParts.some((part) => part.severity === 'half'), true);
});

test('SSC Stenographer mode promotes every half-category mistake to a full error', () => {
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

test('every configured half-error category receives exactly half weight in practice mode', () => {
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

test('persisted comparison spans and category totals share one source of truth', () => {
  const result = calculateResult('Hello, one two', 'hello one  too', 60);
  const categoryTotal = Object.values(result.errorBreakdown).reduce((sum, value) => sum + value, 0);
  assert.equal(categoryTotal, result.fullErrors + result.halfErrors);
  assert.equal(result.weightedErrors, result.fullErrors + result.halfErrors * 0.5);
  assert.equal(result.comparison.referenceParts.map((part) => part.text).join(''), 'Hello, one two');
  assert.equal(result.comparison.typedParts.map((part) => part.text).join(''), 'hello one  too');
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

test('adaptive alignment distance matches an independent reference algorithm', () => {
  const referenceDistance = (left, right) => {
    const a = Array.from(left); const b = Array.from(right); let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) { const current = [i]; for (let j = 1; j <= b.length; j += 1) current[j] = a[i - 1] === b[j - 1] ? previous[j - 1] : 1 + Math.min(previous[j - 1], previous[j], current[j - 1]); previous = current; }
    return previous[b.length];
  };
  let seed = 1234567;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const alphabet = Array.from('ab cह');
  for (let run = 0; run < 100; run += 1) {
    const make = () => Array.from({ length: Math.floor(random() * 30) }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
    const source = make(); const typed = make();
    assert.equal(alignCharacters(source, typed).totalErrors, referenceDistance(source, typed));
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
      assert.equal(result.correctCharacters, backspaceEnabled ? 12 : 11);
      assert.equal(result.netWpm, backspaceEnabled ? result.grossWpm : Math.max(0, result.grossWpm - 1));
    }
  }
});
