const characters = (value) => Array.from(String(value ?? "").normalize("NFC"));

const HALF_CATEGORIES = new Set([
  "spacing",
  "capitalization",
  "punctuation",
  "transposition",
  "paragraphic",
]);

const EMPTY_COUNTS = Object.freeze({
  omission: 0,
  addition: 0,
  spelling: 0,
  substitution: 0,
  repetition: 0,
  incompleteWord: 0,
  spacing: 0,
  capitalization: 0,
  punctuation: 0,
  transposition: 0,
  paragraphic: 0,
});

const isPunctuation = (value) => /[\p{P}\p{S}]/u.test(value);
const isLetter = (value) => /\p{L}/u.test(value);

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/\r\n?/g, "\n");

const canonicalWord = (value) =>
  String(value)
    .normalize("NFC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]/gu, "");

function tokenize(value) {
  const text = normalizeText(value);
  const words = [];
  let separator = "";

  for (const match of text.matchAll(/\s+|\S+/gu)) {
    if (/^\s+$/u.test(match[0])) {
      separator += match[0];
    } else {
      words.push({
        text: match[0],
        separator,
        canonical: canonicalWord(match[0]),
      });
      separator = "";
    }
  }

  return { words, trailing: separator };
}

function severityFor(category, allErrorsAreFull) {
  if (category === "correct") return "correct";
  if (allErrorsAreFull) return "full";
  return HALF_CATEGORIES.has(category) ? "half" : "full";
}

function missingMarker(category, text) {
  if (category === "spacing") return "␠";
  if (category === "paragraphic") return "↵";
  if (category === "punctuation") return text || "·";
  return "∅";
}

function spanText(words, start, end) {
  return words.slice(start, end).map((word) => word.separator + word.text).join("");
}

function spanWordText(words, start, end) {
  return words.slice(start, end).map((word) => word.text).join("");
}

function spanCanonical(words, start, end) {
  return words.slice(start, end).map((word) => word.canonical).join("");
}

function hasLineBreak(value) {
  return /[\n\r]/u.test(value);
}

function isCaseOnlyDifference(sourceText, typedText) {
  return (
    sourceText &&
    typedText &&
    sourceText.localeCompare(typedText, undefined, { sensitivity: "accent" }) === 0
  );
}

function isAdjacentCharTranspose(sourceText, typedText) {
  const source = characters(sourceText);
  const typed = characters(typedText);
  if (source.length !== typed.length || source.length < 2) return false;

  const changed = [];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== typed[index]) changed.push(index);
  }

  return (
    changed.length === 2 &&
    changed[1] === changed[0] + 1 &&
    source[changed[0]] === typed[changed[1]] &&
    source[changed[1]] === typed[changed[0]]
  );
}

function isIncompleteWord(sourceText, typedText) {
  if (!sourceText || !typedText) return false;
  const source = canonicalWord(sourceText);
  const typed = canonicalWord(typedText);
  return source.length > typed.length && (source.startsWith(typed) || source.endsWith(typed));
}

function strippedWordText(value) {
  return String(value).normalize("NFC").replace(/[\p{P}\p{S}]/gu, "");
}

function hasCapitalizationDifference(sourceText, typedText) {
  const source = strippedWordText(sourceText);
  const typed = strippedWordText(typedText);
  return Boolean(source && typed && source !== typed && isCaseOnlyDifference(source, typed));
}

function classifyWordPair(sourceText, typedText) {
  if (sourceText === typedText) return "correct";
  if (isCaseOnlyDifference(sourceText, typedText)) return "capitalization";
  if (canonicalWord(sourceText) === canonicalWord(typedText)) return "punctuation";

  const combined = [...characters(sourceText), ...characters(typedText)];
  if (combined.length && combined.every(isPunctuation)) return "punctuation";
  if (isAdjacentCharTranspose(sourceText, typedText)) return "transposition";
  if (isIncompleteWord(sourceText, typedText)) return "incompleteWord";
  if (combined.length && combined.every(isLetter)) return "spelling";
  return "substitution";
}

