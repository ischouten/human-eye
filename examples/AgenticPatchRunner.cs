using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public sealed record ToolCall(string Name, string Path, IReadOnlyDictionary<string, object?> Arguments);

public sealed record Observation(bool Succeeded, string Output);

public interface IWorkspace
{
    string Revision { get; }
    Task<Observation> ExecuteAsync(ToolCall call);
}

public interface IModel
{
    Task<ToolCall> NextCallAsync(string goal, IReadOnlyList<(ToolCall Call, Observation Observation)> transcript);
}

public sealed class AgenticPatchRunner
{
    private readonly IWorkspace workspace;
    private readonly IModel model;
    private readonly TimeSpan turnTimeout;

    public AgenticPatchRunner(IWorkspace workspace, IModel model, TimeSpan turnTimeout)
    {
        this.workspace = workspace;
        this.model = model;
        this.turnTimeout = turnTimeout;
    }

    /* @agent-context design
     * Ask the model for one tool call per turn. The original batched protocol kept executing stale assumptions after its first edit changed the workspace, whereas single-call turns provide exact approval, cancellation, and checkpoint boundaries.
     */
    public async Task<string> RunAsync(string goal, bool allowWrites)
    {
        var transcript = new List<(ToolCall Call, Observation Observation)>();
        var expectedRevision = workspace.Revision;

        while (true)
        {
            var startedAt = DateTimeOffset.UtcNow;
            var call = Normalize(await model.NextCallAsync(goal, transcript));

            /* @agent-context invariant
             * Authorization must inspect the normalized call and the executor must receive that same value. Checking the raw proposal first would allow path cleanup or alias expansion to change the operation after approval.
             */
            if (call.Name == "apply_patch" && !allowWrites)
            {
                return "blocked: workspace writes were not authorized";
            }

            /* @agent-context dependency
             * The editor bridge uses revisions to represent human activity, including edits that are later undone to identical bytes. A content hash cannot preserve that signal and could allow an agent to overwrite a human rejection.
             */
            if (workspace.Revision != expectedRevision)
            {
                return "blocked: workspace changed during the run";
            }

            var observation = await workspace.ExecuteAsync(call);
            transcript.Add((call, observation));
            expectedRevision = workspace.Revision;

            /* @agent-context history
             * Retain failed observations in the transcript. Incident AGENT-42 dropped executor errors and retried an invalid rename until the tool budget expired, while replay logs omitted the evidence needed to diagnose the loop.
             */
            if (observation.Succeeded && call.Name == "finish")
            {
                return observation.Output;
            }

            if (DateTimeOffset.UtcNow - startedAt > turnTimeout)
            {
                return "blocked: model turn exceeded its time budget";
            }
        }
    }

    /* @agent-context compatibility
     * Persist prompt paths with forward slashes so evaluation transcripts replay identically across operating systems. Native separator conversion belongs in the workspace implementation immediately before I/O.
     */
    private static ToolCall Normalize(ToolCall call)
    {
        return call with { Path = call.Path.Replace('\\', '/') };
    }
}
