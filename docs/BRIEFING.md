# `@agent-context` Standalone Extensions --- Implementation Briefing

## Objective

Turn the `@agent-context` convention currently being developed for
**itsyGitsy** into an editor/tool-independent convention with standalone
integrations.

The implementation order is:

1.  **VS Code extension first**
2.  **GitHub browser extension second** (Chrome/Chromium initially)

Both integrations should understand exactly the same annotation grammar
and filtering semantics. The platform-specific projects should only be
responsible for discovering source code and presenting the annotations
in their own UI.

The longer-term model is:

``` text
                    ┌─ itsyGitsy
                    │
@agent-context ─────┼─ VS Code extension
core/spec/parser    │
                    └─ GitHub browser extension
```

The extensions do **not** need an AI model, Copilot integration, server,
or credentials. They interpret annotations already present in source
code.

------------------------------------------------------------------------

## Repository / technology

Use a **pnpm TypeScript monorepo**.

``` text
agent-context/
├─ packages/
│  └─ core/
│     └─ src/
│        ├─ index.ts
│        ├─ parser.ts
│        ├─ types.ts
│        └─ filters.ts
│
├─ apps/
│  ├─ vscode/
│  │  └─ src/
│  │     └─ extension.ts
│  │
│  └─ browser/
│     └─ src/
│        ├─ content.ts
│        └─ github/
│           ├─ diff.ts
│           ├─ file.ts
│           └─ navigation.ts
│
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

The existing skeleton already follows the basic `packages/core`,
`apps/vscode`, `apps/browser` split.

### Architectural rule

`packages/core` must remain **completely platform-independent**.

It must not depend on:

-   `vscode`
-   `window`
-   `document`
-   GitHub DOM structure
-   browser-extension APIs

It owns the convention itself:

-   annotation grammar/parsing
-   annotation types
-   line/range information
-   filter semantics
-   shared validation
-   tests

Conceptually:

``` ts
parseAgentContext(source: string): AgentContextAnnotation[]
```

with a model along the lines of:

``` ts
interface AgentContextAnnotation {
  type: AgentContextType;
  text: string;
  startLine: number;
  endLine: number;
}
```

The exact grammar and supported annotation types should be stabilized
early, before significant UI work is built around assumptions that may
later change.

Do **not** try to share UI code between VS Code and GitHub. Share
semantics, parser logic, and types; keep rendering/platform integration
separate.

------------------------------------------------------------------------

# Phase 1 --- VS Code extension

## Goal

Make `@agent-context` annotations useful while reading/editing code in
VS Code without making annotated files visually noisy.

TypeScript should be used for the extension.

## UX principles

Annotations should be **invisible by default**.

Their presence should be indicated only by a **subtle horizontal
line/marker** associated with the relevant source location. Do not leave
prominent badges, labels, or other visual "traces" throughout the code.

Hovering the marker should reveal a popover containing the annotation
information, for example:

``` text
@agent-context invariant

This ID must remain stable because ...
```

The extension should eventually support filtering annotation types.

The broader `@agent-context` UI convention already established for
itsyGitsy is:

-   default: all annotation content invisible
-   subtle marker indicates that agent context exists
-   hover/popover reveals the annotation
-   users can choose which annotation types are visible
-   a setting can override the default filter behavior

The VS Code UX does not have to duplicate the itsyGitsy controls
literally, but should preserve these semantics.

## Likely VS Code APIs

Expected APIs include:

``` ts
vscode.window.createTextEditorDecorationType(...)
editor.setDecorations(...)

vscode.languages.registerHoverProvider(...)