function editDistance(sourceText, typedText) {
  const source = characters(canonicalWord(sourceText));
  const typed = characters(canonicalWord(typedText));
  const width = typed.length + 1;
  const costs = new Uint16Array((source.length + 1) * width);

  for (let i = 1; i <= source.length; i += 1) costs[i * width] = i;
  for (let j = 1; j <= typed.length; j += 1) costs[j] = j;

  for (let i = 1; i <= source.length; i += 1) {
    for (let j = 1; j <= typed.length; j += 1) {
      const index = i * width + j;
      const substitution = costs[(i - 1) * width + (j - 1)] + (source[i - 1] === typed[j - 1] ? 0 : 1);
      const deletion = costs[(i - 1) * width + j] + 1;
      const insertion = costs[i * width + (j - 1)] + 1;
      costs[index] = Math.min(substitution, deletion, insertion);
    }
  }

  return costs[source.length * width + typed.length];
}

function pairCost(sourceWord, typedWord) {
  const category = classifyWordPair(sourceWord.text, typedWord.text);
  if (category === "correct") return 0;
  if (category === "capitalization" || category === "punctuation" || category === "transposition") return 0.2;
  if (category === "incompleteWord") return 0.8;

  const sourceLength = characters(sourceWord.canonical).length;
  const typedLength = characters(typedWord.canonical).length;
  const maxLength = Math.max(sourceLength, typedLength);
  if (maxLength === 0) return 1.2;

  const distance = editDistance(sourceWord.text, typedWord.text);
  const ratio = distance / maxLength;
  if (ratio <= 0.45) return 1.1;
  if (ratio <= 0.7 && Math.min(sourceLength, typedLength) >= 4) return 1.45;
  return 2.2;
}

function mergeSplitCategory(sourceSeparatorText, typedSeparatorText) {
  return hasLineBreak(sourceSeparatorText + typedSeparatorText) ? "paragraphic" : "spacing";
}

function constrainedCharacterStats(sourceText, typedText) {
  const source = characters(sourceText);
  const typed = characters(typedText);
  const width = typed.length + 1;
  const costs = new Uint16Array((source.length + 1) * width);
  const directions = new Uint8Array(costs.length);

  for (let i = 1; i <= source.length; i += 1) {
    costs[i * width] = i;
    directions[i * width] = 2;
  }
  for (let j = 1; j <= typed.length; j += 1) {
    costs[j] = j;
    directions[j] = 3;
  }

  for (let i = 1; i <= source.length; i += 1) {
    for (let j = 1; j <= typed.length; j += 1) {
      const index = i * width + j;
      if (source[i - 1] === typed[j - 1]) {
        costs[index] = costs[(i - 1) * width + (j - 1)];
        directions[index] = 1;
        continue;
      }

      let cost = costs[(i - 1) * width + (j - 1)] + 1;
      let direction = 4;

      const deletion = costs[(i - 1) * width + j] + 1;
      if (deletion < cost) {
        cost = deletion;
        direction = 2;
      }

      const insertion = costs[i * width + (j - 1)] + 1;
      if (insertion < cost) {
        cost = insertion;
        direction = 3;
      }

      if (
        i > 1 &&
        j > 1 &&
        source[i - 2] === typed[j - 1] &&
        source[i - 1] === typed[j - 2]
      ) {
        const transpose = costs[(i - 2) * width + (j - 2)] + 1;
        if (transpose <= cost) {
          cost = transpose;
          direction = 5;
        }
      }

      costs[index] = cost;
      directions[index] = direction;
    }
  }

  let correctCharacters = 0;
  let wrongCharacters = 0;
  let omittedCharacters = 0;
  let extraCharacters = 0;
  let i = source.length;
  let j = typed.length;

  while (i || j) {
    const direction = directions[i * width + j];
    if (direction === 1) {
      correctCharacters += 1;
      i -= 1;
      j -= 1;
    } else if (direction === 5) {
      wrongCharacters += 2;
      i -= 2;
      j -= 2;
    } else if (direction === 4 && i && j) {
      wrongCharacters += 1;
      i -= 1;
      j -= 1;
    } else if ((direction === 2 || !j) && i) {
      omittedCharacters += 1;
      i -= 1;
    } else {
      extraCharacters += 1;
      j -= 1;
    }
  }

  return { correctCharacters, wrongCharacters, omittedCharacters, extraCharacters };
}

function betterCandidate(candidate, current) {
  if (!current) return true;
  if (candidate.cost !== current.cost) return candidate.cost < current.cost;
  if (candidate.matches !== current.matches) return candidate.matches > current.matches;
  if (candidate.gaps !== current.gaps) return candidate.gaps < current.gaps;
  return candidate.rank < current.rank;
}

