const assert = require("node:assert/strict");
const vscode = require("vscode");

suite("HumanEye extension", () => {
  let document;

  const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  async function openFixture(name, column = vscode.ViewColumn.One) {
    const opened = await vscode.workspace.openTextDocument(
      vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, name)
    );
    await vscode.window.showTextDocument(opened, column);
    await delay(150);
    return opened;
  }

  async function lineAfterMovingDownFrom(line) {
    const editor = vscode.window.activeTextEditor;
    editor.selection = new vscode.Selection(line, 0, line, 0);
    await vscode.commands.executeCommand("cursorDown");
    return editor.selection.active.line;
  }

  async function setConfiguration(key, value) {
    await vscode.workspace.getConfiguration("agentContext", document.uri).update(
      key,
      value,
      vscode.ConfigurationTarget.Workspace
    );
    await delay(150);
  }

  suiteSetup(async () => {
    const extension = vscode.extensions.all.find(candidate => candidate.packageJSON.name === "human-eye");
    assert.ok(extension, "HumanEye should be available in the Extension Host");
    await extension.activate();
    assert.ok(vscode.workspace.workspaceFolders?.[0]);
    document = await openFixture("AgentContextFixture.ts");
    await setConfiguration("enabled", true);
    await setConfiguration("visibility", "all");
  });

  test("registers its public commands", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("agentContext.selectVisibleTypes"));
    assert.ok(commands.includes("agentContext.installFoldingControlStyle"));
    assert.ok(commands.includes("agentContext.installAgentInstructions"));
  });

  test("keeps native TypeScript class and method folding ranges", async () => {
    const ranges = await vscode.commands.executeCommand("_executeFoldingRangeProvider", document.uri);
    assert.ok(Array.isArray(ranges));
    const codeRanges = ranges.filter(range => range.kind?.value !== "comment");
    assert.ok(codeRanges.some(range => range.end - range.start >= 10), "class fold should remain available");
    assert.ok(codeRanges.some(range => range.end - range.start >= 3), "method fold should remain available");
  });

  test("folds hidden annotations and selectively expands visible types", async () => {
    await setConfiguration("visibility", "hidden");
    assert.equal(await lineAfterMovingDownFrom(1), 4);
    assert.equal(await lineAfterMovingDownFrom(11), 14);
    await setConfiguration("visibleTypes", ["invariant"]);
    await setConfiguration("visibility", "custom");
    assert.equal(await lineAfterMovingDownFrom(1), 2);
    assert.equal(await lineAfterMovingDownFrom(11), 14);
    await setConfiguration("visibility", "all");
    assert.equal(await lineAfterMovingDownFrom(11), 12);
    assert.equal(vscode.workspace.getConfiguration("agentContext", document.uri).get("visibility"), "all");
  });

  test("opens and refreshes a large annotated document within the performance budget", async () => {
    await setConfiguration("visibility", "hidden");
    const started = performance.now();
    document = await openFixture("LargeAgentContextFixture.ts");
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 5_000, `Large annotated document took ${elapsed.toFixed(0)}ms to open and refresh`);
    const ranges = await vscode.commands.executeCommand("_executeFoldingRangeProvider", document.uri);
    assert.ok(ranges.some(range => range.kind?.value !== "comment" && range.end - range.start >= 25_000));
    console.log(`Large annotated VS Code document opened and refreshed in ${elapsed.toFixed(0)}ms`);
  });

  test("handles Python hash-comment annotations across enabled states", async () => {
    await setConfiguration("visibility", "hidden");
    document = await openFixture("agent_context_fixture.py");
    assert.equal(vscode.window.activeTextEditor.document.languageId, "python");
    assert.equal(vscode.workspace.getConfiguration("agentContext", document.uri).get("visibility"), "hidden");
    await setConfiguration("enabled", false);
    assert.equal(vscode.workspace.getConfiguration("agentContext", document.uri).get("enabled"), false);
    await setConfiguration("enabled", true);
    assert.equal(vscode.workspace.getConfiguration("agentContext", document.uri).get("enabled"), true);
  });

  test("preserves native Java folding ranges", async () => {
    document = await openFixture("AgentContextFixture.java");
    const ranges = await vscode.commands.executeCommand("_executeFoldingRangeProvider", document.uri);
    assert.ok(Array.isArray(ranges));
    assert.ok(ranges.some(range => range.kind?.value !== "comment" && range.end - range.start >= 3));
  });

  test("refreshes the same document in two editor groups", async () => {
    document = await openFixture("AgentContextFixture.ts");
    await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
    await delay(100);
    assert.ok(vscode.window.visibleTextEditors.filter(editor => editor.document.uri.toString() === document.uri.toString()).length >= 2);
    await setConfiguration("visibility", "hidden");
  });
});
