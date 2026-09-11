import { parseAgentContext } from "@agent-context/core";

function scanGitHubPage(): void {
  const source = document.body.innerText;
  const annotations = parseAgentContext(source);

  // Placeholder integration: prove shared parsing works in the content script.
  // Replace this with GitHub DOM-to-line mapping and subtle decorations/popovers.
  if (annotations.length > 0) {
    console.debug("[agent-context] annotations", annotations);
  }
}

scanGitHubPage();

const observer = new MutationObserver(() => scanGitHubPage());
observer.observe(document.body, { childList: true, subtree: true });
