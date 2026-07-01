export function calculateElapsedSeconds(startedAt, now, durationSeconds) {
  const elapsed = (Number(now) - Number(startedAt)) / 1000;
  return Math.min(Number(durationSeconds), Math.max(0.01, elapsed));
}
