export type AgentContextType =
  | "invariant"
  | "reason"
  | "warning"
  | "generated"
  | string;

export interface AgentContextAnnotation {
  type: AgentContextType;
  text: string;
  line: number;
  raw: string;
}
