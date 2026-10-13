# HumanEye agent instructions

HumanEye displays `@agent-context` comments written by coding agents. The plugin does not generate these comments or change agent configuration. Add the following template to `AGENTS.md` in your project root, creating that file if needed. For a user-wide Codex instruction, use `~/.codex/AGENTS.md`.

If your project already has a `CLAUDE.md` that your agents use, add the same template to that existing file too. You do not need to create a new `CLAUDE.md` for HumanEye. If you also use the VS Code extension, its **HumanEye: Install Agent Instructions** command can add the template for you.

````markdown
<!-- human-eye:agent-context:start -->
## Source Code Comments

Classify every potential comment as:

1. **No comment (default)** — information is obvious from the code or has no lasting value.
2. **Normal comment** — helps humans understand or safely review the code.
3. **`@agent-context <reason>`** — helps future agents and maintainers modify the code correctly, but would add noise to normal reading.

Never narrate obvious code or restate names, types, signatures, conditions, or control flow.

### Normal comments

Keep normal comments concise. Use them for non-obvious domain meaning, surprising behavior, local assumptions, or information humans should see during normal reading and review.

### Agent context

Use `@agent-context` for durable maintenance context that is not readily visible from the code:

- `invariant` — constraints that must remain true;
- `history` — bugs, incidents, or historical reasons for the implementation;
- `compatibility` — external, legacy, or migration constraints;
- `design` — non-obvious design decisions or rejected alternatives;
- `dependency` — important relationships with non-local code or systems.

Put the annotation marker at the start of a standalone comment in the language's native syntax:

```java
/* @agent-context invariant
 * Imported orders are normalized upstream. Do not normalize again here.
 */
```

```python
# @agent-context invariant
# Imported orders are normalized upstream. Do not normalize again here.
```

Do not use `@agent-context` to hide unnecessary comments. If it has no lasting maintenance value, omit it.

Use the narrowest appropriate scope: local understanding → normal comment; local maintenance knowledge → `@agent-context`; module or repository instructions → agent instruction files; major architectural decisions → ADRs or other documentation.
<!-- human-eye:agent-context:end -->
````
