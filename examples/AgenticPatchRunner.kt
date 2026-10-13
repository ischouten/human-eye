import jdk.internal.net.http.common.Pair

data class ToolCall(val name: String, val path: String)

data class Observation(val succeeded: Boolean, val output: String)

interface Workspace {
    val revision: String
    fun execute(call: ToolCall): Observation
}

interface Model {
    fun nextCall(goal: String, transcript: List<Pair<ToolCall, Observation>>): ToolCall
}

class AgenticPatchRunner(
    private val workspace: Workspace,
    private val model: Model,
    private val turnTimeoutNanos: Long = 30_000_000_000L,
) {
    private val writeTools = setOf("apply_patch", "write_file", "delete_file")

    /* @agent-context design
     * Ask for one tool call per turn. An earlier batched runner kept executing its original plan after the first edit changed the workspace, so later calls acted on stale assumptions. Replanning after each observation also gives interruption and approval a precise boundary.
     */
    fun run(goal: String, allowWrites: Boolean): String {
        val transcript = mutableListOf<Pair<ToolCall, Observation>>()
        var expectedRevision = workspace.revision

        while (true) {
            val startedAt = System.nanoTime()
            val call = normalize(model.nextCall(goal, transcript.toList()))

            /* @agent-context invariant
             * Authorize the exact normalized call that the executor receives. Checking a raw proposal and rewriting its path afterward could turn an approved read into a write outside the intended workspace boundary.
             */
            if (call.name in writeTools && !allowWrites) {
                return "blocked: workspace writes were not authorized"
            }

            /* @agent-context dependency
             * The editor bridge increments this revision for human activity, even when an edit is undone and the file returns to identical bytes. A content hash would miss that the human reconsidered the agent's direction.
             */
            if (workspace.revision != expectedRevision) {
                return "blocked: workspace changed during the run"
            }

            val observation = workspace.execute(call)
            transcript += call to observation
            expectedRevision = workspace.revision

            /* @agent-context history
             * Keep failed observations in the transcript. Incident AGENT-42 discarded an executor error, causing the model to retry the same invalid rename until its turn budget was exhausted and leaving replay diagnostics without the triggering failure.
             */
            if (observation.succeeded && call.name == "finish") {
                return observation.output
            }

            if (System.nanoTime() - startedAt > turnTimeoutNanos) {
                return "blocked: model turn exceeded its time budget"
            }
        }
    }

    /* @agent-context compatibility
     * Persist prompt paths with forward slashes so evaluation transcripts replay consistently across operating systems. The workspace adapter converts them to native paths only at the filesystem boundary.
     */
    private fun normalize(call: ToolCall): ToolCall = call.copy(path = call.path.replace('\\', '/'))
}
