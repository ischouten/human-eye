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
test('comment-only blank lines stay inside line annotations while source blanks end them', () => {
  const joined = parse('# @agent-context history\n# Something happened.\n#\n# This remains agent context.');
  assert.deepEqual(joined, [{ type: 'history', text: 'Something happened.\n\nThis remains agent context.', startLine: 1, endLine: 4 }]);

  const split = parse('# @agent-context history\n# Something happened.\n\n# This remains a normal comment.');
  assert.deepEqual(split, [{ type: 'history', text: 'Something happened.', startLine: 1, endLine: 2 }]);
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
test('annotations embedded in Python docstrings exclude human-facing prose and delimiters', () => {
  const source = [
    '"""DLK-6026 regression scenario.',
    '',
    'This human-facing introduction remains visible.',
    '',
    '@agent-context history',
    'The failure was caused by re-deriving serviceOn.',
    'Keep this test after the production fix.',
    '"""',
    'def test_regression():',
    '    pass'
  ].join('\n');
  assert.deepEqual(parse(source), [
    {
      type: 'history',
      text: 'The failure was caused by re-deriving serviceOn.\nKeep this test after the production fix.',
      startLine: 5,
      endLine: 7
    }
  ]);
});
test('single-quoted Python docstrings are supported without matching ordinary strings', () => {
  assert.deepEqual(parse("'''\n@agent-context invariant\nKeep the wire name stable.\n'''"), [
    { type: 'invariant', text: 'Keep the wire name stable.', startLine: 2, endLine: 3 }
  ]);
  assert.deepEqual(parse('value = "@agent-context invariant"'), []);
});
test('filters preserve marker discovery while controlling content visibility', () => {
  const annotations = parse('// @agent-context invariant\n\n# @agent-context history');
  assert.deepEqual(agentContextTypes(annotations), ['history', 'invariant']);
  assert.equal(isAgentContextVisible(annotations[0], { mode: 'hidden' }), false);
  assert.equal(isAgentContextVisible(annotations[0], { mode: 'all' }), true);
  assert.equal(isAgentContextVisible(annotations[0], { mode: 'custom', types: ['history'] }), false);
  assert.equal(isAgentContextVisible(annotations[0], { mode: 'custom', types: ['invariant'] }), true);
});
