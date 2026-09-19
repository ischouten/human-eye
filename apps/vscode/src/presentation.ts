const MARKER_LINE = /^\s*@agent-context(?:[ \t]+[a-z][\w-]*)?\s*$/i;

export function visualIndentationAfter(
  lines: readonly string[],
  annotationEndLine: number,
  tabSize: number
): number {
  let index = annotationEndLine;
  while (index < lines.length && lines[index].trim().length === 0) index += 1;
  if (index >= lines.length) return 0;

  let column = 0;
  for (const character of lines[index].match(/^\s*/)?.[0] ?? "") {
    column = character === "\t" ? column + tabSize - (column % tabSize) : column + 1;
  }
  return column;
}

export function leadingVisualIndentation(line: string, tabSize: number): number {
  let column = 0;
  for (const character of line.match(/^\s*/)?.[0] ?? "") {
    column = character === "\t" ? column + tabSize - (column % tabSize) : column + 1;
  }
  return column;
}

export function indentationAdjustment(
  markerLine: string,
  targetIndentation: number,
  tabSize: number
): number {
  return targetIndentation - leadingVisualIndentation(markerLine, tabSize);
}

export function usesHashCommentSyntax(markerLine: string): boolean {
  return markerLine.trimStart().startsWith("#");
}

export function needsManualFolding(markerLine: string): boolean {
  return usesHashCommentSyntax(markerLine);
}

export function isEmbeddedDocstringMarker(markerLine: string): boolean {
  return MARKER_LINE.test(markerLine);
}

export function isEditorInTextDiff(
  uri: string,
  viewColumn: number | undefined,
  diffs: readonly { original: string; modified: string; viewColumn?: number; active?: boolean }[]
): boolean {
  return diffs.some(
    diff =>
      diff.original === uri ||
      diff.modified === uri ||
      (viewColumn !== undefined && diff.active === true && diff.viewColumn === viewColumn)
  );
}

export function visibilityForSelectedTypes(
  availableTypes: readonly string[],
  selectedTypes: readonly string[]
): { mode: "hidden" | "all" | "custom"; types?: string[] } {
  const available = [...new Set(availableTypes.map(type => type.toLowerCase()))].sort();
  const selected = [...new Set(selectedTypes.map(type => type.toLowerCase()))]
    .filter(type => available.includes(type))
    .sort();
  if (selected.length === 0) return { mode: "hidden" };
  if (selected.length === available.length) return { mode: "all" };
  return { mode: "custom", types: selected };
}
