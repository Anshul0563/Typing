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
  const scoringMode = scoringRule.mode === 'character' ? 'character' : 'standard-word';
  const errorPenalty = Math.min(10, Math.max(0.1, Number(scoringRule.errorPenalty) || 1));
  const baseErrorUnits = scoringMode === 'character' ? alignment.totalErrors / 5 : wordAlignment.totalWordErrors;
  const errorUnits = baseErrorUnits * errorPenalty;
  const netWpm = Math.min(grossWpm, Math.max(0, grossWpm - errorUnits / minutes));
  const accuracyUnits = alignment.correctCharacters + alignment.totalErrors;
  const accuracy = accuracyUnits ? (alignment.correctCharacters / accuracyUnits) * 100 : 0;
  const round = (value) => Math.round(value * 100) / 100;
  const backspaceCount = Math.max(0, Math.floor(Number(telemetry.backspaceCount) || 0));
  const totalKeystrokes = Math.max(0, Math.floor(Number(telemetry.totalKeystrokes) || 0));

  return {
    grossWpm: round(grossWpm), netWpm: round(netWpm), accuracy: round(accuracy),
    ...alignment,
    ...wordAlignment,
    errorUnits: round(errorUnits), scoringMode, errorPenalty,
    totalKeystrokes,
    backspaceCount,
    timeTaken: round(safeSeconds)
  };
}
