import type { AgentContextAnnotation } from "./types.js";

// The marker occupies its own comment line. Inline prose is intentionally a
// normal human-facing comment, rather than hidden maintenance context.
const MARKER = /^\s*@agent-context(?:[ \t]+([a-z][\w-]*))?\s*$/i;

function clean(line: string): string {
  return line.replace(/^\s*(?:\/\*+|<!--|\/\/|#)\s?/, "").replace(/\s*(?:\*\/|-->)\s*$/, "").replace(/^\s*\*\s?/, "");
}

export function parseAgentContext(source: string): AgentContextAnnotation[] {
  const lines = source.split(/\r\n|\n|\r/);
  const annotations: AgentContextAnnotation[] = [];
  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trimStart();
    const closing = trimmed.startsWith("/*") ? "*/" : trimmed.startsWith("<!--") ? "-->" : undefined;
    const prefix = trimmed.startsWith("//") ? "//" : trimmed.startsWith("#") ? "#" : undefined;
    let end = index;
    if (closing) {
      while (end < lines.length && !lines[end].includes(closing)) end++;
      if (end === lines.length) break;
      // Never conceal executable text following a closing delimiter.
      if (lines[end].slice(lines[end].indexOf(closing) + closing.length).trim()) { index = end; continue; }
    } else if (prefix && MARKER.test(clean(lines[index]))) {
      while (end + 1 < lines.length && lines[end + 1].trimStart().startsWith(prefix) && !MARKER.test(clean(lines[end + 1]))) end++;
    } else continue;
    const textLines = lines.slice(index, end + 1).map(clean);
    const markerIndex = textLines.findIndex(line => MARKER.test(line));
    const marker = markerIndex === -1 ? undefined : textLines[markerIndex].match(MARKER);
    if (marker) {
      textLines[markerIndex] = "";
      annotations.push({ type: marker[1]?.toLowerCase() ?? "untyped", text: textLines.join("\n").trim(), startLine: index + 1, endLine: end + 1 });
    }
    index = end;
  }
  return annotations;
}
