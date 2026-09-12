const assert = require("node:assert/strict");
const test = require("node:test");
const {
  indentationAdjustment,
  leadingVisualIndentation,
  usesHashCommentSyntax,
  visualIndentationAfter
} = require("../dist/presentation.js");

test("uses the indentation of the code following an annotation", () => {
  assert.equal(visualIndentationAfter(["/* context", " */", "    const value = 1;"], 2, 4), 4);
});

test("skips blank lines before the assisted code", () => {
  assert.equal(visualIndentationAfter(["/* context", " */", "", "      return value;"], 2, 4), 6);
});

test("expands tabs using the editor tab size", () => {
  assert.equal(visualIndentationAfter(["/* context", " */", "\t  call();"], 2, 4), 6);
  assert.equal(visualIndentationAfter(["/* context", " */", " \tcall();"], 2, 4), 4);
});

test("uses zero indentation when no code follows", () => {
  assert.equal(visualIndentationAfter(["/* context", " */", ""], 2, 4), 0);
});

test("measures the marker's source indentation", () => {
  assert.equal(leadingVisualIndentation("    /* @agent-context design", 4), 4);
  assert.equal(leadingVisualIndentation("\t  /* @agent-context design", 4), 6);
});

test("adjusts from source indentation to assisted-code indentation", () => {
  assert.equal(indentationAdjustment("/* @agent-context design", 4, 4), 4);
  assert.equal(indentationAdjustment("    /* @agent-context design", 8, 4), 4);
  assert.equal(indentationAdjustment("        /* @agent-context design", 4, 4), -4);
});

test("distinguishes hash comments that need manual folding", () => {
  assert.equal(usesHashCommentSyntax("    # @agent-context design"), true);
  assert.equal(usesHashCommentSyntax("    /* @agent-context design"), false);
  assert.equal(usesHashCommentSyntax("    // @agent-context design"), false);
});
