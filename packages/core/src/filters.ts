import type { AgentContextAnnotation, AgentContextVisibility } from "./types.js";

export function isAgentContextVisible(annotation: AgentContextAnnotation, visibility: AgentContextVisibility): boolean {
  return visibility.mode === "all" || (visibility.mode === "custom" && visibility.types.includes(annotation.type));
}

export function agentContextTypes(annotations: Iterable<AgentContextAnnotation>): string[] {
  return [...new Set([...annotations].map(annotation => annotation.type))].sort();
}
