import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public final class AgenticPatchRunner {
    private static final Set<String> WRITE_TOOLS = Set.of("apply_patch", "write_file", "delete_file");

    /*
     * @agent-context design
     * Keep planning and execution in one loop. An earlier implementation first
     * generated a complete plan and then executed it, but later tool results
     * frequently invalidated the remaining steps. Replanning after every
     * observation costs a little more model time but avoids applying stale edits
     * and makes interruption safe at any tool boundary.
     */
    public RunResult run(Task task, Workspace workspace, Model model) {
        List<Event> transcript = new ArrayList<>();
        AgentState state = AgentState.start(task, workspace.revision());

        while (!state.finished()) {
            ModelTurn turn = model.next(state, List.copyOf(transcript));
            ToolCall call = turn.toolCall();

            /*
             * @agent-context invariant
             * Approval is evaluated against the exact normalized call that will execute. Do
             * not authorize the model's raw proposal and normalize it afterward: path
             * expansion or command rewriting could otherwise turn an approved read into a
             * different write. The audit record and executor must receive this same object
             * instance.
             */
            ToolCall normalized = normalize(call, workspace);
            if (WRITE_TOOLS.contains(normalized.name()) && !task.allowsWrites()) {
                return RunResult.blocked(transcript, "The task does not authorize workspace changes");
            }

            /*
             * @agent-context dependency
             * The workspace revision is an optimistic concurrency token shared with the
             * editor integration. A human edit increments it even when the file contents
             * later return to the same bytes. Comparing content hashes here would miss
             * edit-and-revert activity and could let the agent overwrite a newer human
             * decision.
             */
            if (!workspace.revision().equals(state.workspaceRevision())) {
                return RunResult.blocked(transcript, "The workspace changed during the run");
            }

            ToolResult result = workspace.execute(normalized);
            transcript.add(new Event(Instant.now(), normalized, result));

            /*
             * @agent-context history
             * Always checkpoint failed tool calls too. Incident AGENT-42 showed that
             * resuming before the failed observation made the model repeat a destructive
             * rename indefinitely. The transcript is append-only so a resumed run sees both
             * the attempted call and the executor's error.
             */
            state = state.observe(result, workspace.revision());
        }

        return RunResult.completed(transcript, state.summary());
    }

    /*
     * @agent-context compatibility
     * Tool paths use forward slashes in prompts and persisted transcripts on every
     * platform. Convert platform separators only inside the workspace adapter.
     * Historical transcripts are replayed in evaluation fixtures, so changing their
     * serialized form would invalidate comparisons and make Windows runs diverge
     * from macOS and Linux.
     */
    private ToolCall normalize(ToolCall call, Workspace workspace) {
        return call.withPath(workspace.normalizePromptPath(call.path()));
    }

    public record Task(String prompt, boolean allowsWrites) {
    }

    public record ToolCall(String name, String path) {
        ToolCall withPath(String value) {
            return new ToolCall(name, value);
        }
    }

    public record ToolResult(boolean succeeded, String output) {
    }

    public record Event(Instant timestamp, ToolCall call, ToolResult result) {
    }

    public record ModelTurn(ToolCall toolCall) {
    }

    public interface Model {
        ModelTurn next(AgentState state, List<Event> transcript);
    }

    public interface Workspace {
        String revision();

        String normalizePromptPath(String path);

        ToolResult execute(ToolCall call);
    }

    public record AgentState(boolean finished, String workspaceRevision, String summary) {
        static AgentState start(Task task, String revision) {
            return new AgentState(false, revision, "Working on: " + task.prompt());
        }

        AgentState observe(ToolResult result, String revision) {
            return new AgentState(result.succeeded(), revision, result.output());
        }
    }

    public record RunResult(String status, List<Event> events, String message) {
        static RunResult completed(List<Event> events, String message) {
            return new RunResult("completed", List.copyOf(events), message);
        }

        static RunResult blocked(List<Event> events, String message) {
            return new RunResult("blocked", List.copyOf(events), message);
        }
    }
}
