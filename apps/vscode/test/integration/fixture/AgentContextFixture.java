final class AgentContextFixture {
    /* @agent-context invariant
     * Native Java comment, method, and class folds must coexist with HumanEye.
     */
    int run() {
        if (System.nanoTime() > 0) {
            return 1;
        }
        return 0;
    }
}
