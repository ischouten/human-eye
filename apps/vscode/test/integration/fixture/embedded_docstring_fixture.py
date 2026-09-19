class EmbeddedDocstringFixture:
    """Human-facing summary that remains visible.

    @agent-context history
    This regression records an earlier failure.
    Keep the context without hiding the docstring summary.
    """

    def run(self) -> int:
        return 1
