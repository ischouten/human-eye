export const instructionTemplateStart = "<!-- human-eye:agent-context:start -->";
export const instructionTemplateEnd = "<!-- human-eye:agent-context:end -->";

export const agentContextInstructionTemplate = `${instructionTemplateStart}
## Source Code Comments

Classify every potential comment as:

1. **No comment (default)** — information is obvious from the code or has no lasting value.
2. **Normal comment** — helps humans understand or safely review the code.
3. **\`@agent-context <reason>\`** — helps future agents and maintainers modify the code correctly, but would add noise to normal reading.

Never narrate obvious code or restate names, types, signatures, conditions, or control flow.

### Normal comments

Keep normal comments concise. Use them for non-obvious domain meaning, surprising behavior, local assumptions, or information humans should see during normal reading and review.

### Agent context

Use \`@agent-context\` for durable maintenance context that is not readily visible from the code:

- \`invariant\` — constraints that must remain true;
- \`history\` — bugs, incidents, or historical reasons for the implementation;
- \`compatibility\` — external, legacy, or migration constraints;
- \`design\` — non-obvious design decisions or rejected alternatives;
- \`dependency\` — important relationships with non-local code or systems.

Put the annotation marker at the start of a standalone comment in the language's native syntax:

\`\`\`java
/* @agent-context invariant
 * Imported orders are normalized upstream. Do not normalize again here.
 */
\`\`\`

\`\`\`python
# @agent-context invariant
# Imported orders are normalized upstream. Do not normalize again here.
\`\`\`

Do not use \`@agent-context\` to hide unnecessary comments. If it has no lasting maintenance value, omit it.

Use the narrowest appropriate scope: local understanding → normal comment; local maintenance knowledge → \`@agent-context\`; module or repository instructions → agent instruction files; major architectural decisions → ADRs or other documentation.
${instructionTemplateEnd}`;

export function containsAgentContextInstructions(content: string): boolean {
  return content.includes(instructionTemplateStart) || (/^## Source Code Comments\s*$/m.test(content) && content.includes("@agent-context"));
}

export function injectAgentContextInstructions(content: string): { content: string; changed: boolean } {
  if (containsAgentContextInstructions(content)) return { content, changed: false };
  if (content.length === 0) return { content: `${agentContextInstructionTemplate}\n`, changed: true };
  const separator = content.endsWith("\n\n") ? "" : content.endsWith("\n") ? "\n" : "\n\n";
  return { content: `${content}${separator}${agentContextInstructionTemplate}\n`, changed: true };
}
