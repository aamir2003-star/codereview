# Architecture — AI-Powered Code Review Copilot

## 1. System Overview

```
┌─────────────────┐        HTTPS/REST         ┌──────────────────┐
│  Next.js Client   │ ────────────────────────▶ │  Express API      │
│  (React, Tailwind)│ ◀──────────────────────── │  (Node.js)        │
└─────────┬────────┘        WebSocket           └─────────┬────────┘
          │                                                │
          │  Socket.io (bidirectional)                     │
          └────────────────────────────────────────────────┘
                                                             │
                          ┌──────────────────────────────────┼───────────────────┐
                          ▼                                  ▼                    ▼
                  ┌───────────────┐               ┌──────────────────┐  ┌────────────────┐
                  │   MongoDB      │               │   Gemini API      │  │  GitHub API     │
                  │ (users, repos, │               │ (per-file review   │  │ (OAuth, PR       │
                  │  reviews,      │               │  generation)        │  │  diffs)          │
                  │  comments)     │               └──────────────────┘  └────────────────┘
                  └───────────────┘
```

## 2. Component Breakdown

### 2.1 Frontend (Next.js)
- **Auth pages:** `/login` → redirects to GitHub OAuth
- **Repo/PR selection:** `/dashboard` → list repos → list open PRs per repo
- **Review view:** `/review/[id]` → diff panel + live comment stream + resolve/upvote controls
- Client connects to Socket.io on mount of the review view, joins the `review:{id}` room, and tears down the socket connection on unmount.
- State: React Query (or SWR) for REST data (repos, PR list, historical review), local component state + socket event handlers for live comment stream (don't try to force sockets through a global store initially — keep it simple).

### 2.2 Backend (Express)
Layered structure:
```
/src
  /routes        → route definitions only, thin
  /controllers    → request handling, validation
  /services       → business logic (github.service, gemini.service, review.service)
  /models          → Mongoose schemas
  /sockets         → socket.io event handlers, room management
  /middleware      → auth (JWT verify), error handler, rate limiter
  /config           → env, db connection, gemini client init
```

### 2.3 Realtime Layer (Socket.io)
- One room per review: `review:{reviewId}`.
- Server is the single source of truth — comments are written to MongoDB *before* being emitted, so a client that joins mid-stream can `GET /review/:id` and immediately get everything emitted so far, no missed events.
- Socket.io server attaches to the same HTTP server instance as Express (no separate port).

### 2.4 AI Integration (Gemini)
- One request per changed file in the PR, not one request for the whole diff — keeps latency per-chunk low and avoids hitting context limits on large PRs.
- Requests are fired with limited concurrency (e.g., 3 at a time via a small queue) rather than all at once, to avoid rate-limit errors and to keep the stream feeling steady rather than bursty.
- Each response is parsed as strict JSON; a parse failure is logged and that file is marked `error` in the review rather than aborting the whole review.

### 2.5 External APIs
- **GitHub REST API:** OAuth token exchange, repo listing, PR listing, PR file diffs (`/repos/{owner}/{repo}/pulls/{pr}/files`).
- **Gemini API:** structured JSON review generation per file diff.

## 3. Data Flow — "Trigger a Review"

1. Client: `POST /review { prUrl }`
2. Controller creates a `Review` doc (`status: pending`), returns `reviewId` immediately (don't block the HTTP response on the AI calls).
3. Controller kicks off an async job (in-process is fine for v1 — no queue infra needed yet):
   a. Fetch PR files from GitHub.
   b. For each file, call Gemini service → parse → save `Comment` → `io.to('review:'+id).emit('comment:new', comment)`.
4. Client has already joined the socket room (from step 1's response) and receives comments as they land.
5. On completion: `review:complete` emitted, `Review.status = 'done'`.

## 4. Auth Flow
1. `GET /auth/github` → redirect to GitHub OAuth consent screen.
2. `GET /auth/github/callback?code=...` → exchange code for GitHub access token → upsert `User` (encrypt token before storing) → issue app JWT (short-lived access + refresh pattern, same as your Writen project) → redirect to frontend with token.
3. All subsequent API calls: `Authorization: Bearer <jwt>`.
4. Socket.io auth: pass JWT in the connection handshake (`auth: { token }`), verify in a Socket.io middleware before allowing `join:review`.

## 5. Deployment Shape (portfolio-scale)
- Single VPS or platform-as-a-service (Render/Railway) for backend + MongoDB Atlas for DB.
- Frontend on Vercel.
- Environment variables: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GEMINI_API_KEY`, `JWT_SECRET`, `MONGODB_URI`, `ENCRYPTION_KEY` (for token-at-rest encryption).

## 6. Scaling Notes (not needed for v1, good to mention in interviews)
- Socket.io rooms are in-memory per server instance — fine for a single instance; would need the Redis adapter for multi-instance deployment.
- The in-process "fire Gemini calls on request" approach works for a portfolio demo; a real product would move this to a job queue (BullMQ) so a server restart doesn't lose in-flight reviews.
