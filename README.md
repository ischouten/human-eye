# @agent-context

Monorepo for the shared `@agent-context` parser plus VS Code and browser integrations.

## Requirements

- Node.js 22+
- pnpm 10+

## Install

```bash
pnpm install
```

## Build everything

```bash
pnpm build
```

## Build individual packages

```bash
pnpm build:core
pnpm build:vscode
pnpm build:browser
```

## Typecheck

```bash
pnpm typecheck
```

## Layout

```text
packages/core   Shared parser, types and semantics
apps/vscode     VS Code extension
apps/browser    Chrome/Chromium Manifest V3 extension for GitHub
```

## Browser development

After `pnpm build:browser`, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `apps/browser/dist`.

## VS Code development

Open `apps/vscode` in VS Code and add a normal extension-development launch configuration, or wire the repo root as a multi-root workspace. The built entrypoint is `apps/vscode/dist/extension.js`.

Before publishing, choose the permanent VS Code `publisher` value in `apps/vscode/package.json`.

## VS Code MVP and packaging

The initial implementation covers the shared parser and VS Code integration. The browser package remains a placeholder for the next phase. See [the brief](docs/BRIEFING.md) and [the grammar contract](docs/GRAMMAR.md).

Run `pnpm test`, `pnpm typecheck`, and `pnpm package:vscode`. Individual extension builds include their core dependency. Packaging creates `apps/vscode/agent-context-0.1.0.vsix` with the bundled runtime and no external runtime dependencies. If pnpm is not installed, use `npx --yes pnpm@10.15.1` in place of `pnpm`.

GitHub Actions validates and packages on pushes, pull requests, and manual runs. Download `agent-context-vsix` from the workflow artifacts, extract it, and install the VSIX using VS Code's **Extensions: Install from VSIX** command. The workflow does not publish to a marketplace or create releases. Packaging uses Microsoft's [vsce tooling](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

For local debugging, run `pnpm build:vscode`, then launch **Agent Context Extension** from the root VS Code Run and Debug view.

### Manual acceptance check

Open a source file containing a multiline annotation. It should fold to one horizontal rule with no reserved blank rows. Hover the rule, then click the folding control in the gutter to expand and collapse it. Try `all` and `custom` visibility, edit the annotation type, open the same document in two editor groups, and disable the extension setting. Verify both groups refresh and ordinary code stays visible.

The local publisher identifier is provisional (`agent-context-local`); choose a permanent identity before wider distribution, since changing it creates a different extension. No open-source license has been selected; the extension package is currently marked `UNLICENSED`.
