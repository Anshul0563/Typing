import { compareTexts } from './comparisonEngine.js';

const characterProjection = (comparison) => ({
  correctCharacters: comparison.correctCharacters,
  wrongCharacters: comparison.wrongCharacters,
  omittedCharacters: comparison.omittedCharacters,
  extraCharacters: comparison.extraCharacters,
  totalErrors: comparison.totalErrors,
  referenceCharacters: comparison.referenceCharacters,
  typedCharacters: comparison.typedCharacters
});

const wordProjection = (comparison) => ({
  typedWords: comparison.typedWords,
  referenceWords: comparison.referenceWords,
  wrongWords: comparison.wrongWords,
  omittedWords: comparison.omittedWords,
  extraWords: comparison.extraWords,
  totalWordErrors: comparison.totalWordErrors
});

// Compatibility projections. They do not perform independent alignment.
export const alignCharacters = (source, typed) => characterProjection(compareTexts(source, typed));
export const alignWords = (source, typed) => wordProjection(compareTexts(source, typed));
export const classifyErrors = compareTexts;

export function calculateResult(source, typed, elapsedSeconds, telemetry = {}, scoringRule = {}) {
  const evaluationMode = scoringRule.evaluationMode === 'ssc-stenographer' ? 'ssc-stenographer' : 'practice';
  const comparison = compareTexts(source, typed, evaluationMode === 'ssc-stenographer');
  const safeSeconds = Math.max(1, Number(elapsedSeconds) || 1);
  const minutes = safeSeconds / 60;
  const grossWpm = comparison.typedWords / minutes;
  const scoringMode = 'standard-word';
  const errorPenalty = Math.min(10, Math.max(0.1, Number(scoringRule.errorPenalty) || 1));
  const errorUnits = comparison.weightedErrors * errorPenalty;
  const netWpm = Math.min(grossWpm, Math.max(0, grossWpm - errorUnits / minutes));
  const accuracy = comparison.referenceWords
    ? Math.max(0, (comparison.referenceWords - comparison.weightedErrors) / comparison.referenceWords * 100)
    : (comparison.typedWords ? 0 : 100);
  const round = (value) => Math.round(value * 100) / 100;

  return {
    grossWpm: round(grossWpm),
    netWpm: round(netWpm),
    accuracy: round(accuracy),
    ...wordProjection(comparison),
    totalErrors: comparison.totalWordErrors,
    errorUnits: round(errorUnits),
    scoringMode,
    errorPenalty,
    evaluationMode,
    fullErrors: comparison.fullErrors,
    halfErrors: comparison.halfErrors,
    weightedErrors: comparison.weightedErrors,
    errorBreakdown: comparison.counts,
    comparison: {
      alignmentTree: comparison.alignmentTree,
      referenceParts: comparison.referenceParts,
      typedParts: comparison.typedParts,
      referenceReviewParts: comparison.referenceReviewParts,
      typedReviewParts: comparison.typedReviewParts
    },
    totalKeystrokes: Math.max(0, Math.floor(Number(telemetry.totalKeystrokes) || 0)),
    backspaceCount: Math.max(0, Math.floor(Number(telemetry.backspaceCount) || 0)),
    timeTaken: round(safeSeconds)
  };
}
