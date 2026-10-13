---
description: Run the tests and linter and summarize what (if anything) is broken
allowed-tools: Bash(npm test:*), Bash(npm run lint:*), Read, Grep
---

Run the project's checks and report the result. Do not change any files.

1. Run `npm test`.
2. Run `npm run lint`.
3. Run both even if the first one fails, so the report covers everything.

Then reply in this shape:

- **Tests:** pass or fail, with the count (e.g. 7/7). For each failure give the test name, the assertion that failed, and the most likely cause in the source.
- **Lint:** clean, or each problem as `file:line — rule — what is wrong`.
- **Verdict:** one line saying whether this is safe to commit.

If everything passes, keep it to those three lines. $ARGUMENTS
