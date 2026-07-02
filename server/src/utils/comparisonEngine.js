const characters = (value) => Array.from(String(value ?? "").normalize("NFC"));

const isPunctuation = (value) => /[\p{P}\p{S}]/u.test(value);
const isLetter = (value) => /\p{L}/u.test(value);

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

const canonicalWord = (value) =>
  String(value)
    .normalize("NFC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]/gu, "");

function tokenize(value) {
  const text = String(value ?? "")
    .normalize("NFC")
    .replace(/\r\n?/g, "\n");

  const words = [];
  let separator = "";

  for (const match of text.matchAll(/\s+|\S+/gu)) {
    if (/^\s+$/u.test(match[0])) separator += match[0];
    else {
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
  if (allErrorsAreFull) return "full";
  return HALF_CATEGORIES.has(category) ? "half" : "full";
}

function missingMarker(category, text) {
  if (category === "spacing") return "␠";
  if (category === "paragraphic") return "↵";
  if (category === "punctuation") return text || "·";
  return "∅";
}

function classifyWordPair(sourceText, typedText) {
  // `sourceText` and `typedText` are the word payloads (no separators).
  if (sourceText === typedText) return { category: "correct", severity: "correct" };

  if (
    sourceText &&
    typedText &&
    sourceText.localeCompare(typedText, undefined, { sensitivity: "accent" }) === 0
  ) {
    return { category: "capitalization", severity: "half" };
  }

  const combined = [...sourceText, ...typedText];
  if (combined.length && combined.every(isPunctuation)) {
    return { category: "punctuation", severity: "half" };
  }

  if (!typedText && sourceText) return { category: "incompleteWord", severity: "full" };

  if (combined.length && combined.every(isLetter)) {
    return { category: "spelling", severity: "full" };
  }

  return { category: "substitution", severity: "full" };
}

function constrainedCharacterStats(sourceText, typedText) {
  // Counts are computed by character edit alignment restricted to this word pair.
  // This is where character comparisons happen. No alignment can jump across words.
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

  // Backtrace operations to compute correct/wrong/omitted/extra counts.
  // Note: This is still within the same word pair only.
  let correctCharacters = 0;
  let wrongCharacters = 0;
  let omittedCharacters = 0;
  let extraCharacters = 0;

  let i = source.length;
  let j = typed.length;

  while (i || j) {
    const direction = directions[i * width + j];
    if (direction === 1) {
      // equal
      correctCharacters += 1;
      i -= 1;
      j -= 1;
    } else if (direction === 5) {
      // transposed pair: count as wrong for both swapped characters
      // We treat as 2 paired characters differing.
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

function wordAnchors(sourceWords, typedWords) {
  // Strict word-first alignment using canonical word equality.
  // We keep this DP lightweight: compute LCS anchors by canonical equality only.
  const m = sourceWords.length;
  const n = typedWords.length;

  const width = n + 1;
  const directions = new Uint8Array((m + 1) * width);
  const dp = new Uint16Array((m + 1) * width);

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const index = i * width + j;
      if (sourceWords[i - 1].canonical && sourceWords[i - 1].canonical === typedWords[j - 1].canonical) {
        dp[index] = dp[(i - 1) * width + (j - 1)] + 1;
        directions[index] = 1; // match
      } else {
        const up = dp[(i - 1) * width + j];
        const left = dp[i * width + (j - 1)];
        if (up >= left) {
          dp[index] = up;
          directions[index] = 2; // up
        } else {
          dp[index] = left;
          directions[index] = 3; // left
        }
      }
    }
  }

  const anchors = [];
  let i = m;
  let j = n;
  while (i && j) {
    const dir = directions[i * width + j];
    if (dir === 1) {
      anchors.push({ sourceIndex: i - 1, typedIndex: j - 1 });
      i -= 1;
      j -= 1;
    } else if (dir === 2) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  return anchors.reverse();
}

function buildPartsFromWordPair({
  sourceSeparator,
  typedSeparator,
  sourceWord,
  typedWord,
  category,
  severity,
  counts,
  alignmentTree,
  referenceParts,
  typedParts,
  referenceReviewParts,
  typedReviewParts,
  allErrorsAreFull,
}) {
  // Category can be either full-word or half-word/half-category.
  // Separators are handled separately as spacing/paragraphic.

  if (sourceWord) {
    referenceParts.push({ text: sourceWord.separator + sourceWord.text, severity, category });
    referenceReviewParts.push({ text: sourceWord.separator + sourceWord.text, severity, category });
  }
  if (typedWord) {
    typedParts.push({ text: typedWord.separator + typedWord.text, severity, category });
    typedReviewParts.push({ text: typedWord.separator + typedWord.text, severity, category });
  }

  // Count errors
  counts[category] += 1;
  alignmentTree.push({ sourceText: sourceWord ? sourceWord.separator + sourceWord.text : "", typedText: typedWord ? typedWord.separator + typedWord.text : "", category, severity });
}

export function compareTexts(sourceValue, typedValue, allErrorsAreFull = false) {
  const source = tokenize(sourceValue);
  const typed = tokenize(typedValue);

  const counts = { ...EMPTY_COUNTS };
  const alignmentTree = [];

  const characterStats = {
    correctCharacters: 0,
    wrongCharacters: 0,
    omittedCharacters: 0,
    extraCharacters: 0,
  };

  const wordStats = { wrongWords: 0, omittedWords: 0, extraWords: 0 };

  const referenceParts = [];
  const typedParts = [];
  const referenceReviewParts = [];
  const typedReviewParts = [];

  // We align word tokens first.
  const anchors = wordAnchors(source.words, typed.words);

  let sCursor = 0;
  let tCursor = 0;

  const commitSeparator = (left, right) => {
    if (left === right) {
      if (left) {
        alignmentTree.push({ sourceText: left, typedText: left, category: "correct", severity: "correct" });
        referenceParts.push({ text: left, severity: "correct", category: "correct" });
        referenceReviewParts.push({ text: left, severity: "correct", category: "correct" });
        typedParts.push({ text: left, severity: "correct", category: "correct" });
        typedReviewParts.push({ text: left, severity: "correct", category: "correct" });
      }
      return;
    }

    const category = /[\n\r]/u.test(left + right) ? "paragraphic" : "spacing";
    const severity = severityFor(category, allErrorsAreFull);
    counts[category] += 1;

    alignmentTree.push({ sourceText: left, typedText: right, category, severity });

    // Reference panel: show separator text if exists, otherwise show a missing-marker for review.
    if (left) {
      referenceParts.push({ text: left, severity, category });
      referenceReviewParts.push({ text: left, severity, category });
    } else {
      // missing from reference
      referenceReviewParts.push({
        text: missingMarker(category, right),
        severity,
        category,
        missing: true,
      });
    }

    // Typed panel
    if (right) {
      typedParts.push({ text: right, severity, category });
      typedReviewParts.push({ text: right, severity, category });
    } else {
      typedReviewParts.push({
        text: missingMarker(category, left),
        severity,
        category,
        missing: true,
      });
    }

    // Character stats for separators are counted by constrained alignment of the separator strings.
    const { correctCharacters, wrongCharacters, omittedCharacters, extraCharacters } = constrainedCharacterStats(left, right);
    characterStats.correctCharacters += correctCharacters;
    characterStats.wrongCharacters += wrongCharacters;
    characterStats.omittedCharacters += omittedCharacters;
    characterStats.extraCharacters += extraCharacters;
  };

  // Process segments between anchors.
  const handleWordPairOrGaps = (sourceSeg, typedSeg) => {
    // sourceSeg and typedSeg are arrays of word tokens.
    // If both have at least one word, pair by index until one runs out.
    const paired = Math.min(sourceSeg.length, typedSeg.length);

    for (let i = 0; i < paired; i += 1) {
      const sw = sourceSeg[i];
      const tw = typedSeg[i];

      // Separators are treated as half/full depending on category.
      commitSeparator(sw.separator, tw.separator);

      const { category } = classifyWordPair(sw.text, tw.text);
      const severity = severityFor(category, allErrorsAreFull);

      // update alignmentTree + parts for full word token
      alignmentTree.push({
        sourceText: sw.separator + sw.text,
        typedText: tw.separator + tw.text,
        category,
        severity,
      });

      if (category === "correct") {
        // correct
        characterStats.correctCharacters += characters(sw.text).length;
        referenceParts.push({ text: sw.separator + sw.text, severity: "correct", category: "correct" });
        referenceReviewParts.push({ text: sw.separator + sw.text, severity: "correct", category: "correct" });
        typedParts.push({ text: tw.separator + tw.text, severity: "correct", category: "correct" });
        typedReviewParts.push({ text: tw.separator + tw.text, severity: "correct", category: "correct" });
      } else {
        // error counts: for repetition/addition/omission we compute below by frequency in the whole run.
        // For now, map word-level full errors to substitution/spelling/incompleteWord/etc only.
        counts[category] += 1;

        // Character stats constrained inside word pair only.
        const cs = constrainedCharacterStats(sw.text, tw.text);
        characterStats.correctCharacters += cs.correctCharacters;
        characterStats.wrongCharacters += cs.wrongCharacters;
        characterStats.omittedCharacters += cs.omittedCharacters;
        characterStats.extraCharacters += cs.extraCharacters;

        // Word highlight: emit entire word token in both panels for full-word errors.
        referenceParts.push({ text: sw.separator + sw.text, severity, category });
        referenceReviewParts.push({ text: sw.separator + sw.text, severity, category });
        typedParts.push({ text: tw.separator + tw.text, severity, category });
        typedReviewParts.push({ text: tw.separator + tw.text, severity, category });
      }

      if (category !== "correct") wordStats.wrongWords += 1;
    }

    // Remaining words: omissions/additions.
    for (let i = paired; i < sourceSeg.length; i += 1) {
      const sw = sourceSeg[i];
      wordStats.omittedWords += 1;
      counts.omission += 1;
      alignmentTree.push({ sourceText: sw.separator + sw.text, typedText: "", category: "omission", severity: "full" });

      // Reference shows word; typed review shows missing marker only.
      referenceParts.push({ text: sw.separator + sw.text, severity: "full", category: "omission" });
      referenceReviewParts.push({ text: sw.separator + sw.text, severity: "full", category: "omission" });
      typedReviewParts.push({ text: missingMarker("omission", sw.separator + sw.text), severity: "full", category: "omission", missing: true });

      const cs = constrainedCharacterStats(sw.text, "");
      characterStats.correctCharacters += cs.correctCharacters;
      characterStats.wrongCharacters += cs.wrongCharacters;
      characterStats.omittedCharacters += cs.omittedCharacters;
      characterStats.extraCharacters += cs.extraCharacters;
    }

    for (let i = paired; i < typedSeg.length; i += 1) {
      const tw = typedSeg[i];
      wordStats.extraWords += 1;
      counts.addition += 1;
      alignmentTree.push({ sourceText: "", typedText: tw.separator + tw.text, category: "addition", severity: "full" });

      typedParts.push({ text: tw.separator + tw.text, severity: "full", category: "addition" });
      typedReviewParts.push({ text: tw.separator + tw.text, severity: "full", category: "addition" });
      referenceReviewParts.push({ text: missingMarker("addition", tw.separator + tw.text), severity: "full", category: "addition", missing: true });

      const cs = constrainedCharacterStats("", tw.text);
      characterStats.correctCharacters += cs.correctCharacters;
      characterStats.wrongCharacters += cs.wrongCharacters;
      characterStats.omittedCharacters += cs.omittedCharacters;
      characterStats.extraCharacters += cs.extraCharacters;
    }
  };

  for (const anchor of anchors) {
    const sBetween = source.words.slice(sCursor, anchor.sourceIndex);
    const tBetween = typed.words.slice(tCursor, anchor.typedIndex);
    handleWordPairOrGaps(sBetween, tBetween);

    // Commit the anchored word pair as correct by canonical identity.
    const sw = source.words[anchor.sourceIndex];
    const tw = typed.words[anchor.typedIndex];

    // Separators must be handled.
    commitSeparator(sw.separator, tw.separator);

    // Determine exact category within the word.
    const classified = classifyWordPair(sw.text, tw.text);
    const category = classified.category;
    const severity = severityFor(category, allErrorsAreFull);

    alignmentTree.push({
      sourceText: sw.separator + sw.text,
      typedText: tw.separator + tw.text,
      category,
      severity,
    });

    if (category === "correct") {
      const cs = constrainedCharacterStats(sw.text, tw.text);
      characterStats.correctCharacters += cs.correctCharacters;
      characterStats.wrongCharacters += cs.wrongCharacters;
      characterStats.omittedCharacters += cs.omittedCharacters;
      characterStats.extraCharacters += cs.extraCharacters;
      referenceParts.push({ text: sw.separator + sw.text, severity: "correct", category: "correct" });
      referenceReviewParts.push({ text: sw.separator + sw.text, severity: "correct", category: "correct" });
      typedParts.push({ text: tw.separator + tw.text, severity: "correct", category: "correct" });
      typedReviewParts.push({ text: tw.separator + tw.text, severity: "correct", category: "correct" });
    } else {
      counts[category] += 1;
      const cs = constrainedCharacterStats(sw.text, tw.text);
      characterStats.correctCharacters += cs.correctCharacters;
      characterStats.wrongCharacters += cs.wrongCharacters;
      characterStats.omittedCharacters += cs.omittedCharacters;
      characterStats.extraCharacters += cs.extraCharacters;

      // Whole word highlight for word-level errors.
      referenceParts.push({ text: sw.separator + sw.text, severity, category });
      referenceReviewParts.push({ text: sw.separator + sw.text, severity, category });
      typedParts.push({ text: tw.separator + tw.text, severity, category });
      typedReviewParts.push({ text: tw.separator + tw.text, severity, category });
    }

    sCursor = anchor.sourceIndex + 1;
    tCursor = anchor.typedIndex + 1;
  }

  // Tail
  handleWordPairOrGaps(source.words.slice(sCursor), typed.words.slice(tCursor));
  // Trailing separators are handled as a separator commit vs empty.
  commitSeparator(source.trailing, typed.trailing);

  // Derived totals.
  const halfErrors = allErrorsAreFull
    ? 0
    : [...HALF_CATEGORIES].reduce((sum, category) => sum + counts[category], 0);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const referenceCharacters = characters(
    String(sourceValue ?? "")
      .normalize("NFC")
      .replace(/\r\n?/g, "\n"),
  ).length;

  const typedCharacters = characters(
    String(typedValue ?? "")
      .normalize("NFC")
      .replace(/\r\n?/g, "\n"),
  ).length;

  return {
    alignmentTree,
    counts,
    fullErrors: total - halfErrors,
    halfErrors,
    weightedErrors: total - halfErrors * 0.5,
    referenceCharacters,
    typedCharacters,
    ...characterStats,
    totalErrors:
      characterStats.wrongCharacters +
      characterStats.omittedCharacters +
      characterStats.extraCharacters,
    referenceWords: source.words.length,
    typedWords: typed.words.length,
    ...wordStats,
    totalWordErrors: wordStats.wrongWords + wordStats.omittedWords + wordStats.extraWords,
    referenceParts,
    typedParts,
    referenceReviewParts,
    typedReviewParts,
  };
}

// Backwards compatible API expected by server/src/utils/scoring.js
// (scoring.js calls compareTexts via these exports in other files).
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

