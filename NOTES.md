# Notes: wiring Claude into this repo

What was added, and why. Everything lives in the repo, so it reaches every teammate who clones it.

## 1. MCP server — `.mcp.json` + `.claude/settings.json`

**Choice:** the official filesystem server (`@modelcontextprotocol/server-filesystem`), project scope, launched through `cmd /c npx -y …` because `npx` is a `.cmd` shim on Windows.

**Why:** credential-free, so it can be committed and works for anyone who clones. It is pointed at `./docs`, the one folder Claude is meant to maintain.

**Scoping:**
- `permissions.allow` pre-approves only `read_text_file`, `list_directory`, `search_files`, `write_file` and `edit_file`. Everything else (`move_file`, `create_directory`, …) still asks.
- **Finding:** the server's allowed directory is *not* `./docs`. Claude Code announces the project root as an MCP root, and the server prefers client roots over its CLI arguments, so `list_allowed_directories` reports the whole repo. The argument alone is therefore not a boundary.
- **Fix:** a `PreToolUse` hook (`.claude/hooks/docs-only-writes.js`) matches `mcp__filesystem__(write_file|edit_file)` and blocks any target that resolves outside `docs/`. It fails closed: unparseable input is blocked too.
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

## 4. Hook — _see note_

The `PreToolUse` hook above enforces the docs-only write boundary. A separate "standard that must always hold" hook (for example lint or test on edit) is still to be decided.

## 5. Headless run — _not done yet_
