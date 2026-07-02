export const EXAM_MODES = Object.freeze({ TCS: 'TCS', NTA: 'NTA', CUSTOM: 'Custom' });

export function isPracticeExam(exam) {
  return exam?.category === 'Practice';
}

export function resolveExamMode(exam, requestedMode) {
  if (!exam) throw new TypeError('Exam is required');
  if (exam.category === 'SSC') return EXAM_MODES.TCS;
  if (!isPracticeExam(exam)) return EXAM_MODES.NTA;
  return Object.values(EXAM_MODES).includes(requestedMode) ? requestedMode : EXAM_MODES.CUSTOM;
}

export function resolveDurationSeconds(exam, requestedMinutes) {
  const configuredMinutes = Number(exam?.durationMinutes);
  if (!isPracticeExam(exam) || requestedMinutes == null) return configuredMinutes * 60;
  const minutes = Math.min(120, Math.max(1, Number(requestedMinutes) || configuredMinutes));
  return Math.round(minutes * 60);
}

export function resolveEvaluationMode(exam) {
  return /\bsteno(?:grapher)?\b/i.test(String(exam?.name || '')) ? 'ssc-stenographer' : 'practice';
}
