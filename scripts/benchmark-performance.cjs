const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const { isAgentContextVisible, parseAgentContext } = require("../packages/core/dist/index.js");

const sourceLineCount = 100_000;
const annotationInterval = 50;
const expectedAnnotations = sourceLineCount / annotationInterval;
const lines = [];

for (let index = 0; index < sourceLineCount; index += 1) {
  if (index % annotationInterval === 0) {
    lines.push(
      "  /* @agent-context invariant",
      `   * Generated performance annotation ${index}.`,
      "   */"
    );
  }
  lines.push(`  const value${index} = ${index};`);
}

const source = lines.join("\n");
for (let index = 0; index < 3; index += 1) parseAgentContext(source);

const parseTimes = [];
let annotations = [];
for (let index = 0; index < 15; index += 1) {
  const started = performance.now();
  annotations = parseAgentContext(source);
  parseTimes.push(performance.now() - started);
}

const filterTimes = [];
for (let index = 0; index < 100; index += 1) {
  const started = performance.now();
  annotations.filter(annotation => isAgentContextVisible(annotation, { mode: "custom", types: ["invariant"] }));
  filterTimes.push(performance.now() - started);
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

const result = {
  sourceBytes: Buffer.byteLength(source),
  sourceLines: lines.length,
  annotations: annotations.length,
  parseMedianMs: Number(percentile(parseTimes, 0.5).toFixed(2)),
  parseP95Ms: Number(percentile(parseTimes, 0.95).toFixed(2)),
  filterMedianMs: Number(percentile(filterTimes, 0.5).toFixed(3)),
  limits: {
    parseMedianMs: 250,
    filterMedianMs: 50
  }
};

assert.equal(annotations.length, expectedAnnotations);
assert.ok(result.parseMedianMs < result.limits.parseMedianMs, `Parser median ${result.parseMedianMs}ms exceeded ${result.limits.parseMedianMs}ms`);
assert.ok(result.filterMedianMs < result.limits.filterMedianMs, `Filter median ${result.filterMedianMs}ms exceeded ${result.limits.filterMedianMs}ms`);
console.log(JSON.stringify(result, null, 2));
