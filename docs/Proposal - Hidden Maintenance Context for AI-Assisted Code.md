# Proposal: `@agent-context`

`@agent-context` is the annotation specification described by this proposal. HumanEye is the standalone extension product that presents these annotations in VS Code and, in a later phase, on GitHub.

## Problem

AI coding agents tend to generate substantially more comments than human developers.

Some of those comments are useful, but they often contain information aimed primarily at **future reasoning about or modification of the code**, rather than information a human needs while normally reading or reviewing it.

This creates code like:

```java
/*
 * This implementation deliberately doesn't normalize the order here.
 * Historically normalization happened...
 * ...
 */
return calculator.calculate(order);
```

The information may genuinely help a future coding agent, but it makes source files and PRs harder for humans to scan.

Moving this information to `AGENTS.md`, `CLAUDE.md`, or separate shadow Markdown files loses **locality**: the context can become detached from the code it describes.

The proposal is therefore to introduce **colocated agent/maintenance context which tooling can hide from the normal human reading surface**.

---

## Three types of comments

Agents should classify every potential comment as one of:

1. **No comment — default**
   - The information is obvious from the code or has no lasting value.

2. **Normal comment**
   - Information a human developer should see to understand or safely review the code.

3. **`@agent-context` annotation**
   - Information useful primarily when a future agent or maintainer modifies the code.
   - It remains physically colocated with the implementation but can be hidden by IDE/Git tooling.

For example:

```java
/* @agent-context invariant
 * Imported orders are normalized upstream. Do not normalize again here.
 */
return calculator.calculate(order);
```

A supporting IDE/Git client should normally render the annotation as effectively invisible, leaving only a **subtle horizontal line** at its location.

The source itself remains unchanged and agents continue receiving the full context.

`@agent-context` must **not** become a place to dump verbose or unnecessary AI comments. If the information has no lasting maintenance value, the correct choice remains no comment.

---

## Optional context type

Annotations can optionally specify a reason:

```text
@agent-context invariant
@agent-context history
@agent-context compatibility
@agent-context design
@agent-context dependency
```

Suggested semantics:

- **`invariant`** — something that must remain true.
- **`history`** — bugs, incidents, regressions, or historical reasons for the implementation.
- **`compatibility`** — legacy, migration, protocol, API, or external-system constraints.
- **`design`** — non-obvious design choices or rejected alternatives.
- **`dependency`** — important relationships with non-local code or systems.

Plain `@agent-context` remains valid when no type fits.

The type should be treated as optional metadata. Tooling should identify annotations from the `@agent-context` prefix rather than requiring knowledge of every possible type, allowing the convention to evolve.

---

## Recommended AGENTS.md / CLAUDE.md instruction

```markdown
## Source Code Comments

Classify every potential comment as:

1. **No comment (default)** — information is obvious from the code or has no lasting value.
2. **Normal comment** — helps humans understand or safely review the code.
3. **`@agent-context <reason>`** — helps future agents/maintainers modify the code correctly, but would add noise to normal reading.

Never narrate obvious code or restate names, types, signatures, conditions, or control flow.

### Normal comments

Keep concise. Use for non-obvious domain meaning, surprising behavior, local assumptions, or information humans should see during normal reading/review.

### Agent context

Use for maintenance context not readily visible from the code, such as:

- `invariant` — constraints that must remain true;
- `history` — bugs/incidents or historical reasons for the implementation;
- `compatibility` — external, legacy, or migration constraints;
- `design` — non-obvious design decisions or rejected alternatives;
- `dependency` — important relationships with non-local code/systems.

Example:

    /* @agent-context invariant
     * Imported orders are normalized upstream. Do not normalize again here.
     */

Do not use `@agent-context` to hide unnecessary comments. If it has no lasting maintenance value, omit it.

Use the narrowest appropriate scope: local understanding → normal comment; local maintenance knowledge → `@agent-context`; module/repo instructions → `AGENTS.md`; major architectural decisions → ADR/docs.

Long normal comments are a warning sign: consider clearer code, `@agent-context`, or higher-level documentation instead.
```

The instruction is intentionally short because `AGENTS.md` / `CLAUDE.md` contents consume agent context and should not become unnecessarily large.

---

# ItsyGitsy implementation

## V1 goal

Recognize `@agent-context` comment blocks and remove them from the normal visual reading surface of file diffs.

Do not alter the actual source file.

The Git repository continues containing ordinary syntactically valid comments, so the convention requires no compiler, Git, language-server, or repository-format changes.

---

## Detection

At minimum recognize comment blocks containing:

```text
@agent-context
```

and:

```text
@agent-context <type>
```

For example:

```java
/* @agent-context history
 * This used to use X, but that caused issue #123.
 */
```

Detection should be tolerant rather than tied to Java-style comments so equivalent syntax works across languages:

```python
# @agent-context invariant
# IDs must remain stable across imports.
```

```html
<!-- @agent-context compatibility
Legacy clients require this attribute.
-->
```

The semantic marker is `@agent-context`, not the surrounding comment syntax.

---

# Presentation model

## Default state: invisible

By default, **all `@agent-context` annotations are hidden**.

The hidden annotation should not leave behind text such as:

```text
[agent context]
@agent-context invariant
🤖
```

or another explicit marker in the code.

Instead, its location should be represented only by a **subtle horizontal line** spanning part or all of the code area.

The goal is for the annotation to be visually ignorable during normal review while still providing a discoverable affordance.

For example:

```text
return previousResult;

────────────────────────────

return calculateNextResult();
```

The line represents hidden agent context but should not compete visually with the code itself.

---

## Hover behaviour

Hovering over the subtle line should display the hidden annotation in a popover.

