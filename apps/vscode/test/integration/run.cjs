const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { runTests } = require("@vscode/test-electron");

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, "../..");
  const extensionTestsPath = path.resolve(__dirname, "suite/index.cjs");
  const fixturePath = fs.mkdtempSync(path.join(os.tmpdir(), "human-eye-integration-"));
  fs.copyFileSync(
    path.resolve(__dirname, "fixture/AgentContextFixture.ts"),
    path.join(fixturePath, "AgentContextFixture.ts")
  );
  fs.copyFileSync(
    path.resolve(__dirname, "fixture/AgentContextFixture.java"),
    path.join(fixturePath, "AgentContextFixture.java")
  );
  fs.copyFileSync(
    path.resolve(__dirname, "fixture/agent_context_fixture.py"),
    path.join(fixturePath, "agent_context_fixture.py")
  );
  fs.copyFileSync(
    path.resolve(__dirname, "fixture/embedded_docstring_fixture.py"),
    path.join(fixturePath, "embedded_docstring_fixture.py")
  );
  const largeFixture = ["export class LargeAgentContextFixture {"];
  for (let index = 0; index < 25_000; index += 1) {
    if (index % 50 === 0) {
      largeFixture.push(
        "  /* @agent-context invariant",
        `   * Generated integration annotation ${index}.`,
        "   */"
      );
    }
    largeFixture.push(`  readonly value${index} = ${index};`);
  }
  largeFixture.push("}");
  fs.writeFileSync(path.join(fixturePath, "LargeAgentContextFixture.ts"), largeFixture.join("\n"));
  const macExecutable = "/Applications/Visual Studio Code.app/Contents/MacOS/Code";
  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [fixturePath, "--disable-extensions"],
      ...(process.platform === "darwin" && fs.existsSync(macExecutable)
        ? { vscodeExecutablePath: macExecutable }
        : {})
    });
  } finally {
    fs.rmSync(fixturePath, { force: true, recursive: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
