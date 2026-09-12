# HumanEye roadmap

## Product direction

HumanEye makes source code easier to read by folding durable, agent-directed maintenance comments out of the normal reading flow. `@agent-context` is the editor-independent annotation convention; HumanEye provides integrations that present it.

```text
@agent-context ─────┬─ HumanEye for VS Code
core/spec/parser    ├─ HumanEye for GitHub
                    └─ other compatible tools
```

HumanEye operates locally on annotations already present in source code. Its editor integrations do not require an AI model, source-code upload, account, server, or credentials.

## Architecture

The repository is a pnpm TypeScript monorepo:

```text
packages/core   Shared parser, annotation types, ranges, and filtering semantics
apps/vscode     HumanEye VS Code extension
apps/browser    Chrome/Chromium extension for GitHub
```

`packages/core` remains platform-independent. It must not depend on VS Code, browser APIs, DOM structures, or platform UI. Integrations share the parser and semantics while keeping rendering and platform discovery separate.

## Current status

### M1 — Core contract: complete

- [x] Define the standalone `@agent-context` grammar.
- [x] Support block comments, line comments, hash comments, and HTML comments.
- [x] Define annotation types and one-based inclusive source ranges.
- [x] Preserve unknown types and normalize type names.
- [x] Implement `hidden`, `all`, and custom filtering semantics.
- [x] Cover parsing boundaries, malformed input, adjacent annotations, and filtering with tests.
- [x] Keep the package independent of editor and browser APIs.

The grammar contract is documented in [GRAMMAR.md](GRAMMAR.md).

### M2 — VS Code MVP: complete

- [x] Parse active documents through the shared core package.
- [x] Collapse annotations by default without changing source files.
- [x] Render subtle, indentation-aware annotation headers.
- [x] Show annotation content on hover.
- [x] Preserve native language folding alongside HumanEye folds.
- [x] Refresh on document, editor, and configuration changes.
- [x] Support the same document in multiple editor groups.
- [x] Package and install a local VSIX.
- [x] Cover TypeScript, Java, and Python behavior in a real VS Code Extension Host.

### M3 — VS Code polish: complete

- [x] Add a native status-bar filter for visible annotation types.
- [x] Apply filter changes immediately by expanding and folding affected annotations.
- [x] Add extension settings for enablement, default visibility, and custom visible types.
- [x] Align collapsed annotation labels with the code they assist.
- [x] Dim and reduce the collapsed annotation label while keeping expanded comments unchanged.
- [x] Add concise hover guidance without repeating the annotation header.
- [x] Add optional fold-control hover styling and document its VS Code integrity-warning tradeoff.
- [x] Add an idempotent command that installs the writing template into project or user-profile instructions for Claude or Codex.
- [x] Add Java, Python, TypeScript, Rust, and C# examples.
- [x] Add README screenshots showing expanded and collapsed Python source.
- [x] Add Marketplace description, categories, keywords, changelog, repository links, and MIT license.
- [x] Add prepublish compilation, VSIX contents filtering, automated packaging, and Extension Host tests in CI.
- [x] Add a manually dispatched GitHub Actions workflow using Visual Studio Marketplace trusted publishing with GitHub OIDC.
- [x] Measure parsing and refresh behavior on large source files and enforce regression budgets in CI.
- [x] Add a Marketplace PNG icon of at least 128×128 pixels.
- [x] Choose and configure `ischouten` as the permanent Visual Studio Marketplace publisher ID.
- [x] Configure the protected GitHub environment and publish `ischouten.human-eye` 0.1.33 to the Visual Studio Marketplace.

The September 2026 local baseline parses a 2.94 MB, 106,000-line source file containing 2,000 annotations in 5.25 ms median and 6.25 ms p95; custom-type filtering takes 0.019 ms median. The VS Code Extension Host opens and refreshes a generated 26,502-line TypeScript document containing 500 annotations in 201 ms while retaining native folding. CI allows a deliberately broad 250 ms parser median and 5-second Extension Host budget to detect major regressions without depending on runner speed.

The Marketplace trusted-publishing workflow is prepared, but releases remain manual until Microsoft exposes its trusted-publishing policy UI.

### M4 — GitHub browser MVP: started

The browser package currently proves that the shared parser can be bundled into a Manifest V3 content script. Its current whole-page scan and broad mutation observer are placeholders, not a usable GitHub integration.

- [x] Create a Manifest V3 Chrome/Chromium package restricted to GitHub.
- [x] Bundle the shared parser into a content script.
- [ ] Recognize supported GitHub file and pull-request diff views.
- [ ] Extract source per rendered file instead of scanning `document.body.innerText`.
- [ ] Map annotations to GitHub source and diff lines.
- [ ] Render subtle markers and hover content without changing the underlying diff.
- [ ] Handle GitHub navigation with targeted rescans.
- [ ] Replace the broad mutation observer with bounded observation and deduplication.
- [ ] Add browser fixtures and automated interaction tests.
- [ ] Produce and manually validate a loadable Chrome extension artifact.

The first browser implementation should use only the rendered GitHub DOM. It should not request GitHub OAuth, personal access tokens, API access, source-code uploads, or a backend.

### M5 — GitHub filtering and polish: not started

- [ ] Add an annotation filter to GitHub file and diff controls.
- [ ] Support hidden, all, and per-type visibility through shared semantics.
- [ ] Persist a user default and allow a temporary view-level override.
- [ ] Validate GitHub SPA navigation and DOM changes without duplicate UI.
- [ ] Review permissions, privacy disclosures, accessibility, and performance.
- [ ] Package a Chrome Web Store ZIP.

### M6 — Public distribution: in progress

- [x] License HumanEye under MIT.
- [x] Add repeatable VS Code validation and packaging workflows.
- [x] Add a protected, manual VS Code Marketplace publishing workflow.
- [x] Publish HumanEye for VS Code.
- [ ] Enable tokenless VS Code Marketplace releases when Microsoft exposes trusted-publishing policy configuration.
- [ ] Publish the browser extension to the Chrome Web Store after M4 and M5 are complete.
- [ ] Consider Firefox and other editor integrations after both primary integrations are stable.

## Near-term order

1. Replace the browser placeholder with GitHub file and diff adapters.
2. Validate the GitHub interaction locally before adding persistent filtering.
3. Enable Marketplace trusted publishing when its policy UI becomes available.
4. Prepare browser-store distribution only after the DOM integration is reliable.

## Scope boundaries

`@agent-context` does not replace normal comments, agent instruction files, ADRs, or documentation.

```text
Obvious or temporary information       → no comment
Human-facing local explanation         → normal comment
Durable colocated maintenance context  → @agent-context
Module or repository instructions      → AGENTS.md or CLAUDE.md
Significant architectural knowledge    → ADR or documentation
```

Potential later consumers include JetBrains IDEs, CLI tooling, other Git clients, GitLab integrations, static validation, and agent tools that write or consume annotations. These remain outside the current roadmap until the VS Code and GitHub integrations are stable.
