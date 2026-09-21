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
- [ ] `GET /repos` — list user's GitHub repos via stored token
- [ ] `GET /repos/:owner/:repo/prs` — list open PRs
- [ ] `GET /repos/:owner/:repo/prs/:number/diff` — fetch file diffs
- [ ] Frontend: dashboard page listing repos → PRs
- [ ] Frontend: diff viewer rendering a PR's files (static, no comments)
- [ ] Manual test: pick a real PR from your own GitHub, confirm diff renders correctly

## Milestone 3 — Single-Shot Gemini Review (no streaming, no DB persistence yet)
- [ ] Gemini service: send one file's diff, prompt for strict JSON array output
- [ ] Defensive JSON parsing (strip fences, try/catch, log raw response on failure)
- [ ] Wire a manual "Review this file" button → call → render comments inline on the diff (in-memory, not persisted)
- [ ] Manual test: verify comments land on the correct line numbers

## Milestone 4 — MongoDB Persistence
- [ ] `Review` and `Comment` Mongoose schemas
- [ ] `POST /review` — create a Review doc, return `reviewId`
- [ ] `GET /review/:id` — fetch a review + its comments
- [ ] Wire the review-trigger flow to persist comments as they're generated
- [ ] Manual test: trigger a review, refresh the page, confirm comments reload from DB

## Milestone 5 — Socket.io Streaming
- [ ] Socket.io server attached to the Express HTTP server
- [ ] Socket auth middleware (verify JWT on connection handshake)
- [ ] `join:review` room logic
- [ ] Backend: loop through PR files, call Gemini per file with limited concurrency, save + emit `comment:new` as each resolves
- [ ] `review:complete` emitted when all files done
- [ ] Frontend: connect socket on review view mount, join room, render comments as they arrive
- [ ] Manual test: two browser tabs open on the same review — confirm both receive comments live

## Milestone 6 — Resolve / Upvote (Live Sync)
- [ ] `PATCH /comments/:id/resolve`, `PATCH /comments/:id/upvote`
- [ ] Emit `comment:resolved` / `comment:upvoted` to the room on change
- [ ] Frontend: resolve toggle + upvote button, optimistic local update
- [ ] Manual test: two tabs, resolve in one, confirm it updates instantly in the other

## Milestone 7 — Polish
- [ ] Severity color-coding (badges + inline diff markers)
- [ ] Empty states: no repos, zero-issue PR, failed-to-parse file
- [ ] Review status bar ("Streaming… 3/7 files" → "Complete")
- [ ] Presence indicator (who's viewing this review)
- [ ] Rate limiting on `POST /review`
- [ ] README with setup instructions, screenshots/GIF of the live streaming in action

## Stretch Goals (only after everything above is solid)
- [ ] Post comments back to GitHub as real PR review comments
- [ ] Per-comment "ask AI to explain" follow-up chat
- [ ] Repo-wide review history/trends view

## Definition of Done (per milestone)
A milestone isn't done until: it works end-to-end manually, there are no secrets committed, and the relevant section of `architecture.md`/`rules.md` still accurately describes what you built (update the docs if you deviated).
