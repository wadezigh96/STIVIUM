function getAgentCatalog(){
  if (typeof AGENTS !== "undefined" && Array.isArray(AGENTS)) return AGENTS;
  if (Array.isArray(window.AGENTS)) return window.AGENTS;
  return [];
}

// TEMPORARY: full file restore in progress - see commit on branch for ERC-8183 hire fix.
// This placeholder is intentionally minimal so the branch is not broken.
// Pull the real app.js from local commit 4dded7e or re-apply the hire fix.
console.error("[STIVIUM] app.js needs full restore. Run: git checkout 4dded7e -- app.js && git push");
