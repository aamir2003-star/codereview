# Tasks — AI-Powered Code Review Copilot

Checklist form, grouped by milestone (matches the PRD's build order). Check items off as you go — this file is meant to be edited, not just read.

## Milestone 0 — Project Setup
- [x] Init Next.js frontend + Express backend as separate folders (monorepo-style, no need for a formal monorepo tool — just two folders and a root README)
- [x] Set up MongoDB (local or Atlas free tier)
- [x] `.env.example` for both frontend and backend, `.env` gitignored
- [x] Basic Express server with health-check route (`GET /health`)
- [x] ESLint + Prettier config shared across both

## Milestone 1 — GitHub OAuth + JWT Auth
- [x] Register a GitHub OAuth App (get client ID/secret)
- [x] `GET /auth/github` → redirect to GitHub consent screen
- [x] `GET /auth/github/callback` → exchange code, upsert User, encrypt+store access token
- [x] Issue JWT, redirect to frontend with token
- [x] Auth middleware: verify JWT on protected routes
- [x] Frontend: login page, token storage, protected route wrapper
- [x] Manual test: full login round-trip works end to end

## Milestone 2 — Repo/PR Listing + Raw Diff (no AI yet)
- [x] `GET /repos` — list user's GitHub repos via stored token
- [x] `GET /repos/:owner/:repo/prs` — list open PRs
- [x] `GET /repos/:owner/:repo/prs/:number/diff` — fetch file diffs
- [x] Frontend: dashboard page listing repos → PRs
- [x] Frontend: diff viewer rendering a PR's files (static, no comments)
- [x] Manual test: pick a real PR from your own GitHub, confirm diff renders correctly

## Milestone 3 — Single-Shot Gemini Review (no streaming, no DB persistence yet)
- [x] Gemini service: send one file's diff, prompt for strict JSON array output
- [x] Defensive JSON parsing (strip fences, try/catch, log raw response on failure)
- [x] Wire a manual "Review this file" button → call → render comments inline on the diff (in-memory, not persisted)
- [x] Manual test: verify comments land on the correct line numbers

## Milestone 4 — MongoDB Persistence
- [x] `Review` and `Comment` Mongoose schemas
- [x] `POST /review` — create a Review doc, return `reviewId`
- [x] `GET /review/:id` — fetch a review + its comments
- [x] Wire the review-trigger flow to persist comments as they're generated
- [x] Manual test: trigger a review, refresh the page, confirm comments reload from DB

## Milestone 5 — Socket.io Streaming
- [x] Socket.io server attached to the Express HTTP server
- [x] Socket auth middleware (verify JWT on connection handshake)
- [x] `join:review` room logic
- [x] Backend: loop through PR files, call Gemini per file with limited concurrency, save + emit `comment:new` as each resolves
- [x] `review:complete` emitted when all files done
- [x] Frontend: connect socket on review view mount, join room, render comments as they arrive
- [x] Manual test: two browser tabs open on the same review — confirm both receive comments live

## Milestone 6 — Resolve / Upvote (Live Sync)
- [x] `PATCH /comments/:id/resolve`, `PATCH /comments/:id/upvote`
- [x] Emit `comment:resolved` / `comment:upvoted` to the room on change
- [x] Frontend: resolve toggle + upvote button, optimistic local update
- [x] Manual test: two tabs, resolve in one, confirm it updates instantly in the other

## Milestone 7 — Polish
- [x] Severity color-coding (badges + inline diff markers)
- [x] Empty states: no repos, zero-issue PR, failed-to-parse file
- [x] Review status bar ("Streaming… 3/7 files" → "Complete")
- [x] Presence indicator (who's viewing this review)
- [x] Rate limiting on `POST /review`
- [x] README with setup instructions, screenshots/GIF of the live streaming in action

## Milestone 8 — Mobile & Tablet Responsive Architecture
- [x] Master-detail responsive navigation on mobile screens (`< 768px`) with back arrow navigation
- [x] Collapsible slide-out drawer for file navigation with backdrop overlay
- [x] Horizontally scrollable full file paths without truncation (`.no-scrollbar`)
- [x] Auto-scrolling to the first relevant review comment upon file selection

## Milestone 9 — Security Hardening & Vulnerability Remediation
- [x] Broken Object Level Authorization (BOLA/IDOR) protection: all reviews, comments, and reports scoped by `requestedBy: req.user.userId`
- [x] Tiered rate limiting (`globalLimiter` at 300/15m, `reviewLimiter` at 30/10m, `authLimiter` at 60/15m)
- [x] Server-Side Request Forgery (SSRF) guardrails on webhook dispatch blocking private, loopback, and cloud metadata IPs
- [x] Production CORS origin whitelisting in Express server
- [x] HttpOnly `auth_token` cookie management with multi-candidate verification

## Milestone 10 — Clean PR & 0-Defect Audit Verification
- [x] Affirmative clean audit status indicators across Top Header, Tab Badge, and Sidebar file tree
- [x] Visual "AST & Syntax Passed / OWASP Security Clean" verification banner in diff viewer
- [x] "Post Approval to GitHub" one-click action to sync clean audit status to GitHub PRs
- [x] Clean audit summary section included in GitHub review markdown

## Milestone 11 — Socket.io Reliability & Direct WebSocket Transport
- [x] Direct WebSocket transport (`transports: ['websocket']`) to eliminate HTTP polling upgrade timeouts
- [x] Server-side ping and connection timeouts (`pingTimeout: 30000`, `pingInterval: 15000`)
- [x] Instant first-pass polling sync (`pollSync()`) to eliminate initial render latency
- [x] Reconnection error throttling to prevent console pollution

## Milestone 12 — Real-Time Process Cancellation
- [x] Backend `activeReviewAborts` Map checked at 4 guard points inside the worker loop (post-Gemini call, pre-DB insert, pre-retry pass, pre-completion emit)
- [x] `POST /api/reviews/:id/stop` sets abort flag and emits `review:stopped` socket event
- [x] `X` close button in DiffViewer header calls `stopReview()` before unmounting (not just frontend close)
- [x] `review:stopped` socket event handler (`handleStopped`) in `useReviewSocket.ts` transitions UI to stopped state
- [x] Prevented phantom 100% completion events from reaching the frontend after stop

## Milestone 13 — Background Review Minimize Mode
- [x] `–` minimize button in DiffViewer header minimizes panel without stopping the review
- [x] Floating bottom-right widget appears with PR number, title, pulsing dot indicator, and status pill
- [x] Animated progress bar (left-to-right, no numbers) below PR title in floating widget
- [x] Background sync polling every 2.5s via `GET /api/reviews/:id` while minimized
- [x] "Open" button on widget restores the modal with all existing review state preserved
- [x] "Stop" button on widget calls `stopReview()` and dismisses the widget
- [x] Mobile initial page load fix: refreshing dashboard on small screens always shows repo list, not PR list

## Stretch Goals
- [x] Post comments back to GitHub as real PR review comments (`/review/:id/publish-github`)
- [ ] Per-comment "ask AI to explain" follow-up chat
- [ ] Repo-wide review history/trends view
- [ ] Background review conflict modal (show warning if user starts a new review while one is running in background)

## Definition of Done (per milestone)
A milestone isn't done until: it works end-to-end manually, there are no secrets committed, and the relevant section of `architecture.md`/`rules.md` still accurately describes what you built (update the docs if you deviated).