vscode.workspace.getConfiguration(...)
vscode.workspace.onDidChangeTextDocument(...)
vscode.window.onDidChangeActiveTextEditor(...)
```

Keep parsing out of the VS Code layer. The extension should obtain
document text, pass it to `@agent-context/core`, and translate returned
annotations into decorations/hover information.

## Suggested VS Code MVP

Implement in this order:

1.  Load and parse the active text document through `packages/core`.
2.  Detect `@agent-context` annotations reliably.
3.  Render the subtle marker at the correct source location.
4.  Show annotation type/content on hover.
5.  Refresh correctly when:
    -   active editor changes
    -   document changes
    -   configuration changes
6.  Add settings for default visibility/filter behavior.
7.  Add commands/filter controls only after the basic interaction is
    solid.

Possible commands later:

``` text
Agent Context: Hide All
Agent Context: Show All
Agent Context: Show Invariants
...
```

## VS Code acceptance criteria

The first usable version is complete when:

-   annotations are parsed using the shared core package
-   ordinary code remains visually clean
-   a subtle marker shows that context exists
-   hovering exposes the annotation
-   edits update annotations without reopening the file
-   unsupported/non-annotated files behave normally
-   core parsing is covered by tests
-   `pnpm build:vscode` succeeds
-   a `.vsix` can be produced and installed locally

## Distribution

Initial testing should use a local `.vsix`.

Public Marketplace publishing is **not** required for the MVP. Validate
the convention and UX first.

Expected release artifact:

``` text
agent-context-<version>.vsix
```

------------------------------------------------------------------------

# Phase 2 --- GitHub browser extension

Start this after the VS Code integration and core grammar are working
reliably.

## Goal

Bring the same `@agent-context` semantics to `github.com`, with the
primary use case being **code review and PR diffs**.

Chrome/Chromium is the first target. Use a **Manifest V3 WebExtension**
written in TypeScript.

Firefox support can be considered later because the underlying
WebExtensions model is similar.

## Primary GitHub UX

The highest-value surface is:

``` text
Pull Request
  → Files changed
  → individual file diffs
```

Annotations should follow the same principles as VS Code/itsyGitsy:

-   hidden by default
-   subtle marker at the relevant location
-   hover/popover reveals annotation
-   filters determine which annotation types are exposed

For PR/file-diff pages, the intended direction is to have an Agent
Context filter immediately in the file-diff top bar, near controls such
as **Blame**, conceptually:

``` text
Files changed                [Agent context: Hidden ▾] [Blame]
```

Possible filter choices:

``` text
All invisible
──────────────
invariant
reason
warning
generated
all
```

The exact type list should come from the finalized core grammar rather
than being independently defined by the browser extension.

A user's global/default choice should eventually be configurable, while
the current file/diff can override that setting locally.

## Browser architecture

Use a content script restricted to GitHub, for example:

``` json
{
  "matches": ["https://github.com/*"]
}
```

Avoid `<all_urls>`.

The browser integration should:

1.  identify supported GitHub source/diff views
2.  extract the relevant rendered source/comment text
3.  pass source information to `packages/core`
4.  map returned annotations back to GitHub DOM lines
5.  inject markers/popovers/filter UI

Keep GitHub-specific DOM handling under an isolated adapter, e.g.:

``` text
apps/browser/src/github/
```

This matters because GitHub's DOM is an implementation detail and can
change.

## GitHub SPA navigation

Do not assume a full page reload.

GitHub uses SPA-like navigation extensively, so a one-time:

``` ts
scanDocument();
```

during content-script startup is insufficient.

The integration should have an explicit navigation/rescan mechanism and
probably a narrowly scoped `MutationObserver` fallback.

Conceptually:

``` ts
scanCurrentPage();

