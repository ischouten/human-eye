import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAgentContext } from '../dist/index.js';

const fixtures = JSON.parse(readFileSync(new URL('../../../tests/fixtures/annotations.json', import.meta.url), 'utf8'));
test('shared editor annotation fixtures', () => {
  for (const fixture of fixtures) assert.deepEqual(parseAgentContext(fixture.source), fixture.annotations);
});
