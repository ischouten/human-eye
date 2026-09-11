# Agent Context

Read `@agent-context` source annotations through subtle horizontal markers and hover text. Everything runs locally; no AI service, account, or network access is needed.

```ts
/* @agent-context invariant
 * IDs must remain stable across imports.
 */
const id = existingId;
```

Annotation text is concealed by default. Hover the horizontal marker to read it. Move the caret into the comment or select it to reveal the original text for editing. Concealment preserves line spacing and does not modify files; comments remain present in copying, search, and accessibility tools. This version does not collapse comment lines.

Settings:

- `agentContext.enabled`: enable or disable presentation (default `true`).
- `agentContext.visibility`: `hidden` (default), `all`, or `custom`.
- `agentContext.visibleTypes`: lowercase types to show in custom mode.

Supported standalone comment forms are `//`, `#`, `/* ... */`, and `<!-- ... -->`. Established types are `invariant`, `history`, `compatibility`, `design`, and `dependency`; custom types are accepted. Parsing is textual, so comment-shaped lines inside multiline strings may also match.

Install the `.vsix` through Extensions → Install from VSIX. This is a privately distributed MVP with the provisional extension identity `agent-context-local.agent-context`. Marketplace publication is not configured.