function alignWordSequences(sourceWords, typedWords) {
  const m = sourceWords.length;
  const n = typedWords.length;
  const width = n + 1;
  const cells = Array.from({ length: (m + 1) * width }, () => null);
  cells[0] = { cost: 0, matches: 0, gaps: 0, rank: 0, previous: null, operation: null };

  const setCell = (i, j, candidate) => {
    const index = i * width + j;
    if (betterCandidate(candidate, cells[index])) cells[index] = candidate;
  };

  for (let i = 0; i <= m; i += 1) {
    for (let j = 0; j <= n; j += 1) {
      const current = cells[i * width + j];
      if (!current) continue;

      if (i < m && j < n) {
        const cost = pairCost(sourceWords[i], typedWords[j]);
        setCell(i + 1, j + 1, {
          cost: current.cost + cost,
          matches: current.matches + (cost < 2 ? 1 : 0),
          gaps: current.gaps,
          rank: cost === 0 ? 0 : 2,
          previous: [i, j],
          operation: { type: "pair", sourceStart: i, sourceEnd: i + 1, typedStart: j, typedEnd: j + 1 },
        });
      }

      if (i + 1 < m && j < n && spanCanonical(sourceWords, i, i + 2) === typedWords[j].canonical) {
        setCell(i + 2, j + 1, {
          cost: current.cost + 0.5,
          matches: current.matches + 1,
          gaps: current.gaps,
          rank: 1,
          previous: [i, j],
          operation: { type: "merge", sourceStart: i, sourceEnd: i + 2, typedStart: j, typedEnd: j + 1 },
        });
      }

      if (i < m && j + 1 < n && sourceWords[i].canonical === spanCanonical(typedWords, j, j + 2)) {
        setCell(i + 1, j + 2, {
          cost: current.cost + 0.5,
          matches: current.matches + 1,
          gaps: current.gaps,
          rank: 1,
          previous: [i, j],
          operation: { type: "split", sourceStart: i, sourceEnd: i + 1, typedStart: j, typedEnd: j + 2 },
        });
      }

      if (
        i + 1 < m &&
        j + 1 < n &&
        sourceWords[i].canonical === typedWords[j + 1].canonical &&
        sourceWords[i + 1].canonical === typedWords[j].canonical
      ) {
        setCell(i + 2, j + 2, {
          cost: current.cost + 0.5,
          matches: current.matches + 2,
          gaps: current.gaps,
          rank: 1,
          previous: [i, j],
          operation: { type: "word-transposition", sourceStart: i, sourceEnd: i + 2, typedStart: j, typedEnd: j + 2 },
        });
      }

      if (i < m) {
        setCell(i + 1, j, {
          cost: current.cost + 1,
          matches: current.matches,
          gaps: current.gaps + 1,
          rank: 3,
          previous: [i, j],
          operation: { type: "omission", sourceStart: i, sourceEnd: i + 1, typedStart: j, typedEnd: j },
        });
      }

      if (j < n) {
        setCell(i, j + 1, {
          cost: current.cost + 1,
          matches: current.matches,
          gaps: current.gaps + 1,
          rank: 4,
          previous: [i, j],
          operation: { type: "addition", sourceStart: i, sourceEnd: i, typedStart: j, typedEnd: j + 1 },
        });
      }
    }
  }

  const operations = [];
  let i = m;
  let j = n;
  while (i || j) {
    const cell = cells[i * width + j];
    operations.push(cell.operation);
    [i, j] = cell.previous;
  }

  return operations.reverse();
}

function addStats(target, stats) {
  target.correctCharacters += stats.correctCharacters;
  target.wrongCharacters += stats.wrongCharacters;
  target.omittedCharacters += stats.omittedCharacters;
  target.extraCharacters += stats.extraCharacters;
}

function isRepetition(operation, sourceWords, typedWords) {
  if (operation.type !== "addition") return false;
  const typed = typedWords[operation.typedStart];
  const previousSource = sourceWords[operation.sourceStart - 1];
  const nextSource = sourceWords[operation.sourceStart];
  return Boolean(
    typed?.canonical &&
      ((previousSource && previousSource.canonical === typed.canonical) ||
        (nextSource && nextSource.canonical === typed.canonical)),
  );
}

