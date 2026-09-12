import * as vscode from "vscode";
import {
  isAgentContextVisible,
  parseAgentContext,
  type AgentContextAnnotation,
  type AgentContextVisibility
} from "@agent-context/core";
import {
  indentationAdjustment,
  usesHashCommentSyntax,
  visualIndentationAfter
} from "./presentation";

export function activate(context: vscode.ExtensionContext): void {
  const header = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    borderColor: new vscode.ThemeColor("editorIndentGuide.background"),
    borderStyle: "solid",
    borderWidth: "1px 0 0 0",
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
  });
  const hiddenMarkerText = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor("editorGhostText.foreground"),
    textDecoration: "none; font-size: calc(1em - 2px);",
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
  });
  const hiddenCommentPrefix = vscode.window.createTextEditorDecorationType({
    textDecoration: "none; font-size: 0;",
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
  });
  const cache = new Map<string, { version: number; annotations: AgentContextAnnotation[] }>();
  const initiallyFoldedDocuments = new Set<string>();

  function annotations(document: vscode.TextDocument): AgentContextAnnotation[] {
    const key = document.uri.toString();
    let entry = cache.get(key);
    if (!entry || entry.version !== document.version) {
      entry = { version: document.version, annotations: parseAgentContext(document.getText()) };
      cache.set(key, entry);
    }
    return entry.annotations;
  }

  function visibility(document: vscode.TextDocument): AgentContextVisibility {
    const config = vscode.workspace.getConfiguration("agentContext", document.uri);
    const mode = config.get<string>("visibility", "hidden");
    return mode === "custom"
      ? { mode, types: config.get<string[]>("visibleTypes", []) }
      : { mode: mode === "all" ? "all" : "hidden" };
  }

  function hiddenAnnotations(document: vscode.TextDocument): AgentContextAnnotation[] {
    const config = vscode.workspace.getConfiguration("agentContext", document.uri);
    if (!config.get("enabled", true)) return [];
    const currentVisibility = visibility(document);
    return annotations(document).filter(annotation => !isAgentContextVisible(annotation, currentVisibility));
  }

  function refresh(editor: vscode.TextEditor): void {
    const hidden = hiddenAnnotations(editor.document);
    const lines = editor.document.getText().split(/\r?\n/);
    const tabSize = typeof editor.options.tabSize === "number" ? editor.options.tabSize : 4;
    const headers: vscode.DecorationOptions[] = [];
    const markerTextRanges: vscode.Range[] = [];
    const commentPrefixRanges: vscode.Range[] = [];
    for (const annotation of hidden) {
      const start = annotation.startLine - 1;
      const startLine = editor.document.lineAt(start);
      const markerColumn = startLine.text.indexOf("@agent-context");
      const hashComment = usesHashCommentSyntax(startLine.text);
      const indentation = visualIndentationAfter(lines, annotation.endLine, tabSize);
      const adjustment = indentationAdjustment(startLine.text, indentation, tabSize);
      const leadingWhitespaceLength = startLine.text.match(/^\s*/)?.[0].length ?? 0;
      const hover = new vscode.MarkdownString();
      hover.supportHtml = true;
      hover.appendText(annotation.text || "No additional context.");
      hover.appendMarkdown(
        "\n\n<small>Use the folding control in the gutter to expand or collapse this context.</small>"
      );
      headers.push({
        range: new vscode.Range(start, 0, start, startLine.text.length),
        hoverMessage: hover,
        renderOptions: {
          before: {
            contentText: "\u200b",
            margin: `0 0 0 ${adjustment}ch`
          }
        }
      });
      if (markerColumn >= 0) {
        if (!hashComment) {
          commentPrefixRanges.push(
            new vscode.Range(start, leadingWhitespaceLength, start, markerColumn)
          );
        }
        markerTextRanges.push(new vscode.Range(start, markerColumn, start, startLine.text.length));
      }
    }
    editor.setDecorations(header, headers);
    editor.setDecorations(hiddenMarkerText, markerTextRanges);
    editor.setDecorations(hiddenCommentPrefix, commentPrefixRanges);
    foldInitiallyHiddenAnnotations(editor, hidden);
  }

  function foldInitiallyHiddenAnnotations(editor: vscode.TextEditor, hidden: AgentContextAnnotation[]): void {
    const key = editor.document.uri.toString();
    if (initiallyFoldedDocuments.has(key)) return;
    initiallyFoldedDocuments.add(key);
    const manual = hidden.filter(
      annotation =>
        annotation.endLine > annotation.startLine &&
        usesHashCommentSyntax(editor.document.lineAt(annotation.startLine - 1).text)
    );
    const nativeSelectionLines = hidden
      .filter(annotation => annotation.endLine > annotation.startLine)
      .filter(annotation => !manual.includes(annotation))
      .map(annotation => annotation.startLine - 1);
    if (manual.length === 0 && nativeSelectionLines.length === 0) return;

    setTimeout(async () => {
      if (vscode.window.activeTextEditor?.document !== editor.document) return;
      if (manual.length > 0) {
        const previousSelections = editor.selections;
        editor.selections = manual.map(annotation => {
          const start = annotation.startLine - 1;
          const end = annotation.endLine - 1;
          return new vscode.Selection(start, 0, end, editor.document.lineAt(end).text.length);
        });
        await vscode.commands.executeCommand("editor.createFoldingRangeFromSelection");
        editor.selections = previousSelections;
      }
      if (nativeSelectionLines.length > 0) {
        await vscode.commands.executeCommand("editor.fold", {
          selectionLines: nativeSelectionLines,
          levels: 1,
          direction: "down"
        });
      }
    }, 0);
  }

  const refreshAll = (): void => {
    vscode.window.visibleTextEditors.forEach(refresh);
  };

  context.subscriptions.push(
    header,
    hiddenMarkerText,
    hiddenCommentPrefix,
    vscode.window.onDidChangeVisibleTextEditors(refreshAll),
    vscode.window.onDidChangeActiveTextEditor(refreshAll),
    vscode.workspace.onDidChangeTextDocument(event => {
      vscode.window.visibleTextEditors
        .filter(editor => editor.document === event.document)
        .forEach(refresh);
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (!event.affectsConfiguration("agentContext")) return;
      initiallyFoldedDocuments.clear();
      refreshAll();
    }),
    vscode.workspace.onDidCloseTextDocument(document => {
      cache.delete(document.uri.toString());
      initiallyFoldedDocuments.delete(document.uri.toString());
    }),
    vscode.commands.registerCommand("agentContext.installFoldingControlStyle", async () => {
      const customCss = vscode.extensions.getExtension("be5invis.vscode-custom-css");
      if (!customCss) {
        void vscode.window.showErrorMessage(
          "Install the Custom CSS and JS Loader extension before installing the HumanEye folding style."
        );
        return;
      }

      const source = vscode.Uri.joinPath(
        context.extensionUri,
        "resources",
        "vscode-agent-context.css"
      );
      const destination = vscode.Uri.joinPath(
        context.globalStorageUri,
        "vscode-agent-context.css"
      );
      await vscode.workspace.fs.createDirectory(context.globalStorageUri);
      await vscode.workspace.fs.writeFile(destination, await vscode.workspace.fs.readFile(source));

      const config = vscode.workspace.getConfiguration("vscode_custom_css");
      const imports = config.get<string[]>("imports", []);
      const stylesheetUrl = destination.toString();
      const updatedImports = [
        ...imports.filter(value => !value.includes("vscode-agent-context.css")),
        stylesheetUrl
      ];
      await config.update("imports", updatedImports, vscode.ConfigurationTarget.Global);

      await customCss.activate();
      await vscode.commands.executeCommand("extension.updateCustomCSS");
    }),
    { dispose: () => cache.clear() }
  );
  refreshAll();
}
