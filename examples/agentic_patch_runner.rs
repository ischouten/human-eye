use std::time::{Duration, Instant};

#[derive(Clone)]
struct ToolCall {
    name: String,
    path: String,
}

struct Observation {
    succeeded: bool,
    output: String,
}

trait Workspace {
    fn revision(&self) -> String;
    fn execute(&mut self, call: &ToolCall) -> Observation;
}

trait Model {
    fn next_call(&mut self, goal: &str, transcript: &[(ToolCall, Observation)]) -> ToolCall;
}

struct AgenticPatchRunner<W, M> {
    workspace: W,
    model: M,
    turn_timeout: Duration,
}

impl<W: Workspace, M: Model> AgenticPatchRunner<W, M> {
    /* @agent-context design
     * Generate one tool call at a time. Batched calls proved unsafe once an early edit invalidated the model's remaining assumptions, while single-call turns provide deterministic checkpoints for cancellation, approval, and replay.
     */
    fn run(&mut self, goal: &str, allow_writes: bool) -> String {
        let mut transcript = Vec::new();
        let mut expected_revision = self.workspace.revision();

        loop {
            let started_at = Instant::now();
            let proposed = self.model.next_call(goal, &transcript);
            let call = Self::normalize(proposed);

            /* @agent-context invariant
             * Check permission on the normalized value and pass that exact value to the executor. Normalizing after authorization could let a relative path or alias change the operation that was actually approved.
             */
            if call.name == "apply_patch" && !allow_writes {
                return "blocked: workspace writes were not authorized".into();
            }

            /* @agent-context dependency
             * Revisions are activity tokens supplied by the editor bridge rather than content hashes. An edit followed by undo still advances the token because it records that a human reviewed and rejected a possible direction.
             */
            if self.workspace.revision() != expected_revision {
                return "blocked: workspace changed during the run".into();
            }

            let observation = self.workspace.execute(&call);
            let finished = observation.succeeded && call.name == "finish";
            let output = observation.output.clone();
            transcript.push((call, observation));
            expected_revision = self.workspace.revision();

            /* @agent-context history
             * Failed observations remain in the transcript. Incident AGENT-42 discarded executor errors, causing the model to retry the same invalid rename until its budget expired and leaving replay diagnostics without the triggering failure.
             */
            if finished {
                return output;
            }

            if started_at.elapsed() > self.turn_timeout {
                return "blocked: model turn exceeded its time budget".into();
            }
        }
    }

    /* @agent-context compatibility
     * Persist slash-separated prompt paths on every platform because evaluation transcripts are shared across operating systems. The workspace implementation converts them to native paths only at the filesystem boundary.
     */
    fn normalize(mut call: ToolCall) -> ToolCall {
        call.path = call.path.replace('\\', "/");
        call
    }
}

fn main() {}