For example:

```text
┌─────────────────────────────────────┐
│ invariant                           │
│                                     │
│ Imported orders are normalized      │
│ upstream. Do not normalize again.   │
└─────────────────────────────────────┘
```

The user should be able to inspect agent context without changing the layout of the diff.

The popover may show the context type, but the collapsed line itself should remain visually neutral.

---

# Agent-context filter

The file diff page should expose an `@agent-context` filter directly in the **top toolbar**, next to controls such as **Blame**.

This is an important part of the feature rather than an advanced preference hidden in settings.

Conceptually:

```text
File.java                     [Blame] [@agent-context ▾] [...]
```

The filter controls which classes of agent context are rendered inline.

Possible menu:

```text
@agent-context

○ Hidden
○ All

Types
☐ invariant
☐ history
☐ compatibility
☐ design
☐ dependency
☐ untyped
```

The exact interaction can evolve, but the user must be able to choose individual context types.

Examples:

```text
Show:
✓ invariant
✓ compatibility
  history
  design
  dependency
```

This would render `invariant` and `compatibility` annotations normally while leaving the others represented only by subtle lines.

---

# Visibility hierarchy

There should be three levels of configuration.

## 1. Application default

The default behaviour is:

> **All `@agent-context` annotations hidden.**

The application Settings menu should allow the user to override this default.

For example:

```text
Settings
  Diff
    Agent context visibility
      ○ Hide all
      ○ Show all
      ○ Custom...
```

A custom default may specify individual types.

This preference determines the initial state when opening file diffs.

---

## 2. File-level override

Every file diff has its own `@agent-context` filter in the toolbar.

Changing this filter affects **that file view** and overrides the application default.

For example, a user might normally hide everything but temporarily enable:

```text
✓ invariant
✓ compatibility
```

while reviewing a particular file.

This should be quick and require no trip to Settings.

---

## 3. Annotation-level inspection

Even when a type is hidden by the current filter, its subtle horizontal line remains hoverable.

Hovering reveals that individual annotation in a popover without changing the file-level visibility setting.

Therefore:

```text
Application default
        ↓
File-level filter
        ↓
Individual hover inspection
```

---

# Behaviour when a type is visible

When the user enables a context type, matching annotations should render inline in the diff rather than only as horizontal lines.

They should still be visually distinguishable from normal source comments.

For example:

```text
╭─ agent-context · invariant ─────────────────
│ Imported orders are normalized upstream.
│ Do not normalize them again here.
╰─────────────────────────────────────────────

return calculator.calculate(order);
```

The exact styling is an implementation decision, but visible agent context should be clearly presented as metadata/maintenance context rather than ordinary code.

---

# Diff handling

Consider a real Git diff:

```diff
+ /* @agent-context invariant
+  * Imported orders are already normalized upstream.
+  * Do not normalize them here.
+  */
+ return calculator.calculate(order);
```

With the default visibility setting, ItsyGitsy should visually reduce this to approximately:

```diff
  ─────────────────────────────
+ return calculator.calculate(order);
```

The hidden annotation must still remain part of the underlying Git diff.

ItsyGitsy is changing **presentation**, not Git semantics.

If the user enables `invariant`, the complete annotation becomes visible.

---

# Important distinction: hidden context vs hidden changes

Hiding `@agent-context` must never cause ItsyGitsy to misrepresent whether the file changed.

The Git diff, line counts, staged state, commit contents, and underlying patch remain unchanged.

The feature is equivalent to a rendering filter.

This matters especially when an annotation itself is added, modified, or deleted.

ItsyGitsy may eventually expose agent-context-specific change information elsewhere, but the visual filtering must not change Git behaviour.

---

# Possible later features

These are enabled by the format but are not necessary for V1.

## PR / commit summary

ItsyGitsy could report:

```text
12 code changes
4 agent-context changes

2 invariant
1 design
1 history
```

without displaying the annotations directly in the normal diff.

---

## Highlight modified invariants

Changes to certain context types may deserve additional attention.

For example:

> This commit modifies 2 `@agent-context invariant` annotations.

That is potentially more meaningful than merely knowing comments changed.

---

## AI integration

When ItsyGitsy invokes an agent, annotations can be explicitly provided as maintenance context rather than indistinguishable source comments.

Types could influence interpretation:

- `invariant` → strong constraint;
- `design` → understand before refactoring;
- `history` → background knowledge that may need revalidation;
- `compatibility` → verify before changing;
- `dependency` → inspect related components.

---

## Context-specific filtering

The same filter model could eventually apply outside file diffs:

```text
Repository view
Commit diff
Staged changes
Pull request review
File history
```

The global application default should remain consistent across these surfaces unless a particular view overrides it.

---

# Scope boundaries

`@agent-context` is **not intended to replace AGENTS.md, ADRs, documentation, or normal comments**.

Use:

```text
Obvious / temporary information
        ↓
     nothing

Human needs it while reading code
        ↓
 normal comment

Future modification needs local context
        ↓
 @agent-context

Module/repository agent instructions
        ↓
 AGENTS.md / CLAUDE.md

Significant architectural knowledge
        ↓
 ADR / documentation
```

The defining concept is:

> **`@agent-context` is machine-maintainer context colocated with source code but excluded by default from the normal human reading surface.**

For ItsyGitsy, the initial implementation model should therefore be:

```text
detect
  ↓
classify by type
  ↓
apply global/default visibility
  ↓
apply file-level filter
  ↓
hide as subtle line or render inline
  ↓
allow hover inspection
```

The critical UI principle is that **hidden agent context should not itself become visual clutter**. In the default experience, the code should look essentially like the annotation is not there at all.
