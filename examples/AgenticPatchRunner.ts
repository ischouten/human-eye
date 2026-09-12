type ToolName = "read_file" | "apply_patch" | "run_tests" | "finish";

interface ToolCall {
  name: ToolName;
  path: string;
  arguments: Readonly<Record<string, unknown>>;
}

interface Observation {
  succeeded: boolean;
  output: string;
}

interface Workspace {
  readonly revision: string;
  execute(call: ToolCall): Promise<Observation>;
}

interface Model {
  nextCall(goal: string, transcript: ReadonlyArray<readonly [ToolCall, Observation]>): Promise<ToolCall>;
}

export class AgenticPatchRunner {
  constructor(
    private readonly workspace: Workspace,
    private readonly model: Model,
    private readonly turnTimeoutMs = 30_000
  ) {}

  /* @agent-context design
   * Request one tool call per model turn. Earlier versions accepted batches, but the remaining calls became stale as soon as the first edit changed the workspace. A single-call loop also gives cancellation and approval checks an exact boundary.
   */
  async run(goal: string, allowWrites: boolean): Promise<string> {
    const transcript: Array<readonly [ToolCall, Observation]> = [];
    let expectedRevision = this.workspace.revision;

    while (true) {
      const startedAt = performance.now();
      const call = this.normalize(await this.model.nextCall(goal, transcript));

      /* @agent-context invariant
       * Authorization applies to the normalized call that reaches the executor. Never authorize the raw model proposal and rewrite it afterward because aliases and relative segments can change the target or convert an apparent read into a write.
       */
      if (call.name === "apply_patch" && !allowWrites) {
        return "blocked: workspace writes were not authorized";
      }

      /* @agent-context dependency
       * The editor bridge increments revisions for human activity, including edit-and-undo sequences that restore identical bytes. Replacing this check with a content hash would erase the signal that a human reconsidered the affected code.
       */
      if (this.workspace.revision !== expectedRevision) {
        return "blocked: workspace changed during the run";
      }

      const observation = await this.workspace.execute(call);
      transcript.push([call, observation]);
      expectedRevision = this.workspace.revision;

      /* @agent-context history
       * Preserve failed observations in the transcript. Incident AGENT-42 repeatedly retried an invalid rename because the failure was discarded before the following model turn, exhausting the tool budget and obscuring the original cause in replay diagnostics.
       */
      if (observation.succeeded && call.name === "finish") {
        return observation.output;
      }

      if (performance.now() - startedAt > this.turnTimeoutMs) {
        return "blocked: model turn exceeded its time budget";
      }
    }
  }

  /* @agent-context compatibility
   * Persist prompt paths with POSIX separators so recorded evaluations replay consistently on Windows, macOS, and Linux. Native path conversion belongs in the workspace adapter immediately before filesystem access.
   */
  private normalize(call: ToolCall): ToolCall {
    return { ...call, path: call.path.replaceAll("\\", "/") };
  }
}
