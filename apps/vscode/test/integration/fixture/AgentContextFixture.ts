class AgentContextFixture {
  /* @agent-context invariant
   * This annotation must remain independently filterable from the method and class folds.
   */
  run(): number {
    if (Date.now() > 0) {
      return 1;
    }
    return 0;
  }

  /* @agent-context history
   * Keep this second annotation independent so selective filtering is observable.
   */
  previousResult(): number {
    return 1;
  }
}

export { AgentContextFixture };
