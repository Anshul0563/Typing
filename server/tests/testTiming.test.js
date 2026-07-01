import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateElapsedSeconds } from '../src/utils/testTiming.js';
import { signTestToken, verifyTestToken } from '../src/utils/jwt.js';

test('server timing never becomes negative or exceeds exam duration', () => {
  assert.equal(calculateElapsedSeconds(10_000, 9_000, 600), 0.01);
  assert.equal(calculateElapsedSeconds(10_000, 70_000, 600), 60);
  assert.equal(calculateElapsedSeconds(10_000, 900_000, 600), 600);
});

test('signed typing session preserves authoritative identity and deadlines', () => {
  const token = signTestToken({ userId: 'user1', examId: 'exam1', paragraphId: 'paragraph1', startedAt: 1000, endsAt: 601000, durationSeconds: 600 });
  const session = verifyTestToken(token);
  assert.equal(session.type, 'typing-test');
  assert.equal(session.sub, 'user1');
  assert.equal(session.examId, 'exam1');
  assert.equal(session.paragraphId, 'paragraph1');
  assert.equal(session.startedAt, 1000);
  assert.equal(session.endsAt, 601000);
  assert.ok(session.jti);
});
