// PreToolUse hook: the filesystem MCP server may only write inside docs/.
// Blocks (exit 2) any write_file / edit_file whose target resolves outside it.
const path = require("path");

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw || "{}");
  } catch {
    console.error("Blocked: could not parse hook input.");
    process.exit(2);
  }
  const target = input.tool_input && input.tool_input.path;
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const docs = path.resolve(root, "docs");

  if (!target) {
    console.error("Blocked: no path given to the filesystem write tool.");
    process.exit(2);
  }

  const resolved = path.resolve(root, target);
  const rel = path.relative(docs, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    console.error(`Blocked: the filesystem server may only write inside docs/ (got ${target}).`);
    process.exit(2);
  }
});
