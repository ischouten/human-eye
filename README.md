# @agent-context

Monorepo for the shared `@agent-context` parser plus VS Code and browser integrations.

## Requirements

- Node.js 20+
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

Before publishing, replace the placeholder VS Code `publisher` value in `apps/vscode/package.json`.
