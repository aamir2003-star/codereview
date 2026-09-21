# PRD: AI-Powered Code Review Copilot

## 1. Overview
A collaborative, real-time code review tool. A user connects a GitHub repo, opens a pull request, and the app uses the Gemini API to generate structured review comments (bugs, security issues, code smells) that stream into the UI file-by-file. Multiple reviewers can join the same PR session, see comments appear live, and upvote/resolve them together.

**One-line pitch:** "GitHub PR reviews, but an AI does the first pass live, and your team resolves it together in real time."

## 2. Problem Statement
Manual code review is slow and inconsistent — reviewers miss things, and PRs sit waiting for a human to have time. Existing AI review bots (CodeRabbit, etc.) post a static comment dump with no collaboration layer. This project fills the gap: streaming AI feedback + a shared, live review session.

## 3. Target User
Solo devs and small teams who want faster first-pass reviews on their own repos. For the portfolio context: this is also the primary demo audience — recruiters/interviewers who understand what "real-time streaming AI review" actually solves.

## 4. Goals / Success Criteria
- A user can log in with GitHub, pick a repo, pick an open PR, and get categorized review comments within ~30–60 seconds of triggering a review.
- Comments appear progressively (per file) rather than all at once.
- A second browser tab/user can join the same review and see live updates (new comments, resolves, upvotes) without refreshing.
- Comments are persisted — reopening a reviewed PR shows prior results instantly.

## 5. Out of Scope (v1)
- Auto-posting comments back to GitHub as actual PR review comments (v2 feature).
- Multi-repo org-wide dashboards.
- Support for GitLab/Bitbucket.
- Video/voice in the review session.

## 6. Tech Stack
- **Frontend:** Next.js, React, Tailwind, `react-diff-view` (or Shiki) for diff rendering
- **Backend:** Node.js, Express
- **Auth:** GitHub OAuth → app-issued JWT
- **Realtime:** Socket.io
- **DB:** MongoDB
- **AI:** Gemini API (structured JSON output)

## 7. Data Model (MongoDB)

```
User
  _id
  githubId
  username
  avatarUrl
  accessToken        // encrypted at rest
  createdAt

Repo
  _id
  userId
  owner
  name
  installedAt

Review
  _id
  prUrl
  repoId
  requestedBy        // userId
  status              // 'pending' | 'streaming' | 'done' | 'error'
  createdAt

Comment
  _id
  reviewId
  filePath
  lineNumber
  severity            // 'bug' | 'security' | 'smell' | 'nit'
  message
  upvotes: [userId]
  resolved: Boolean
  resolvedBy
  createdAt
```

## 8. API Endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/auth/github` | Start GitHub OAuth flow |
| GET | `/auth/github/callback` | OAuth callback, issue JWT |
| GET | `/repos` | List user's GitHub repos |
| GET | `/repos/:owner/:repo/prs` | List open PRs for a repo |
| GET | `/repos/:owner/:repo/prs/:number/diff` | Fetch PR file diffs |
| POST | `/review` | Trigger a new review for a PR (kicks off Gemini streaming) |
| GET | `/review/:id` | Fetch a review + its persisted comments |
| PATCH | `/comments/:id/resolve` | Mark comment resolved |
| PATCH | `/comments/:id/upvote` | Toggle upvote on a comment |

## 9. Socket.io Events

| Event | Direction | Payload |
|---|---|---|
| `join:review` | client → server | `{ reviewId }` |
| `comment:new` | server → client | `{ comment }` |
| `comment:resolved` | bidirectional | `{ commentId, resolvedBy }` |
| `comment:upvoted` | bidirectional | `{ commentId, userId }` |
| `review:complete` | server → client | `{ reviewId, totalComments }` |
| `review:error` | server → client | `{ reviewId, message }` |

## 10. Core Flow
1. User logs in via GitHub OAuth → JWT issued and stored client-side.
2. User selects repo → selects open PR.
3. Backend fetches PR files via `GET /repos/{owner}/{repo}/pulls/{pr}/files`.
4. For each changed file, backend sends the diff hunk to Gemini with a prompt that forces a strict JSON array response: `[{ line, severity, message }]`.
5. As each file's Gemini call resolves, the comment is saved to MongoDB and emitted via `comment:new` to everyone in that review's Socket.io room.
6. Reviewers upvote/resolve comments — synced live to all connected clients.
7. `review:complete` fires once all files are processed.

## 11. Gemini Prompt Design Notes
- Send one file's diff hunk per call (not the whole PR) — faster responses, avoids context/token issues.
- System prompt must explicitly demand: "Respond ONLY with a valid JSON array, no markdown fences, no prose."
- Parse defensively — strip code fences if present anyway, wrap in try/catch, and mark the review `error` status on parse failure rather than crashing the stream.

## 12. Milestones / Build Order
1. **Week 1:** GitHub OAuth + JWT auth; repo + PR listing; render a raw diff with no AI.
2. **Week 1–2:** Single-shot Gemini call on one file; render comments statically (no streaming, no DB yet).
3. **Week 2:** MongoDB persistence for reviews/comments; reload a review from DB.
4. **Week 2:** Socket.io streaming — comments appear per-file as Gemini responds.
5. **Week 3:** Resolve/upvote with live sync across clients.
6. **Week 3:** Polish — severity color-coding, diff syntax highlighting, empty/error states.

## 13. Risks
- GitHub API rate limits on unauthenticated/low-tier tokens — mitigate by using the authenticated user's OAuth token for requests.
- Gemini occasionally returning malformed JSON — needs a retry-once-then-fail-gracefully strategy.
- Large PRs (many files) — cap to first N files or paginate, note this as a known v1 limitation.

## 14. Future Enhancements (v2+)
- Post comments back to GitHub as real PR review comments via the GitHub API.
- Support inline "ask AI to explain this comment" follow-up chat per comment.
- Repo-wide review history / trends dashboard.
