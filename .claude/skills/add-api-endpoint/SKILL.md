---
name: add-api-endpoint
description: Use when adding or changing an HTTP endpoint or resource in this Express API (e.g. "add a DELETE /users/:id", "add a /posts route", "add a field to PUT /users"). Covers the full flow - store helper, route with validation, mounting in server.js, tests, and docs/api.md. Not for non-API work such as tooling, CI, or README edits.
---

# Add or change an API endpoint

Every endpoint in this project touches the same five places. Do all of them, in this order.

## 1. Data access — `db/store.js`
- Routes never hold state. Add a helper to `db/store.js` and export it.
- Helpers return the record, or `undefined` when it does not exist (the route turns that into a 404).
- If the resource is new, seed it in `seed()` so `store.reset()` restores it for tests.

## 2. Route — `routes/<resource>.js`
- One file per resource, exporting an Express router. Start from `routes/users.js`.
- Parse ids with `Number(req.params.id)`.
- Validate input in the route and `return` early:
  - bad or missing input → `400`
  - record not found → `404`
  - created → `201`; otherwise `200`
- Every error response is JSON: `{ "error": "message" }`. No other shape.
- Keep the `// METHOD /path — what it does.` comment above each handler.

## 3. Mount — `server.js`
- A new resource file must be mounted under its base path: `app.use('/<resource>', <resource>Router);`
- Adding a handler to an existing router needs no change here.

## 4. Tests — `tests/<resource>.test.js`
- Node's built-in runner (`node:test`) with `node:assert` and `supertest` against the app exported from `server.js`.
- `test.beforeEach(() => store.reset());` so each test starts from the seed data.
- Cover the success case and each error path (`400`, `404`) the handler can return.

## 5. Docs — `docs/api.md`
- Add or update the endpoint entry: method, path, request body, and every status code it can return.

## Finish
Run `npm test` and `npm run lint`. Both must pass before the work is done.
