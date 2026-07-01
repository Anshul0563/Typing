import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultExams } from '../src/data/defaultExams.js';

test('default catalogue contains 36 unique, complete exams', () => {
  assert.equal(defaultExams.length, 36);
  assert.equal(new Set(defaultExams.map(({ name }) => name)).size, 36);
  for (const exam of defaultExams) {
    assert.ok(exam.name && exam.organization && exam.category && exam.language);
    assert.deepEqual(exam.scoringRule, { mode: 'standard-word', errorPenalty: 1 });
    assert.match(exam.logo, /^\/assets\/exams\/[a-z0-9-]+\.svg$/);
    assert.ok(exam.durationMinutes > 0);
  }
});

test('every catalogue logo exists in local project assets', async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  await Promise.all(defaultExams.map(({ logo }) => access(path.resolve(here, '../../client/public', logo.slice(1)))));
});
