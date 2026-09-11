import type { AgentContextAnnotation } from "./types.js";

const AGENT_CONTEXT_PATTERN = /@agent-context(?:\s+([\w-]+))?(?:\s*:\s*|\s+)?(.*)$/i;

export function parseAgentContext(source: string): AgentContextAnnotation[] {
  return source
    .split(/\r?\n/)
    .map((raw, index) => {
      const match = raw.match(AGENT_CONTEXT_PATTERN);
      if (!match) return null;

      return {
        type: match[1] ?? "context",
        text: match[2]?.trim() ?? "",
        line: index + 1,
        raw
      } satisfies AgentContextAnnotation;
    })
    .filter((annotation): annotation is AgentContextAnnotation => annotation !== null);
}
