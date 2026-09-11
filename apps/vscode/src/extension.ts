import * as vscode from "vscode";
import { parseAgentContext } from "@agent-context/core";

const decorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  after: {
    contentText: "",
    border: "0 0 1px 0",
    borderStyle: "solid"
  }
});

function refresh(editor: vscode.TextEditor | undefined): void {
  if (!editor) return;

  const annotations = parseAgentContext(editor.document.getText());
  const decorations = annotations.map(({ line, type, text }) => ({
    range: new vscode.Range(line - 1, 0, line - 1, 0),
    hoverMessage: new vscode.MarkdownString(`**@agent-context ${type}**\n\n${text}`)
  }));

  editor.setDecorations(decorationType, decorations);
}

export function activate(context: vscode.ExtensionContext): void {
  refresh(vscode.window.activeTextEditor);

  context.subscriptions.push(
    decorationType,
    vscode.window.onDidChangeActiveTextEditor(refresh),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (vscode.window.activeTextEditor?.document === event.document) {
        refresh(vscode.window.activeTextEditor);
      }
    })
  );
}

export function deactivate(): void {}
