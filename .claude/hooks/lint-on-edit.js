// PostToolUse hook: lint any JS file Claude just wrote or edited, using the
// project's own ESLint config. On failure exit 2, which hands the lint output
// back to Claude so it fixes the problem in the same turn.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// Same scope as `npm run lint`.
const LINTED = ["server.js", "routes", "db", "tests"];

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw || "{}");
  } catch {
    process.exit(0);
  }
  const file = input.tool_input && input.tool_input.file_path;
  if (!file || path.extname(file) !== ".js") process.exit(0);

  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const rel = path.relative(root, path.resolve(root, file));
  const top = rel.split(path.sep)[0];
  if (rel.startsWith("..") || !LINTED.includes(top)) process.exit(0);

  // eslint's package "exports" hide bin/, so address the binary by path.
  const eslint = path.join(root, "node_modules", "eslint", "bin", "eslint.js");
  if (!fs.existsSync(eslint)) process.exit(0); // dependencies not installed

  const result = spawnSync(process.execPath, [eslint, "--no-warn-ignored", "--max-warnings", "0", rel], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(`ESLint failed for ${rel}. Fix these before continuing:\n${result.stdout}${result.stderr}`);
    process.exit(2);
  }
});
