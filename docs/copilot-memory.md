# Memory — AI-Powered Code Review Copilot

Purpose: a single reference file to paste into a new AI coding session (Claude Code or similar) so it has full context without re-explaining the project from scratch. Keep this updated as decisions change — treat it as living project context, not a one-time snapshot.

## What this project is
A collaborative code review tool. User connects GitHub, opens a PR, Gemini generates structured review comments (bug/security/smell/nit) that stream into the UI file-by-file via Socket.io. Multiple reviewers can be in the same review session and see comments, resolves, and upvotes live.

## Companion documents
- `copilot-architecture.md` — system design, data flow, component breakdown
- `copilot-rules.md` — coding conventions, security rules, error-handling patterns
- `copilot-design.md` — UI/UX spec, screens, component inventory, visual style
- `copilot-tasks.md` — milestone checklist, current build order
Always check `copilot-tasks.md` first to know what's actually been built vs. still planned — this memory file describes the target state, not necessarily current progress.

## Tech stack (fixed decisions — don't relitigate these mid-build)
- Frontend: Next.js, React, Tailwind, react-diff-view (or Shiki) for diffs
- Backend: Node.js, Express
- Auth: GitHub OAuth → app-issued JWT
- Realtime: Socket.io (single room per review, `review:{id}`)
- DB: MongoDB (Mongoose)
- AI: Gemini API, structured JSON output, one call per changed file

## Key architectural decisions and why
- **Per-file Gemini calls, not whole-PR-in-one-call:** avoids token limits, gives faster/more granular streaming, isolates failures to one file instead of the whole review.
- **Server persists before it emits:** a Comment is saved to MongoDB before the `comment:new` socket event fires, so a client that joins/reconnects mid-review can always catch up via `GET /review/:id` with no missed data.
- **No job queue in v1:** the review-trigger flow runs in-process on the Express server. This is a known simplification — fine for a portfolio project's scale, would move to BullMQ or similar for production.
- **JWT, not session cookies:** consistent with the pattern already used in the Writen project background, and simpler to pass through Socket.io's handshake auth.

## Non-negotiable rules (see `copilot-rules.md` for full list)
- Never store a raw GitHub access token — always encrypt before persisting.
- Every Gemini response is parsed defensively; a bad file marks itself `error` and the review continues.
- A socket event that mutates data (resolve/upvote) always re-verifies auth server-side — never trust the payload.

## Current known limitations (intentional, not bugs)
- Large PRs (many changed files) aren't paginated/capped yet — treat as a known v1 gap, not something to silently "fix" without updating the PRD.
- No GitHub-comment-posting integration yet — reviews are app-only, not pushed back to the actual PR.
- Single-server Socket.io — no Redis adapter, so this won't horizontally scale past one instance as-is.

## Open questions / not yet decided
- Whether upvotes are per-user-toggle (can un-upvote) or one-way — lean toward toggle for consistency with resolve, but not locked in.
- Whether to cap Gemini concurrency at 3 or make it configurable via env var — start hardcoded, revisit if rate limits become an issue.

## How to use this file with an AI assistant
When starting a new session to work on this project, paste this file plus whichever of the four companion docs is relevant to the task at hand (e.g., `copilot-tasks.md` + the specific milestone section of `copilot-architecture.md` if you're implementing streaming). Update this file's "Current known limitations" and "Open questions" sections whenever a milestone closes something out or opens something new — that's the part most likely to drift from reality if left unmaintained.
