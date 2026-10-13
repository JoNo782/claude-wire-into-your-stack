# Notes: wiring Claude into this repo

What was added, and why. Everything lives in the repo, so it reaches every teammate who clones it.

## 1. MCP server — `.mcp.json` + `.claude/settings.json`

**Choice:** the official filesystem server (`@modelcontextprotocol/server-filesystem`), project scope, launched through `cmd /c npx -y …` because `npx` is a `.cmd` shim on Windows.

**Why:** credential-free, so it can be committed and works for anyone who clones. It is pointed at `./docs`, the one folder Claude is meant to maintain.

**Scoping:**
- `permissions.allow` pre-approves only `read_text_file`, `list_directory`, `search_files`, `write_file` and `edit_file`. Everything else (`move_file`, `create_directory`, …) still asks.
- **Finding:** the server's allowed directory is *not* `./docs`. Claude Code announces the project root as an MCP root, and the server prefers client roots over its CLI arguments, so `list_allowed_directories` reports the whole repo. The argument alone is therefore not a boundary.
- **Fix:** a `PreToolUse` hook (`.claude/hooks/docs-only-writes.js`) matches `mcp__filesystem__(write_file|edit_file)` and blocks any target that resolves outside `docs/`. It fails closed: unparseable input is blocked too.
- **Verified in a live session:** a `write_file` to `hook-probe.txt` in the repo root was blocked with the hook's message and no file was created; a `write_file` to `docs/hook-probe.md` went through. The probe file was removed afterwards.
- **Known gap:** `move_file` and `create_directory` are not matched by the hook. They are not pre-approved, so they prompt, but the prompt is the only guard.

**Honest assessment:** in Claude Code this server largely duplicates the built-in Read/Edit/Write tools. It is here to demonstrate project-scoped MCP, permissions and hooks working together. A server that adds a capability Claude lacks (fetch, library docs) would be the more useful choice for real work.

## 2. Skill — `.claude/skills/add-api-endpoint/SKILL.md`

**Choice:** the one flow this project repeats: adding or changing an endpoint. It always touches the same five places: `db/store.js`, `routes/<resource>.js`, mounting in `server.js`, `tests/`, and `docs/api.md`.

**Why:** the conventions in `CLAUDE.md` (400/404, `{ "error": … }`, all data via the store) are easy to apply partially. The skill turns them into an ordered checklist that ends with `npm test` and `npm run lint`.

**Description:** names the trigger (add or change an HTTP endpoint or resource) and excludes tooling, CI and README work, so it fires on API work and nothing else.

**Verified:** asked "Vi behöver kunna ta bort en användare. Lägg till stöd för att radera en user via API:t." without naming the skill. It triggered, and all five places were touched. The result was thrown away on a scratch branch; this branch only carries the wiring.

**Judgement call:** the skill says "otherwise 200", so a delete returns the removed record with 200 rather than 204. Change that line if the team prefers 204.

## 3. Command — `.claude/commands/check.md`

**Choice:** `/check`, which runs `npm test` and `npm run lint` and summarizes failures with a verdict on whether the tree is safe to commit.

**Why:** it is the thing run before every commit, so it earns a short name. It is also deliberately different from the skill: the skill is something Claude picks up on its own, the command is something a person invokes.

**Scoping:** `allowed-tools` limits it to `npm test`, `npm run lint`, Read and Grep, and the prompt says not to modify files. Anything after `/check` is passed through as `$ARGUMENTS` for extra instructions.

## 4. Hook — `.claude/hooks/lint-on-edit.js`

**Choice:** a `PostToolUse` hook on `Edit|Write` that lints every JS file Claude touches inside `server.js`, `routes/`, `db/` and `tests/` (the same scope as `npm run lint`) with the project's own ESLint config.

**Why:** "lint passes" is a standard the project already has, and it is cheap to forget. A hook makes it hold every time, regardless of what was asked or which tool wrote the file. It is separate from the docs-only hook in section 1, which only guards the MCP server.

**Behaviour:** on failure it exits 2 and the lint output goes back to Claude, which fixes the file in the same turn. Non-JS files and files outside the linted folders are ignored. If `node_modules` is missing it does nothing rather than blocking.

**Choices to know about:**
- It runs with `--max-warnings 0`, which is stricter than `npm run lint` (that exits 0 on warnings). The repo is warning-clean today, and an unused variable is exactly the kind of drift the hook should catch. Drop the flag to match CI.
- It runs after the write, so the bad file does exist on disk until Claude fixes it. A `PreToolUse` hook cannot lint content that has not been written yet.

**Verified:**
- Directly: a file with an unused variable exits 2, a clean file and a non-JS file exit 0.
- In a live session: writing `tests/lint-probe.js` with `const unused = 1;` fired the hook and returned the lint output. The probe was removed afterwards.
- **Bug caught on the way:** the first version resolved ESLint with `require.resolve("eslint/bin/eslint.js")`, which ESLint's `exports` map rejects. The `catch` treated that as "not installed" and the hook silently never linted. It now addresses the binary by path. Lesson: a hook that fails open needs a test that proves it can fail closed.

## 5. Headless run — _not done yet_
