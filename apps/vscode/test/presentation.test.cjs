const assert = require("node:assert/strict");
const test = require("node:test");
const {
  indentationAdjustment,
  isEmbeddedDocstringMarker,
  isEditorInTextDiff,
  needsManualFolding,
  leadingVisualIndentation,
  usesHashCommentSyntax,
  visibilityForSelectedTypes,
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

test("distinguishes manual hash folding from embedded docstring markers", () => {
  assert.equal(needsManualFolding("    # @agent-context design"), true);
  assert.equal(needsManualFolding("    @agent-context history"), false);
  assert.equal(needsManualFolding("    /* @agent-context design"), false);
  assert.equal(isEmbeddedDocstringMarker("    @agent-context history"), true);
  assert.equal(isEmbeddedDocstringMarker("    # @agent-context history"), false);
});

test("recognizes both sides of a text diff", () => {
  const diffs = [
    { original: "review:/base/example.py", modified: "file:/workspace/example.py", viewColumn: 2, active: true },
    { original: "git:/base/other.ts", modified: "file:/workspace/other.ts", viewColumn: 3, active: false }
  ];
  assert.equal(isEditorInTextDiff("review:/base/example.py", 2, diffs), true);
  assert.equal(isEditorInTextDiff("file:/workspace/example.py", 2, diffs), true);
  assert.equal(isEditorInTextDiff("file:/workspace/transient.py", 2, diffs), true);
  assert.equal(isEditorInTextDiff("file:/workspace/unrelated.py", 3, diffs), false);
});

test("maps selected annotation types to visibility settings", () => {
  assert.deepEqual(visibilityForSelectedTypes(["history", "design"], []), { mode: "hidden" });
  assert.deepEqual(visibilityForSelectedTypes(["history", "design"], ["design", "history"]), { mode: "all" });
  assert.deepEqual(visibilityForSelectedTypes(["history", "design"], ["DESIGN", "missing"]), {
    mode: "custom",
    types: ["design"]
  });
});
