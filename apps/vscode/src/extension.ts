import * as vscode from "vscode";
import * as os from "node:os";
import {
  isAgentContextVisible,
  parseAgentContext,
  type AgentContextAnnotation,
  type AgentContextVisibility
} from "@agent-context/core";
import {
  indentationAdjustment,
  isEmbeddedDocstringMarker,
  isEditorInTextDiff,
  needsManualFolding,
  usesHashCommentSyntax,
  visibilityForSelectedTypes,
  visualIndentationAfter
} from "./presentation";
import { injectAgentContextInstructions } from "./instructions";

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
  const dimmedDiffBody = vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor("editorGhostText.foreground"),
    opacity: "0.35",
    textDecoration:
      "none; color: var(--vscode-editorGhostText-foreground) !important; opacity: 0.35 !important;",
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
  });
  const cache = new Map<string, { version: number; annotations: AgentContextAnnotation[] }>();
  const initiallyFoldedDocuments = new Set<string>();
  let updatingFilter = false;
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  status.command = "agentContext.selectVisibleTypes";
  status.name = "HumanEye annotation filter";

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

  function isTextDiffEditor(editor: vscode.TextEditor): boolean {
    const diffs = vscode.window.tabGroups.all.flatMap(group =>
      group.tabs.flatMap(tab =>
        tab.input instanceof vscode.TabInputTextDiff
          ? [
              {
                original: tab.input.original.toString(),
                modified: tab.input.modified.toString(),
                viewColumn: group.viewColumn,
                active: tab.isActive
              }
            ]
          : []
      )
    );
    return isEditorInTextDiff(editor.document.uri.toString(), editor.viewColumn, diffs);
  }

  function refresh(editor: vscode.TextEditor): void {
    const hidden = hiddenAnnotations(editor.document);
    const textDiff = isTextDiffEditor(editor);
    const lines = editor.document.getText().split(/\r?\n/);
    const tabSize = typeof editor.options.tabSize === "number" ? editor.options.tabSize : 4;
    const headers: vscode.DecorationOptions[] = [];
    const markerTextRanges: vscode.Range[] = [];
    const commentPrefixRanges: vscode.Range[] = [];
    const dimmedBodyRanges: vscode.Range[] = [];
    for (const annotation of hidden) {
      const start = annotation.startLine - 1;
      const startLine = editor.document.lineAt(start);
      const markerColumn = startLine.text.indexOf("@agent-context");
      const hashComment = usesHashCommentSyntax(startLine.text);
      const embeddedDocstring = isEmbeddedDocstringMarker(startLine.text);
      const indentation = visualIndentationAfter(lines, annotation.endLine, tabSize);
      const adjustment = indentationAdjustment(startLine.text, indentation, tabSize);
      const leadingWhitespaceLength = startLine.text.match(/^\s*/)?.[0].length ?? 0;
      const hover = new vscode.MarkdownString();
      hover.supportHtml = true;
      hover.appendText(annotation.text || "No additional context.");
      hover.appendMarkdown(
        textDiff || embeddedDocstring
          ? "\n\n<small>Use the HumanEye status-bar filter to show or dim this context.</small>"
          : "\n\n<small>Use the folding control in the gutter to expand or collapse this context.</small>"
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
      if ((textDiff || embeddedDocstring) && annotation.endLine > annotation.startLine) {
        const end = annotation.endLine - 1;
        dimmedBodyRanges.push(
          new vscode.Range(start + 1, 0, end, editor.document.lineAt(end).text.length)
        );
      }
    }
    editor.setDecorations(header, headers);
    editor.setDecorations(hiddenMarkerText, markerTextRanges);
    editor.setDecorations(hiddenCommentPrefix, commentPrefixRanges);
    editor.setDecorations(dimmedDiffBody, dimmedBodyRanges);
    if (!textDiff) foldInitiallyHiddenAnnotations(editor, hidden);
  }

  function updateStatus(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !vscode.workspace.getConfiguration("agentContext", editor.document.uri).get("enabled", true)) {
      status.hide();
      return;
    }
    const documentAnnotations = annotations(editor.document);
    if (documentAnnotations.length === 0) {
      status.hide();
      return;
    }
    const current = visibility(editor.document);
    const label = current.mode === "custom" ? current.types.join(", ") || "hidden" : current.mode;
    status.text = `$(filter)$(sparkle-compact) ${label}`;
    status.tooltip = `HumanEye: filter ${documentAnnotations.length} @agent-context annotation${documentAnnotations.length === 1 ? "" : "s"}`;
    status.show();
  }

  async function reconcileAnnotationFolds(editor: vscode.TextEditor): Promise<void> {
    if (vscode.window.activeTextEditor !== editor) return;
    const documentAnnotations = annotations(editor.document).filter(
      annotation => annotation.endLine > annotation.startLine
    );
    if (documentAnnotations.length === 0) return;
    const selectionLines = documentAnnotations.map(annotation => annotation.startLine - 1);
    await vscode.commands.executeCommand("editor.unfold", { selectionLines, levels: 1 });
    initiallyFoldedDocuments.delete(editor.document.uri.toString());
    foldInitiallyHiddenAnnotations(editor, hiddenAnnotations(editor.document));
  }

  function foldInitiallyHiddenAnnotations(editor: vscode.TextEditor, hidden: AgentContextAnnotation[]): void {
    const key = editor.document.uri.toString();
    if (initiallyFoldedDocuments.has(key)) return;
    const manual = hidden.filter(
      annotation =>
        annotation.endLine > annotation.startLine &&
        needsManualFolding(editor.document.lineAt(annotation.startLine - 1).text)
    );
    const nativeSelectionLines = hidden
      .filter(annotation => annotation.endLine > annotation.startLine)
      .filter(annotation => !manual.includes(annotation))
      .filter(
        annotation =>
          !isEmbeddedDocstringMarker(editor.document.lineAt(annotation.startLine - 1).text)
      )
      .map(annotation => annotation.startLine - 1);
    if (manual.length === 0 && nativeSelectionLines.length === 0) return;

    setTimeout(async () => {
      if (vscode.window.activeTextEditor?.document !== editor.document) return;
      if (initiallyFoldedDocuments.has(key)) return;
      initiallyFoldedDocuments.add(key);
      if (manual.length > 0) {
        const previousSelections = editor.selections;
        editor.selections = manual.map(annotation => {
          const start = annotation.startLine - 1;
          const end = annotation.endLine - 1;
          return new vscode.Selection(
            start,
            0,
            end,
            editor.document.lineAt(end).text.length
          );
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
    updateStatus();
  };

  const refreshAfterTabChange = (): void => {
    setTimeout(refreshAll, 0);
  };

  context.subscriptions.push(
    header,
    hiddenMarkerText,
    hiddenCommentPrefix,
    dimmedDiffBody,
    status,
    vscode.window.onDidChangeVisibleTextEditors(refreshAll),
    vscode.window.onDidChangeActiveTextEditor(refreshAll),
    vscode.window.tabGroups.onDidChangeTabs(refreshAfterTabChange),
    vscode.window.tabGroups.onDidChangeTabGroups(refreshAfterTabChange),
    vscode.workspace.onDidChangeTextDocument(event => {
      vscode.window.visibleTextEditors
        .filter(editor => editor.document === event.document)
        .forEach(refresh);
      updateStatus();
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (!event.affectsConfiguration("agentContext")) return;
      if (updatingFilter) return;
      initiallyFoldedDocuments.clear();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        refreshAll();
        return;
      }
      void reconcileAnnotationFolds(editor).then(refreshAll);
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
    vscode.commands.registerCommand("agentContext.installAgentInstructions", async () => {
      const format = await vscode.window.showQuickPick(
        [
          {
            label: "Claude",
            description: "CLAUDE.md",
            filename: "CLAUDE.md",
            profileDirectory: ".claude"
          },
          {
            label: "Codex",
            description: "AGENTS.md",
            filename: "AGENTS.md",
            profileDirectory: ".codex"
          }
        ],
        {
          placeHolder: "Choose the coding agent",
          title: "Install HumanEye agent instructions · 1 of 2"
        }
      );
      if (!format) return;

      const scope = await vscode.window.showQuickPick(
        [
          {
            label: "Project",
            description: `Write ./${format.filename}`,
            profile: false
          },
          {
            label: "User profile",
            description: `Write ~/${format.profileDirectory}/${format.filename}`,
            profile: true
          }
        ],
        {
          placeHolder: "Choose where the instructions should apply",
          title: `Install HumanEye ${format.label} instructions · 2 of 2`
        }
      );
      if (!scope) return;

      let destination: vscode.Uri;
      if (scope.profile) {
        destination = vscode.Uri.joinPath(vscode.Uri.file(os.homedir()), format.profileDirectory, format.filename);
      } else {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
          void vscode.window.showErrorMessage("Open a project folder before installing project instructions.");
          return;
        }
        let folder = folders[0];
        if (folders.length > 1) {
          const selected = await vscode.window.showWorkspaceFolderPick({
            placeHolder: "Choose the project root for the instruction file"
          });
          if (!selected) return;
          folder = selected;
        }
        destination = vscode.Uri.joinPath(folder.uri, format.filename);
      }

      let existing = "";
      try {
        existing = new TextDecoder().decode(await vscode.workspace.fs.readFile(destination));
      } catch (error) {
        if (!(error instanceof vscode.FileSystemError && error.code === "FileNotFound")) throw error;
      }
      const result = injectAgentContextInstructions(existing);
      if (!result.changed) {
        void vscode.window.showInformationMessage(`HumanEye instructions already exist in ${destination.fsPath}.`);
        return;
      }
      await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(destination, ".."));
      await vscode.workspace.fs.writeFile(destination, new TextEncoder().encode(result.content));
      const action = await vscode.window.showInformationMessage(
        `Added HumanEye instructions to ${destination.fsPath}.`,
        "Open file"
      );
      if (action === "Open file") {
        await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(destination));
      }
    }),
    vscode.commands.registerCommand("agentContext.selectVisibleTypes", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const documentAnnotations = annotations(editor.document);
      const types = [...new Set(documentAnnotations.map(annotation => annotation.type))].sort();
      if (types.length === 0) return;
      const counts = new Map<string, number>();
      for (const annotation of documentAnnotations) {
        counts.set(annotation.type, (counts.get(annotation.type) ?? 0) + 1);
      }
      const current = visibility(editor.document);
      const visible = current.mode === "all" ? new Set(types) : new Set(current.mode === "custom" ? current.types : []);
      const items = types.map(type => ({
        label: type,
        description: `${counts.get(type)} annotation${counts.get(type) === 1 ? "" : "s"}`,
        picked: visible.has(type)
      }));
      const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: "Select annotation types to show; unselected types remain folded",
        title: "HumanEye annotation filter"
      });
      if (!selected) return;
      const next = visibilityForSelectedTypes(types, selected.map(item => item.label));
      const config = vscode.workspace.getConfiguration("agentContext", editor.document.uri);
      updatingFilter = true;
      try {
        if (next.mode === "custom") {
          await config.update("visibleTypes", next.types, vscode.ConfigurationTarget.Workspace);
        }
        await config.update("visibility", next.mode, vscode.ConfigurationTarget.Workspace);
      } finally {
        updatingFilter = false;
      }
      await reconcileAnnotationFolds(editor);
      refresh(editor);
      updateStatus();
    }),
    { dispose: () => cache.clear() }
  );
  refreshAll();
}
