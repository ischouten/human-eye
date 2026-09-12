const assert = require("node:assert/strict");
const test = require("node:test");
const {
  agentContextInstructionTemplate,
  containsAgentContextInstructions,
  injectAgentContextInstructions
} = require("../dist/instructions.js");

test("creates a complete instruction file", () => {
  const result = injectAgentContextInstructions("");
  assert.equal(result.changed, true);
  assert.equal(result.content, `${agentContextInstructionTemplate}\n`);
});

test("appends instructions without replacing existing content", () => {
  const result = injectAgentContextInstructions("# Existing instructions\n\nKeep this.\n");
  assert.equal(result.changed, true);
  assert.match(result.content, /^# Existing instructions\n\nKeep this\.\n\n<!-- human-eye:agent-context:start -->/);
});

test("does not inject the marked template twice", () => {
  const existing = `${agentContextInstructionTemplate}\n`;
  assert.deepEqual(injectAgentContextInstructions(existing), { content: existing, changed: false });
});

test("recognizes an equivalent previously copied section", () => {
  const existing = "## Source Code Comments\n\nUse `@agent-context` for durable context.\n";
  assert.equal(containsAgentContextInstructions(existing), true);
  assert.equal(injectAgentContextInstructions(existing).changed, false);
});
