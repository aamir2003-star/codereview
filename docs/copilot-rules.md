# Rules — AI-Powered Code Review Copilot

Conventions to follow while building, so the codebase stays consistent whether you're heads-down for an hour or picking it back up after a week.

## 1. Project Structure Rules
- Backend follows strict layering: `routes` never contain business logic — they call a `controller`, which calls a `service`. Services never touch `req`/`res` directly, so they stay testable and reusable (e.g., the Gemini service can be reused for both a manual review trigger and a future "re-review this file" endpoint).
- One Mongoose model per file, named singular (`Comment.js`, not `Comments.js`).
- Frontend: colocate a page's components under `/app/review/[id]/_components/` rather than one giant shared `/components` dump — split out only when something is truly reused across pages.

## 2. Naming Conventions
- REST routes: plural nouns, kebab-case (`/repos`, `/review` is singular intentionally since it represents "trigger one review action" — but the fetch route `/review/:id` is fine as-is; don't over-rotate on this, consistency matters more than the "perfect" name).
- Socket events: `noun:verb` past-tense for things that already happened (`comment:new`, `review:complete`), present-tense imperative for client→server requests (`join:review`).
- Env vars: `SCREAMING_SNAKE_CASE`, always documented in `.env.example`.

## 3. Auth & Security Rules
- Never store a raw GitHub access token — encrypt before writing to MongoDB, decrypt only when making a GitHub API call.
- JWT secret and encryption key are never committed, ever — verify `.env` is in `.gitignore` before the first commit, not after.
- Every route except `/auth/*` requires a valid JWT — enforce via middleware applied at the router level, not per-route, so it's impossible to forget on a new route.
- Rate-limit `/review` (POST) specifically — this is the expensive endpoint (Gemini calls cost money and take time); a basic in-memory rate limiter (e.g., max 5 review triggers per user per 10 minutes) is enough for v1.

## 4. Gemini Integration Rules
- Always request strict JSON, always parse defensively (try/catch, strip stray markdown fences if the model adds them anyway).
- Never send an entire PR's diff in one call once a PR exceeds ~10 changed files — cap and note it as a known limit rather than letting a call silently fail on a token limit.
- Log the raw Gemini response on parse failure (to server logs, not to the client) — you'll need this for debugging prompt issues.
- Keep the prompt template in one place (`/services/gemini.service.js` or a dedicated `/prompts` file) — don't inline prompt strings across multiple call sites.

## 5. Socket.io Rules
- A client only ever joins the room for the review it's currently viewing — leave the previous room on navigation/unmount to avoid stale broadcasts piling up on an idle client.
- The server is always the source of truth: a comment is persisted to MongoDB *before* it's emitted, never the reverse. This guarantees a client that reconnects mid-stream can catch up via `GET /review/:id`.
- Never trust a socket payload as-is for anything that mutates data (resolve/upvote) — re-verify the JWT and re-check the user has access to that review server-side, same as you would on an HTTP route.

## 6. Error Handling Rules
- Every service function that calls an external API (GitHub, Gemini) wraps the call and throws a typed error (`GitHubApiError`, `GeminiApiError`) rather than letting a raw axios/fetch error bubble up — makes the global error handler's job predictable.
- A failed file-level Gemini call marks that file `error` in the review and continues to the next file — one bad file must never abort the whole review.
- User-facing error messages are generic ("Couldn't fetch this PR's files — try again"); detailed errors go to server logs only.

## 7. Git & Commit Rules
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`) — makes it trivial to generate a changelog later and reads well on your GitHub profile.
- Feature branches per milestone from `tasks.md` (e.g., `feat/github-oauth`, `feat/review-streaming`) — small, reviewable-sized commits even though you're solo; it's a habit worth having on your record.
- No secrets, tokens, or `.env` files in any commit — double-check before every push, not just the first one.

## 8. Testing Bar (pragmatic, not exhaustive — this is a portfolio project, not a production system)
- Unit test the Gemini response parser specifically (it's the flakiest part — malformed JSON, markdown fences, empty arrays) since bugs there are silent and hard to spot visually.
- Manually test the multi-client real-time flow (two browser tabs/windows) before considering the streaming milestone "done" — this is the feature that's easy to get wrong without noticing in a single-tab test.
