import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDurationSeconds, resolveExamMode } from '../src/utils/examMode.js';

test('exam category determines actual exam mode without relying on its name', () => {
  assert.equal(resolveExamMode({ category: 'SSC', name: 'Future SSC Exam' }, 'NTA'), 'TCS');
  assert.equal(resolveExamMode({ category: 'DSSSB', name: 'Any exam' }, 'TCS'), 'NTA');
  assert.equal(resolveExamMode({ category: 'State Exams', name: 'Bihar SSC Stenographer' }, 'TCS'), 'NTA');
});

test('only Practice category accepts a requested mode', () => {
  const practice = { category: 'Practice', durationMinutes: 5 };
  assert.equal(resolveExamMode(practice, 'TCS'), 'TCS');
  assert.equal(resolveExamMode(practice, 'NTA'), 'NTA');
  assert.equal(resolveExamMode(practice, 'Custom'), 'Custom');
  assert.equal(resolveExamMode(practice), 'Custom');
});

test('custom duration is isolated to Practice category', () => {
  assert.equal(resolveDurationSeconds({ category: 'Practice', durationMinutes: 5 }, 12), 720);
  assert.equal(resolveDurationSeconds({ category: 'SSC', durationMinutes: 15 }, 1), 900);
  assert.equal(resolveDurationSeconds({ category: 'DSSSB', durationMinutes: 10 }, 120), 600);
});
