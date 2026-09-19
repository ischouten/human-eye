# Changelog

## 0.1.38

- Recognize `@agent-context` sections embedded after human-facing prose in Python triple-quoted docstrings.
- Dim embedded docstring context because VS Code cannot nest a separate fold inside its native docstring fold without replacing Python folding.

## 0.1.37

- Ensure syntax-token colors cannot override grey dimming in the modified side of a PR diff.

## 0.1.36

- Keep both PR diff panes dimmed when the modified editor URI changes during loading, and render hidden annotation bodies with the editor's ghost-text grey.

## 0.1.35

- Refresh both sides of a newly opened text diff after VS Code finishes registering its tab.

## 0.1.34

- Dim hidden annotation bodies in text diff and pull-request editors while preserving review geometry and change highlighting.

## 0.1.33

- Publish under the permanent `ischouten.human-eye` Marketplace identity.
- Prepare tokenless Marketplace releases through GitHub OIDC trusted publishing.

## 0.1.32

- Collapse `@agent-context` maintenance annotations while preserving native language folding.
- Add an idempotent command for installing the annotation-writing template in project or user-profile agent instructions.
- Show annotation contents on hover and align collapsed markers with the assisted code.
- Filter visible annotation types from the VS Code status bar.
- Support block comments, line comments, Python hash comments, and HTML comments.
- Offer an optional folding-control hover style for users of Custom CSS and JS Loader.
