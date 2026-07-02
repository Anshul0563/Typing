import { compareTexts } from './comparisonEngine.js';

const segmentCharacters = (value) => Array.from(String(value ?? '').normalize('NFC'));
const segmentWords = (value) => String(value ?? '').normalize('NFC').match(/\S+/gu) || [];

export function alignWords(source, typed) {
  const target = segmentWords(source); const input = segmentWords(typed); const width = input.length + 1;
  let previous = Uint32Array.from({ length: width }, (_, index) => index);
  let previousWrong = new Uint32Array(width); let previousOmitted = new Uint32Array(width); let previousExtra = Uint32Array.from({ length: width }, (_, index) => index);
  for (let i = 1; i <= target.length; i += 1) {
    const current = new Uint32Array(width); const wrong = new Uint32Array(width); const omitted = new Uint32Array(width); const extra = new Uint32Array(width);
    current[0] = i; omitted[0] = i;
    for (let j = 1; j <= input.length; j += 1) {
      if (target[i - 1] === input[j - 1]) { current[j] = previous[j - 1]; wrong[j] = previousWrong[j - 1]; omitted[j] = previousOmitted[j - 1]; extra[j] = previousExtra[j - 1]; continue; }
      const substitution = previous[j - 1] + 1; const deletion = previous[j] + 1; const insertion = current[j - 1] + 1;
      if (substitution <= deletion && substitution <= insertion) { current[j] = substitution; wrong[j] = previousWrong[j - 1] + 1; omitted[j] = previousOmitted[j - 1]; extra[j] = previousExtra[j - 1]; }
      else if (deletion <= insertion) { current[j] = deletion; wrong[j] = previousWrong[j]; omitted[j] = previousOmitted[j] + 1; extra[j] = previousExtra[j]; }
      else { current[j] = insertion; wrong[j] = wrong[j - 1]; omitted[j] = omitted[j - 1]; extra[j] = extra[j - 1] + 1; }
    }
    previous = current; previousWrong = wrong; previousOmitted = omitted; previousExtra = extra;
  }
  return { typedWords: input.length, referenceWords: target.length, wrongWords: previousWrong[input.length], omittedWords: previousOmitted[input.length], extraWords: previousExtra[input.length], totalWordErrors: previous[input.length] };
}

export function alignCharacters(source, typed) {
  const target = segmentCharacters(source); const input = segmentCharacters(typed); const width = input.length + 1;
  let cost = Uint32Array.from({ length: width }, (_, index) => index);
  let correct = new Uint32Array(width); let wrong = new Uint32Array(width); let omitted = new Uint32Array(width); let extra = Uint32Array.from({ length: width }, (_, index) => index);
  for (let i = 1; i <= target.length; i += 1) {
    const nextCost = new Uint32Array(width); const nextCorrect = new Uint32Array(width); const nextWrong = new Uint32Array(width); const nextOmitted = new Uint32Array(width); const nextExtra = new Uint32Array(width);
    nextCost[0] = i; nextOmitted[0] = i;
    for (let j = 1; j <= input.length; j += 1) {
      if (target[i - 1] === input[j - 1]) { nextCost[j] = cost[j - 1]; nextCorrect[j] = correct[j - 1] + 1; nextWrong[j] = wrong[j - 1]; nextOmitted[j] = omitted[j - 1]; nextExtra[j] = extra[j - 1]; continue; }
      const substitution = cost[j - 1] + 1; const deletion = cost[j] + 1; const insertion = nextCost[j - 1] + 1;
      if (substitution <= deletion && substitution <= insertion) { nextCost[j] = substitution; nextCorrect[j] = correct[j - 1]; nextWrong[j] = wrong[j - 1] + 1; nextOmitted[j] = omitted[j - 1]; nextExtra[j] = extra[j - 1]; }
      else if (deletion <= insertion) { nextCost[j] = deletion; nextCorrect[j] = correct[j]; nextWrong[j] = wrong[j]; nextOmitted[j] = omitted[j] + 1; nextExtra[j] = extra[j]; }
      else { nextCost[j] = insertion; nextCorrect[j] = nextCorrect[j - 1]; nextWrong[j] = nextWrong[j - 1]; nextOmitted[j] = nextOmitted[j - 1]; nextExtra[j] = nextExtra[j - 1] + 1; }
    }
    cost = nextCost; correct = nextCorrect; wrong = nextWrong; omitted = nextOmitted; extra = nextExtra;
  }
  return { correctCharacters: correct[input.length], wrongCharacters: wrong[input.length], omittedCharacters: omitted[input.length], extraCharacters: extra[input.length], totalErrors: cost[input.length], referenceCharacters: target.length, typedCharacters: input.length };
}

export const classifyErrors = compareTexts;

export function calculateResult(source, typed, elapsedSeconds, telemetry = {}, scoringRule = {}) {
  const alignment = alignCharacters(source.replace(/\r\n?/g, '\n'), typed.replace(/\r\n?/g, '\n'));
  const wordAlignment = alignWords(source, typed); const safeSeconds = Math.max(1, Number(elapsedSeconds) || 1); const minutes = safeSeconds / 60;
  const grossWpm = (alignment.typedCharacters / 5) / minutes;
  const evaluationMode = scoringRule.evaluationMode === 'ssc-stenographer' ? 'ssc-stenographer' : 'practice';
  const errors = compareTexts(source, typed, evaluationMode === 'ssc-stenographer');
  const scoringMode = scoringRule.mode === 'character' ? 'character' : 'standard-word';
  const errorPenalty = Math.min(10, Math.max(0.1, Number(scoringRule.errorPenalty) || 1));
  const errorUnits = errors.weightedErrors * errorPenalty;
  const netWpm = Math.min(grossWpm, Math.max(0, grossWpm - errorUnits / minutes));
  const accuracy = alignment.referenceCharacters ? Math.max(0, (alignment.referenceCharacters - errors.weightedErrors) / alignment.referenceCharacters * 100) : (alignment.typedCharacters ? 0 : 100);
  const round = (value) => Math.round(value * 100) / 100;
  return {
    grossWpm: round(grossWpm), netWpm: round(netWpm), accuracy: round(accuracy), ...alignment, ...wordAlignment,
    errorUnits: round(errorUnits), scoringMode, errorPenalty, evaluationMode, fullErrors: errors.fullErrors, halfErrors: errors.halfErrors, weightedErrors: errors.weightedErrors,
    errorBreakdown: errors.counts, comparison: { referenceParts: errors.referenceParts, typedParts: errors.typedParts, referenceReviewParts: errors.referenceReviewParts, typedReviewParts: errors.typedReviewParts },
    totalKeystrokes: Math.max(0, Math.floor(Number(telemetry.totalKeystrokes) || 0)), backspaceCount: Math.max(0, Math.floor(Number(telemetry.backspaceCount) || 0)), timeTaken: round(safeSeconds)
  };
}
