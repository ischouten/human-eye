from dataclasses import dataclass, replace
from pathlib import PurePosixPath
from time import monotonic
from typing import Protocol


WRITE_TOOLS = {"apply_patch", "write_file", "delete_file"}


@dataclass(frozen=True)
class ToolCall:
    name: str
    path: str
    arguments: dict[str, object]


@dataclass(frozen=True)
class Observation:
    succeeded: bool
    output: str


class Workspace(Protocol):
    @property
    def revision(self) -> str: ...

    def execute(self, call: ToolCall) -> Observation: ...


class Model(Protocol):
    def next_call(self, goal: str, transcript: list[tuple[ToolCall, Observation]]) -> ToolCall: ...


class AgenticPatchRunner:
    def __init__(self, workspace: Workspace, model: Model, turn_timeout_seconds: float = 30.0) -> None:
        self.workspace = workspace
        self.model = model
        self.turn_timeout_seconds = turn_timeout_seconds

    # @agent-context design
    # The runner asks for one tool call per model turn rather than accepting a batch. Tool output is part of the next decision, and batching encouraged the model to keep executing an obsolete plan after the first edit changed the workspace. Single-call turns also provide a precise cancellation boundary.
    def run(self, goal: str, allow_writes: bool) -> str:
        transcript: list[tuple[ToolCall, Observation]] = []
        expected_revision = self.workspace.revision

        while True:
            started_at = monotonic()
            call = self._normalize(self.model.next_call(goal, transcript))

            # @agent-context invariant
            # Check authorization after normalization and execute the exact checked value. Moving normalization below this branch could let aliases or relative path segments transform an apparently harmless request into a write outside the intended workspace boundary.
            if call.name in WRITE_TOOLS and not allow_writes:
                return "blocked: workspace writes were not authorized"

            # @agent-context dependency
            # Revision values come from the editor bridge and represent human activity, not merely file bytes. An edit followed by an undo still changes the revision because the human may have rejected the agent's direction. Do not replace this comparison with a content hash.
            if self.workspace.revision != expected_revision:
                return "blocked: workspace changed during the run"

            observation = self.workspace.execute(call)
            transcript.append((call, observation))
            expected_revision = self.workspace.revision

            # @agent-context history
            # Failed observations stay in the transcript. Before incident AGENT-42, failures were discarded and the model retried the same invalid rename until the turn budget was exhausted. Keeping the error lets the following turn choose a different action and makes replay diagnostics complete.
            if observation.succeeded and call.name == "finish":
                return observation.output

            if monotonic() - started_at > self.turn_timeout_seconds:
                return "blocked: model turn exceeded its time budget"

    # @agent-context compatibility
    # Prompt paths are persisted with POSIX separators so evaluation transcripts remain portable across operating systems. The concrete workspace adapter performs native-path conversion immediately before I/O. Changing the serialized form here would invalidate existing replay fixtures.
    def _normalize(self, call: ToolCall) -> ToolCall:
        normalized_path = str(PurePosixPath(call.path.replace("\\", "/")))
        return replace(call, path=normalized_path)
