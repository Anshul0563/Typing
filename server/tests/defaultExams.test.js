import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultExams } from '../src/data/defaultExams.js';

test('default catalogue contains only the approved exams', () => {
  const approvedNames = [
    'SSC Stenographer (English)',
    'SSC Stenographer (Hindi)',
    'SSC CGL DEST',
    'SSC CHSL DEST',
    'DSSSB JSA',
    'DSSSB LDC',
    'DSSSB Stenographer',
    'Delhi Police Head Constable (Ministerial)',
    'RRB NTPC',
    'BSF Head Constable (Ministerial)',
    'CRPF Head Constable (Ministerial)',
    'CISF Head Constable (Ministerial)',
    'ITBP Head Constable (Ministerial)',
    'SSB Head Constable (Ministerial)',
    'KVS LDC',
    'NVS LDC',
    'CSIR CASE',
    'AIIMS CRE',
    'Supreme Court JCA',
    'Delhi High Court JJA',
    'UPSSSC Stenographer',
    'UPSSSC Junior Assistant',
    'Rajasthan LDC',
    'Bihar SSC Stenographer',
    'Haryana CET Clerk',
    'English Typing Practice',
    'Hindi Typing Practice'
  ];

  assert.deepEqual(defaultExams.map(({ name }) => name), approvedNames);
  assert.equal(new Set(defaultExams.map(({ name }) => name)).size, approvedNames.length);
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
