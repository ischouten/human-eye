import * as vscode from "vscode";
import { parseAgentContext, isAgentContextVisible, type AgentContextAnnotation, type AgentContextVisibility } from "@agent-context/core";

export function activate(context: vscode.ExtensionContext): void {
  const concealed = vscode.window.createTextEditorDecorationType({ color: "transparent", rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed });
  const marker = vscode.window.createTextEditorDecorationType({
    before: { contentText: "────", color: new vscode.ThemeColor("editorLineNumber.foreground"), margin: "0 0.5em 0 0" },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
  });
  const cache = new Map<string, { version: number; annotations: AgentContextAnnotation[] }>();
  function annotations(document: vscode.TextDocument): AgentContextAnnotation[] {
    const key = document.uri.toString();
    let entry = cache.get(key);
    if (!entry || entry.version !== document.version) {
      entry = { version: document.version, annotations: parseAgentContext(document.getText()) };
      cache.set(key, entry);
    }
    return entry.annotations;
  }
  function refresh(editor: vscode.TextEditor): void {
    const config = vscode.workspace.getConfiguration("agentContext", editor.document.uri);
    const mode = config.get<string>("visibility", "hidden");
    const visibility: AgentContextVisibility = mode === "custom" ? { mode, types: config.get<string[]>("visibleTypes", []) } : { mode: mode === "all" ? "all" : "hidden" };
    const hidden: vscode.Range[] = [];
    const markers: vscode.DecorationOptions[] = [];
    if (config.get("enabled", true)) {
      for (const annotation of annotations(editor.document)) {
        const range = new vscode.Range(annotation.startLine - 1, 0, annotation.endLine - 1, editor.document.lineAt(annotation.endLine - 1).text.length);
        const hover = new vscode.MarkdownString();
        hover.appendText(`@agent-context ${annotation.type}`);
        hover.appendMarkdown("\n\n");
        hover.appendText(annotation.text || "No additional context.");
        markers.push({ range: new vscode.Range(range.start, range.start), hoverMessage: hover });
        const selected = editor.selections.some(selection => selection.start.line <= range.end.line && selection.end.line >= range.start.line);
        if (!selected && !isAgentContextVisible(annotation, visibility)) hidden.push(range);
      }
    }
    editor.setDecorations(concealed, hidden);
    editor.setDecorations(marker, markers);
  }
  const refreshAll = (): void => { vscode.window.visibleTextEditors.forEach(refresh); };
  context.subscriptions.push(
    concealed, marker,
    vscode.window.onDidChangeVisibleTextEditors(refreshAll),
    vscode.window.onDidChangeActiveTextEditor(refreshAll),
    vscode.window.onDidChangeTextEditorSelection(event => refresh(event.textEditor)),
    vscode.workspace.onDidChangeTextDocument(event => {
      vscode.window.visibleTextEditors.filter(editor => editor.document === event.document).forEach(refresh);
    }),
    vscode.workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration("agentContext")) refreshAll(); }),
    vscode.workspace.onDidCloseTextDocument(document => cache.delete(document.uri.toString())),
    { dispose: () => cache.clear() }
  );
  refreshAll();
}
