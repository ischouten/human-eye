import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAgentContext as parse, isAgentContextVisible, agentContextTypes } from '../dist/index.js';

test('typed multiline blocks and exact one-based inclusive ranges', () => {
  assert.deepEqual(parse('const x = 1;\n/**\n * @agent-context invariant\n * Keep IDs stable.\n */'), [{ type: 'invariant', text: 'Keep IDs stable.', startLine: 2, endLine: 5 }]);
});
test('HTML, grouped line comments, hash comments and CRLF', () => {
  assert.deepEqual(parse('<!-- @agent-context compatibility -->\r\n// @agent-context history\r\n// Regression 42.\r\n# @agent-context dependency\r\n# Schema'), [
    { type: 'compatibility', text: '', startLine: 1, endLine: 1 },
    { type: 'history', text: 'Regression 42.', startLine: 2, endLine: 3 },
    { type: 'dependency', text: 'Schema', startLine: 4, endLine: 5 }
  ]);
});
test('unknown, untyped, case normalization and adjacent annotations', () => {
  assert.deepEqual(parse('// @agent-context PERFORMANCE\n// Fast\n// @agent-context\n// Details').map(a => [a.type, a.text]), [['performance', 'Fast'], ['untyped', 'Details']]);
});
test('ordinary code, marker-line prose, malformed markers and incomplete blocks are ignored', () => {
  for (const text of ['', 'const marker = "@agent-context invariant";', '// @agent-context invariant Keep IDs stable.', '// @agent-contextual invariant', '// @agent-context: warning', '/* @agent-context design\n * unfinished', '/* @agent-context invariant */ run();']) assert.deepEqual(parse(text), []);
});
test('ordinary blocks do not absorb following annotations', () => {
  assert.equal(parse('/* ordinary */\n// @agent-context design\n// Explanation')[0].startLine, 2);
});
test('filters preserve marker discovery while controlling content visibility', () => {
  const annotations = parse('// @agent-context invariant\n\n# @agent-context history');
  assert.deepEqual(agentContextTypes(annotations), ['history', 'invariant']);
  assert.equal(isAgentContextVisible(annotations[0], { mode: 'hidden' }), false);
  assert.equal(isAgentContextVisible(annotations[0], { mode: 'all' }), true);
  assert.equal(isAgentContextVisible(annotations[0], { mode: 'custom', types: ['history'] }), false);
  assert.equal(isAgentContextVisible(annotations[0], { mode: 'custom', types: ['invariant'] }), true);
});
