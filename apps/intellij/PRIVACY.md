# Privacy notice for HumanEye for IntelliJ IDEA

Effective 14 October 2026.

HumanEye for IntelliJ IDEA runs locally. It does not require an account, connect to a HumanEye server, send telemetry, or transmit source code or `@agent-context` comments to us.

## What the plugin processes

The plugin reads the contents of open editor documents in memory to find `@agent-context` annotations and display folds. It does not save a separate copy of those documents or annotations.

IntelliJ IDEA saves the plugin's enabled state, visibility mode, and selected annotation types in its local `human-eye.xml` settings file. These preferences are used to restore your filter choices; they are not sent to us. If you enable JetBrains Backup and Sync, the IDE may also sync these settings under your JetBrains account. IntelliJ may retain local settings after you uninstall a plugin, so uninstalling does not necessarily remove that settings file.

## Data sharing and third-party services

The plugin has no analytics or network integration and does not share editor content or plugin preferences with us or other services. Installation, updates, and any IDE-level data processing by JetBrains are separate from HumanEye and are covered by [JetBrains' privacy policy](https://www.jetbrains.com/company/privacy.html).

## Questions and changes

For questions about this notice, open an issue in the [HumanEye source repository](https://github.com/ischouten/human-eye/issues). Changes to this notice will be published in the repository.
