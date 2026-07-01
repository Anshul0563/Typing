# Typing Engine Audit

Audited 1 July 2026. The engine uses the server as the final authority; live highlighting is intentionally provisional and never used to generate a result.

## Result formulas

- Characters are normalized to Unicode NFC and segmented by Unicode code point. This handles English, Hindi and mixed text consistently without splitting surrogate-pair symbols.
- Gross WPM = `(typed characters / 5) / elapsed minutes`.
- Total errors = substitutions + omissions + insertions from the minimum Unicode edit alignment.
- Net WPM is exam-configured. In `standard-word` mode it is `max(0, Gross WPM - ((wrong + omitted + extra words) × penalty / minutes))`. In `character` mode it is `max(0, Gross WPM - (((character errors / 5) × penalty) / minutes))`. It is always capped at Gross WPM.
- Accuracy = `correct characters / (correct characters + total errors) × 100`.
- Typed words are non-empty whitespace-delimited tokens in the final text.
- Total keystrokes count accepted printable/Enter/Backspace physical key actions. Backspaces are also reported separately. Modifier shortcuts, cursor jumps, paste and drop are not accepted test input.

The five-character standard-word conversion follows SSC's published equivalence between WPM and key depressions. SSC's official script evaluation also distinguishes full word mistakes from half mistakes (spelling, spacing and capitalization). Those official full/half mistake categories require exam-specific evaluation and are not mislabeled here: this application reports deterministic character errors, WPM and edit accuracy. It should not present character accuracy as an official SSC pass/fail decision.

## Character classification

The final result uses adaptive, exact Levenshtein alignment. A replaced character is one incorrect character, a missing reference character is omitted, and an added input character is extra. Unlike positional comparison, a single insertion or deletion does not cascade into false errors for every later character. Whitespace, line breaks and tabs are significant.

Live feedback remains sequential: the current input position is compared with the same reference position, the active reference word is underlined, and text beyond the reference is visibly marked as extra. Final counts always come from the server alignment.

## Timing and submission

- Starting or restarting requests a signed test session from the API.
- The signed token binds learner, exam, paragraph, server start time and deadline.
- The browser countdown uses a monotonic deadline (`performance.now`) and resynchronizes every 200 ms and on visibility changes. It does not decrement an assumed interval.
- At zero, the active-input ref is disabled before React state updates and submission begins.
- The server derives elapsed time from the signed start time and clamps it to the configured exam duration.
- A unique signed session identifier makes result submission idempotent.
- Active text, deadline, session token and telemetry are recovered from session storage after refresh; elapsed time continues while the page is absent.

## Input behavior

- Backspace works at correct/incorrect characters, across spaces and words, repeatedly, and safely at position zero.
- Backspace is ignored after the deadline because input is locked synchronously.
- Enter creates a significant line break.
- Tab is accepted only when the next reference character is a tab; otherwise it is suppressed so focus cannot escape.
- Selection/cursor movement and destructive modifier shortcuts are suppressed because this is a sequential exam simulator.
- Paste, drop, spellcheck, autocorrect and autocomplete are disabled.
- Input is capped at 1,000 characters beyond the passage on both client and server.
- The exam workspace separates the read-only reference pane from the visible typing textarea. Backspace and current-word highlighting preferences persist locally and are locked into the active recoverable session. Highlighting is presentation-only and never enters the scoring payload.

## Verification coverage

Automated tests cover exact input, empty input, spaces-only input, leading/trailing/repeated spaces, substitutions, middle omissions, middle insertions, line breaks, tabs, NFC equivalence, Hindi, mixed language, formula invariants, signed-session identity, deadline clamping, asset/catalogue integrity and 100 deterministic randomized comparisons against an independent edit-distance implementation.

A full API workflow test additionally verifies registration, passage selection, signed start, exact submission, 100% accuracy, zero errors, idempotent replay and result retrieval. A 2,000-character near-exact alignment stabilizes around 3–4 ms after runtime warm-up on the development machine.
