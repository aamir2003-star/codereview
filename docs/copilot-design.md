# Design — AI-Powered Code Review Copilot

## 1. Design Principles
- **Progressive, not blocking.** The whole point of the streaming architecture is that the UI should visibly reflect it — comments appearing file-by-file, not a spinner followed by a wall of text.
- **Diff-first.** The code diff is the primary content; comments are annotations on it, not a separate list competing for attention.
- **Low-friction collaboration.** Resolving/upvoting should be a single click, visible instantly to anyone else in the room — no page refresh, no "save" button.

## 2. Screens

### 2.1 Login
- Single centered card: app name, one-line pitch, "Continue with GitHub" button. Nothing else — this screen should take five seconds to get through.

### 2.2 Dashboard (`/dashboard`)
- Left: list of connected repos (avatar, repo name, last-reviewed timestamp if any).
- Selecting a repo shows its open PRs on the right: PR title, author, "X files changed," and either "Start Review" (new) or "View Review" (already reviewed) as the primary action per row.

### 2.3 Review View (`/review/[id]`) — the core screen
Two-pane layout:
- **Left pane (60%):** file tree at top (collapsed by default, changed files only) → selected file's diff below, syntax-highlighted, with inline comment markers on the exact lines Gemini flagged.
- **Right pane (40%):** live comment feed, newest at top, each card showing: severity badge (color-coded — see below), file:line reference, message, upvote count, resolve toggle, and who resolved it if applicable.
- **Top bar:** review status indicator — "Streaming… (3/7 files)" while in progress, "Review complete" with total comment count when done. This is the one piece of UI that most clearly communicates "this is happening live."
- Presence indicator (small avatar stack, top-right): who else is currently viewing this review — reinforces the collaborative angle without needing a demo partner to prove it works (even solo, seeing "1 viewer: you" confirms the plumbing is real).

## 3. Severity Color Coding
| Severity | Color | Use |
|---|---|---|
| `security` | Red | Vulnerabilities, injection risks, exposed secrets |
| `bug` | Orange | Logic errors, likely runtime failures |
| `smell` | Yellow | Maintainability, anti-patterns, unclear naming |
| `nit` | Gray/blue | Style, minor suggestions |

Keep this palette consistent between the diff inline markers and the comment feed cards — a user should be able to scan the file tree and immediately see "this file has a red marker" before opening it.

## 4. Component Inventory (frontend)
```
<RepoList />
<PrList />
<DiffViewer />              -- wraps react-diff-view / shiki
<CommentMarker />            -- inline gutter icon on a diff line
<CommentFeed />
<CommentCard />               -- severity badge, message, upvote/resolve controls
<ReviewStatusBar />           -- streaming progress / complete state
<PresenceIndicator />
```

## 5. Empty & Edge States (don't skip these — they're what make a demo feel finished)
- No repos connected yet → prompt to install/authorize the GitHub App or grant repo access.
- PR with zero flagged issues → a clear "No issues found — looks good" state, not a blank pane that looks broken.
- A file Gemini failed to parse → show it in the feed as a distinct "Couldn't review this file" card rather than silently dropping it.
- Reconnecting mid-stream (e.g., refresh during an active review) → `GET /review/:id` should render everything emitted so far immediately, then resume live updates.

## 6. Visual Style
- Dark-mode-first (this is a dev tool; your users live in dark-mode editors) with a light-mode toggle as a stretch goal, not a v1 requirement.
- Monospace font for all diff/code content; a clean sans-serif (Inter or similar) for UI chrome — don't mix code and UI type unnecessarily.
- Keep the palette restrained outside of severity badges — let the red/orange/yellow/blue severity colors be the only saturated colors on the screen so they actually draw the eye.

## 7. Motion / Feedback
- New comments entering the feed: a brief fade/slide-in (150–200ms) — enough to draw the eye to "something just happened" without feeling gimmicky.
- Resolve toggle: instant optimistic UI update on the clicking client, reconciled by the server broadcast (don't wait for the round-trip to flip the checkbox locally).