observeGitHubNavigation(() => {
  scanCurrentPage();
});
```

Avoid an indiscriminate observer that repeatedly scans the entire page
on every DOM mutation.

## Data/security approach

For the first version, use the **rendered GitHub DOM only**.

Do not initially require:

-   GitHub OAuth
-   GitHub personal access tokens
-   GitHub API access
-   a backend/server
-   source-code uploads
-   AI/LLM access

This gives the extension a strong privacy model:

> The extension runs locally, reads the GitHub source/diff currently
> displayed in the browser, and does not send source code elsewhere.

Only introduce GitHub API access later if a concrete feature requires
complete-file information that cannot reasonably be obtained from the
rendered page.

## Browser MVP acceptance criteria

The first useful browser version is complete when:

-   it activates only on GitHub
-   PR Files Changed views are recognized
-   annotations in rendered changed lines are detected using
    `packages/core`
-   markers/popovers follow the same semantics as VS Code
-   navigation between GitHub views causes correct rescanning
-   duplicate markers are not created after DOM updates/navigation
-   permissions remain minimal
-   no GitHub authentication/server is required
-   `pnpm build:browser` succeeds
-   a loadable Chrome extension ZIP/directory is produced

Expected release artifact:

``` text
agent-context-chrome-<version>.zip
```

Public Chrome Web Store publication can follow successful local/unpacked
testing.

------------------------------------------------------------------------

# Shared core --- priority work

Before the platform implementations become large, settle and test the
shared contract.

Questions that should be made explicit in `packages/core` include:

-   exact `@agent-context` syntax
-   supported annotation types
-   whether a reason/value is mandatory
-   single-line vs multi-line annotations
-   how an annotation associates with generated/source code
-   whitespace/comment-prefix handling across languages
-   malformed annotation behavior
-   whether unknown future types are ignored or represented generically
-   filtering semantics

The core package should have a comprehensive set of small parser tests.
This is more important than extensive UI tests initially because all
integrations depend on identical interpretation.

------------------------------------------------------------------------

# Milestones

## M1 --- Core contract

-   finalize initial annotation grammar
-   define TypeScript types
-   implement parser
-   implement filter semantics
-   add parser tests
-   keep package platform-neutral

## M2 --- VS Code MVP

-   active-document parsing
-   decorations/markers
-   hover information
-   document/editor refresh
-   minimal settings
-   local `.vsix` build

At this point, use the extension in real development for a while and
adjust the convention if necessary.

## M3 --- VS Code polish

-   filtering UX
-   settings/default behavior
-   performance checks on large files
-   README/examples
-   package metadata
-   prepare Marketplace publication if desired

## M4 --- GitHub browser MVP

-   Manifest V3 extension
-   GitHub content script
-   PR diff detection
-   DOM-to-source-line mapping
-   annotation markers/popovers
-   GitHub SPA navigation handling
-   local Chrome "Load unpacked" testing

## M5 --- GitHub filtering/polish

-   Files Changed filter control
-   persisted default preference
-   per-file/per-view override
-   DOM robustness
-   minimal permission/privacy review
-   package Chrome ZIP

## M6 --- Public distribution

Only after the behavior has been validated locally:

-   publish VS Code extension to Visual Studio Marketplace
-   publish browser extension to Chrome Web Store
-   optionally add Firefox support
-   document `@agent-context` as an independent convention rather than
    an itsyGitsy-only feature

------------------------------------------------------------------------

# Product direction

The important conceptual distinction is:

**`@agent-context` should be the convention; itsyGitsy, VS Code, and
GitHub are consumers of that convention.**

That makes the project useful outside itsyGitsy and gives other
editors/tools a stable contract they could implement later.

Potential future consumers could include:

-   JetBrains IDEs
-   CLI tooling
-   other Git clients
-   GitHub/GitLab integrations
-   static validation/linting
-   agent tooling that writes or consumes the annotations

Do not expand into those yet. First prove the convention with the shared
core + VS Code implementation, then prove portability with the GitHub
browser extension.

------------------------------------------------------------------------

# Immediate Codex task

Start with **M1 and M2 only**.

1.  Inspect the existing pnpm monorepo skeleton.
2.  Review/finalize the initial `@agent-context` grammar before
    expanding platform code.
3.  Implement/test `packages/core`.
4.  Build the VS Code MVP around the core API.
5.  Produce a locally installable `.vsix`.
6.  Do not start substantial GitHub/browser implementation until the VS
    Code behavior and shared grammar have been validated.

Keep commits/components separated enough that changes to the annotation
grammar do not require rewriting platform-specific parsing logic.