function createComparisonBuilder(allErrorsAreFull) {
  const counts = { ...EMPTY_COUNTS };
  const alignmentTree = [];
  const referenceParts = [];
  const typedParts = [];
  const referenceReviewParts = [];
  const typedReviewParts = [];
  const characterStats = {
    correctCharacters: 0,
    wrongCharacters: 0,
    omittedCharacters: 0,
    extraCharacters: 0,
  };
  const wordStats = { wrongWords: 0, omittedWords: 0, extraWords: 0 };

  const pushPart = (parts, text, severity, category, missing = false) => {
    if (!text && !missing) return;
    const last = parts.at(-1);
    if (last && !last.missing && !missing && last.severity === severity && last.category === category) {
      last.text += text;
      return;
    }
    parts.push({ text, severity, category, ...(missing ? { missing: true } : {}) });
  };

  const pushNode = ({ sourceText, typedText, category, severity, sourceProduction = true, typedProduction = true }) => {
    alignmentTree.push({ sourceText, typedText, category, severity });

    if (sourceProduction) pushPart(referenceParts, sourceText, severity, category);
    if (typedProduction) pushPart(typedParts, typedText, severity, category);

    if (sourceText) {
      pushPart(referenceReviewParts, sourceText, severity, category);
    } else if (typedText) {
      pushPart(referenceReviewParts, missingMarker(category, typedText), severity, category, true);
    }

    if (typedText) {
      pushPart(typedReviewParts, typedText, severity, category);
    } else if (sourceText) {
      pushPart(typedReviewParts, missingMarker(category, sourceText), severity, category, true);
    }
  };

  const commitSeparator = (sourceSeparator, typedSeparator) => {
    if (!sourceSeparator && !typedSeparator) return;
    if (sourceSeparator === typedSeparator) {
      pushNode({
        sourceText: sourceSeparator,
        typedText: typedSeparator,
        category: "correct",
        severity: "correct",
      });
      addStats(characterStats, constrainedCharacterStats(sourceSeparator, typedSeparator));
      return;
    }

    const category = hasLineBreak(sourceSeparator + typedSeparator) ? "paragraphic" : "spacing";
    const severity = severityFor(category, allErrorsAreFull);
    counts[category] += 1;
    pushNode({ sourceText: sourceSeparator, typedText: typedSeparator, category, severity });
    addStats(characterStats, constrainedCharacterStats(sourceSeparator, typedSeparator));
  };

  const commitWordPair = (sourceWord, typedWord) => {
    commitSeparator(sourceWord.separator, typedWord.separator);

    const category = classifyWordPair(sourceWord.text, typedWord.text);
    const severity = severityFor(category, allErrorsAreFull);
    if (category !== "correct") {
      counts[category] += 1;
      wordStats.wrongWords += 1;
    }

    pushNode({
      sourceText: sourceWord.text,
      typedText: typedWord.text,
      category,
      severity,
    });
    if (category === "punctuation") {
      const sourcePunctuation = characters(sourceWord.text).filter(isPunctuation).join("");
      const typedPunctuation = characters(typedWord.text).filter(isPunctuation).join("");
      if (sourcePunctuation && sourcePunctuation !== typedPunctuation) {
        pushPart(typedReviewParts, sourcePunctuation, severity, category, true);
      } else if (typedPunctuation && sourcePunctuation !== typedPunctuation) {
        pushPart(referenceReviewParts, typedPunctuation, severity, category, true);
      }
    }
    addStats(characterStats, constrainedCharacterStats(sourceWord.text, typedWord.text));
  };

  const commitOmission = (sourceWord) => {
    counts.omission += 1;
    wordStats.omittedWords += 1;
    const severity = severityFor("omission", allErrorsAreFull);
    pushNode({
      sourceText: sourceWord.separator + sourceWord.text,
      typedText: "",
      category: "omission",
      severity,
      typedProduction: false,
    });
    addStats(characterStats, constrainedCharacterStats(sourceWord.separator + sourceWord.text, ""));
  };

  const commitAddition = (typedWord, category = "addition") => {
    counts[category] += 1;
    wordStats.extraWords += 1;
    const severity = severityFor(category, allErrorsAreFull);
    pushNode({
      sourceText: "",
      typedText: typedWord.separator + typedWord.text,
      category,
      severity,
      sourceProduction: false,
    });
    addStats(characterStats, constrainedCharacterStats("", typedWord.separator + typedWord.text));
  };

  const commitSpacingSpan = (operation, sourceWords, typedWords) => {
    const sourceText = spanText(sourceWords, operation.sourceStart, operation.sourceEnd);
    const typedText = spanText(typedWords, operation.typedStart, operation.typedEnd);
    const category = mergeSplitCategory(sourceText, typedText);
    const severity = severityFor(category, allErrorsAreFull);

    counts[category] += 1;
    pushNode({ sourceText, typedText, category, severity });
    if (sourceText.length > typedText.length) {
      pushPart(typedReviewParts, missingMarker(category, sourceText), severity, category, true);
    } else if (typedText.length > sourceText.length) {
      pushPart(referenceReviewParts, missingMarker(category, typedText), severity, category, true);
    }
    addStats(characterStats, constrainedCharacterStats(sourceText, typedText));
  };

  const commitWordTransposition = (operation, sourceWords, typedWords) => {
    const sourceText = spanText(sourceWords, operation.sourceStart, operation.sourceEnd);
    const typedText = spanText(typedWords, operation.typedStart, operation.typedEnd);
    const category = "transposition";
    const severity = severityFor(category, allErrorsAreFull);

    counts.transposition += 1;
    wordStats.wrongWords += 2;
    pushNode({ sourceText, typedText, category, severity });
    addStats(characterStats, constrainedCharacterStats(sourceText, typedText));
  };

  return {
    counts,
    alignmentTree,
    referenceParts,
    typedParts,
    referenceReviewParts,
    typedReviewParts,
    characterStats,
    wordStats,
    commitSeparator,
    commitWordPair,
    commitOmission,
    commitAddition,
    commitSpacingSpan,
    commitWordTransposition,
  };
}

