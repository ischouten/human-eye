# HumanEye for IntelliJ IDEA

HumanEye folds `@agent-context` maintenance annotations so source files stay readable. The comments remain in the file and can be expanded in IntelliJ's gutter. The plugin runs locally and does not need an AI account or service. Its Marketplace plugin ID is `ischouten.human-eye`, matching the VS Code extension ID.

To have a coding agent write these annotations, add the [HumanEye instruction template](../../docs/AGENT_INSTRUCTIONS.md) to your project's `AGENTS.md`, creating it if needed. If the project already has a `CLAUDE.md`, add the template there too. The plugin does not edit agent instruction files.

## Marketplace page

The overview and What's New text come from `plugin.xml`. Keep Getting Started in its separate Marketplace field; JetBrains renders HTML there, so paste the link as HTML rather than Markdown:

```html
<p>To help your coding agent write these annotations, add the <a href="https://github.com/ischouten/human-eye/blob/main/docs/AGENT_INSTRUCTIONS.md">HumanEye instruction template</a> to your project's <code>AGENTS.md</code>, creating that file if needed. If the project already has a <code>CLAUDE.md</code>, add the template there too. The plugin itself does not edit instruction files.</p>
```

Set the Marketplace **Source Code** resource to `https://github.com/ischouten/human-eye` (with the hyphen). This is a separate Marketplace field; the vendor URL in `plugin.xml` does not set it. The manually dispatched packaging workflow checks that the Marketplace still serves this URL before producing an upload artifact. Run `python3 apps/intellij/scripts/check_marketplace_source.py` from the repository root after each upload to confirm the link remains correct and publicly reachable.

Add `https://github.com/ischouten/human-eye/blob/main/apps/intellij/PRIVACY.md` as a Privacy Policy custom link in the Marketplace Resources area. The overview and 0.1.2 update notes also link to that notice. Publish `apps/intellij/PRIVACY.md` in the public repository before uploading the plugin ZIP so the links resolve.

## Build and install

Use IntelliJ IDEA 2026.2.3 or a compatible build in the 262 line, and JDK 25. Build with:

```sh
./gradlew -Dorg.gradle.java.installations.paths="/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home" -PlocalIde="/Applications/IntelliJ IDEA.app/Contents" test buildPlugin
```

The plugin ZIP appears at `build/distributions/human-eye-0.1.2.zip`. To try the already-built package in this checkout, open **Settings → Plugins → gear icon → Install Plugin from Disk**, select that ZIP, and restart. `./gradlew runIde` launches a sandbox IDE for development. On another computer, omit `-PlocalIde` to let Gradle download the target IntelliJ release.

## Use

A marker must be on its own comment line. The following lines in the same comment block belong to the annotation. A blank source line ends grouped `#` or `//` comments, while a comment-only `#` or `//` line keeps a paragraph break inside the annotation.

```java
/* @agent-context invariant
 * These IDs are stable across imports.
 */
static final String EXTERNAL_ID = "id";
```

Annotations collapse when the editor opens. The **HumanEye** status-bar control selects visible annotation types. **Tools → HumanEye: Select Visible Annotation Types** opens the same filter. **Settings → Editor → HumanEye** provides enabled, visibility, and custom-type defaults. Expanding a fold manually leaves that fold expanded until the source or filter changes.

For a manual check, open `examples/AgenticPatchRunner.java`, `examples/AgenticPatchRunner.kt`, and `examples/agentic_patch_runner.py`. Confirm annotations start collapsed, expand from the gutter, and respond to the status-bar filter without changing ordinary code folds. Then edit one annotation and switch between `hidden`, `all`, and a single visible type. Python triple-quoted docstrings containing `@agent-context` after human prose are recognized. Their embedded section may share IntelliJ's native docstring fold, depending on the IDE's folding regions; the parser does not include the preceding human prose in the annotation.
