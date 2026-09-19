# `@agent-context` Annotation Specification

An annotation occupies a standalone comment: `//`, `#`, `/* ... */`, or `<!-- ... -->`. Leading whitespace is allowed. Block comments must be closed and cannot have code after the closing delimiter. Inline comments after executable code are not recognized.

The marker must occupy its own comment line: use `@agent-context TYPE`, then put agent-maintenance prose on subsequent comment lines. This deliberately preserves concise inline comments as normal human-facing documentation. Types start with an ASCII letter and may contain letters, digits, underscores, and hyphens. Types are normalized to lowercase. The established types are `invariant`, `history`, `compatibility`, `design`, and `dependency`. Unknown types are retained. Omitting the type produces `untyped`; put untyped prose on the next line to avoid treating its first word as a type. Empty content is valid. Colon syntax and marker-line prose are not supported.

Inside a Python triple-quoted docstring, the marker may follow ordinary human-facing prose. The annotation begins on the marker line, continues to the line before the matching standalone `"""` or `'''` delimiter, and excludes both the preceding prose and closing delimiter.

```ts
/* @agent-context invariant
 * IDs must remain stable across imports.
 */
const id = existingId;
```

A marker may appear anywhere inside a standalone block comment; the whole comment becomes the annotation. Consecutive comments with the same line prefix belong to the annotation until a different prefix, blank source line, code, or another marker. Each new line-comment marker starts a new annotation. A block is one annotation; the first marker determines its type. Comment prefixes and block delimiters are removed from hover text.

`startLine` and `endLine` are one-based, inclusive comment ranges. They describe annotation source, not an inferred code scope. This is a language-independent textual convention, not a language lexer: comment-shaped lines inside multiline strings or Markdown code examples can be recognized too. Integrations must not treat this as a security or language-analysis boundary.

Visibility is `hidden`, `all`, or `custom` with exact lowercase type names. It controls source-comment visibility, while markers and hover content remain available. The default is `hidden`.

The shared parser tests define two important boundaries: adjacent line-comment markers are separate annotations, and blocks with trailing executable text are ignored to avoid concealing code. Consumers should use these tests when adopting this contract.