export function compareTexts(sourceValue, typedValue, allErrorsAreFull = false) {
  const sourceText = normalizeText(sourceValue);
  const typedText = normalizeText(typedValue);
  const source = tokenize(sourceText);
  const typed = tokenize(typedText);
  const operations = alignWordSequences(source.words, typed.words);
  const builder = createComparisonBuilder(allErrorsAreFull);

  for (const operation of operations) {
    if (operation.type === "pair") {
      builder.commitWordPair(source.words[operation.sourceStart], typed.words[operation.typedStart]);
    } else if (operation.type === "omission") {
      builder.commitOmission(source.words[operation.sourceStart]);
    } else if (operation.type === "addition") {
      const category = isRepetition(operation, source.words, typed.words) ? "repetition" : "addition";
      builder.commitAddition(typed.words[operation.typedStart], category);
    } else if (operation.type === "merge" || operation.type === "split") {
      builder.commitSpacingSpan(operation, source.words, typed.words);
    } else if (operation.type === "word-transposition") {
      builder.commitWordTransposition(operation, source.words, typed.words);
    }
  }

  builder.commitSeparator(source.trailing, typed.trailing);

  const total = Object.values(builder.counts).reduce((sum, count) => sum + count, 0);
  const halfErrors = allErrorsAreFull
    ? 0
    : [...HALF_CATEGORIES].reduce((sum, category) => sum + builder.counts[category], 0);
  const weightedErrors = total - halfErrors * 0.5;
  const referenceCharacters = characters(sourceText).length;
  const typedCharacters = characters(typedText).length;
  const totalErrors =
    builder.characterStats.wrongCharacters +
    builder.characterStats.omittedCharacters +
    builder.characterStats.extraCharacters;

  return {
    alignmentTree: builder.alignmentTree,
    counts: builder.counts,
    fullErrors: total - halfErrors,
    halfErrors,
    weightedErrors,
    referenceCharacters,
    typedCharacters,
    ...builder.characterStats,
    totalErrors,
    referenceWords: source.words.length,
    typedWords: typed.words.length,
    ...builder.wordStats,
    totalWordErrors:
      builder.wordStats.wrongWords + builder.wordStats.omittedWords + builder.wordStats.extraWords,
    referenceParts: builder.referenceParts,
    typedParts: builder.typedParts,
    referenceReviewParts: builder.referenceReviewParts,
    typedReviewParts: builder.typedReviewParts,
  };
}

export const alignCharacters = (source, typed) => {
  const comparison = compareTexts(source, typed);
  return {
    correctCharacters: comparison.correctCharacters,
    wrongCharacters: comparison.wrongCharacters,
    omittedCharacters: comparison.omittedCharacters,
    extraCharacters: comparison.extraCharacters,
    totalErrors: comparison.totalErrors,
    referenceCharacters: comparison.referenceCharacters,
    typedCharacters: comparison.typedCharacters,
  };
};

export const alignWords = (source, typed) => {
  const comparison = compareTexts(source, typed);
  return {
    typedWords: comparison.typedWords,
    referenceWords: comparison.referenceWords,
    wrongWords: comparison.wrongWords,
    omittedWords: comparison.omittedWords,
    extraWords: comparison.extraWords,
    totalWordErrors: comparison.totalWordErrors,
  };
};

export const classifyErrors = (source, typed) => compareTexts(source, typed);
