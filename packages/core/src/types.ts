export const AGENT_CONTEXT_TYPES = ["invariant", "history", "compatibility", "design", "dependency"] as const;
export type AgentContextType = (typeof AGENT_CONTEXT_TYPES)[number] | (string & {});
export type AgentContextVisibility = { mode: "hidden" } | { mode: "all" } | { mode: "custom"; types: string[] };
export interface AgentContextAnnotation {
  type: AgentContextType;
  text: string;
  startLine: number;
  endLine: number;
}
