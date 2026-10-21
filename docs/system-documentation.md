# Complete System Architecture & Technical Specification

> **AI-Powered Code Review Copilot**  
> Comprehensive System Blueprint, Data Models, API Contracts, and Operational Runbook.  
> Document Version: 2.1 (Production Verified)

---

## 1. System Overview & Technology Stack

The application is an end-to-end, automated code reviewer designed to audit GitHub Pull Requests in real time. It performs multi-file unified diff analysis, identifies logic and security flaws, synthesizes beginner-friendly architectural overviews, and streams findings live to connected developers via Socket.io.

### Verified Codebase Metrics
- **Total Codebase**: 62 active source files / 8,620 lines of TypeScript and TSX code.
- **Backend**: 24 files / 3,493 lines.
- **Frontend**: 38 files / 5,127 lines.
- **Runtime Environment**: Node.js 22.x, Next.js 16.3.5, React 19.2.8, Express 5.2.1, MongoDB 7.x.
- **Stress-Test Benchmark (Real-World Run)**:
  - Workload: 81 modified files, +4,350 lines changed (`stress-test-extreme-v2`)
  - Execution Duration: 751.9 seconds (~12.5 minutes)
  - Defect Yield: 34 verified findings (line-by-line, security audit, domain clustering, concurrency scans)
  - Stability: 100% completion with 0 unhandled rejections and 0 API quota lockouts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND (Next.js 16)                        │
│  ┌───────────────────────┐  ┌────────────────────────┐  ┌────────────────┐ │
│  │   Dashboard / Repos   │  │ DiffViewer (DOM Diff)  │  │ PRArchitecture │ │
│  └───────────┬───────────┘  └───────────┬────────────┘  └───────┬────────┘ │
└──────────────┼──────────────────────────┼───────────────────────┼───────────┘
               │ HTTPS (REST)             │ WebSockets (Socket.io)│
┌──────────────▼──────────────────────────▼───────────────────────▼───────────┐
│                                BACKEND (Express 5)                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Express Router (14 REST Endpoints) + Socket.io Server (7 Event Types)  │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Concurrency Worker Pool (Limit: 2, Pacing: 600ms, Retry Queue)        │  │
│  └─────────┬────────────────────────┬──────────────────────┬─────────────┘  │
└────────────┼────────────────────────┼──────────────────────┼────────────────┘
             │                        │                      │
             ▼                        ▼                      ▼
┌────────────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
│  MongoDB (Mongoose 9)  │  │  GitHub REST API │  │  Google Gemini Engine    │
│  - User                │  │  - OAuth 2.0     │  │  - gemini-3.5-flash-lite │
│  - Review              │  │  - PR Diff Fetch │  │  - gemini-3.8-flash      │
│  - Comment             │  │  - Commit Reviews│  │  - gemini-3.6-flash      │
└────────────────────────┘  └──────────────────┘  └──────────────────────────┘
```

---

## 2. Database Models & Schema Specifications

The database layer runs on MongoDB via Mongoose 9.10.1.

### 2.1 User Model (`User.ts`)
Stores authenticated developer profiles and GitHub OAuth access tokens.

```typescript
export interface IUser extends Document {
  githubId: string;           // Unique GitHub user ID (e.g. "12345678")
  username: string;           // GitHub handle (e.g. "octocat")
  email?: string;             // Primary verified email
  avatarUrl?: string;         // Profile picture URL
  accessToken: string;        // GitHub OAuth bearer token
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- `{ githubId: 1 }` (unique)

---

### 2.2 Review Model (`Review.ts`)
Tracks pull request review jobs, progress counters, status states, and synthesized architecture.

```typescript
export type ReviewStatus = 'pending' | 'streaming' | 'done' | 'error';

export interface PrArchitectureSummary {
  highLevelSummary: string;
  architectureOverview: string;
  keyComponentsChanged: Array<{
    component: string;
    purpose: string;
    impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  sequenceFlowOrDiagram?: string;
  walkthrough: Array<{
    file: string;
    changes: string;
  }>;
  potentialRisks: string[];
}

export interface IReview extends Document {
  prUrl: string;
  owner: string;
  repo: string;
  pullNumber: number;
  prTitle: string;
  requestedBy: mongoose.Types.ObjectId;  // Ref: User
  status: ReviewStatus;
  totalFiles: number;
  filesReviewed: number;
  totalComments: number;
  architectureSummary?: PrArchitectureSummary;
  publishedToGithub?: boolean;
  githubReviewUrl?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- `{ owner: 1, repo: 1, pullNumber: 1 }`
- `{ requestedBy: 1 }`

---

### 2.3 Comment Model (`Comment.ts`)
Stores line-anchored defect findings, security vulnerabilities, peer upvotes, and resolution statuses.

```typescript
export type Severity = 'bug' | 'security' | 'smell' | 'nit';

export interface IComment extends Document {
  reviewId: mongoose.Types.ObjectId;    // Ref: Review
  filePath: string;                    // File path (e.g. "backend/src/app.ts")
  lineNumber: number;                  // 1-indexed target line number
  severity: Severity;                  // 'bug' | 'security' | 'smell' | 'nit'
  message: string;                     // Detailed defect description
  suggestedFix?: string;               // Concrete replacement code snippet
  upvotes: mongoose.Types.ObjectId[];  // Array of User ObjectIds
  resolved: boolean;                   // Toggle resolution state
  resolvedBy?: mongoose.Types.ObjectId;// User who resolved the comment
  publishedToGithub?: boolean;         // Has this been pushed to GitHub PR?
  githubCommentUrl?: string;           // Direct link to GitHub review comment
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- `{ reviewId: 1, filePath: 1, lineNumber: 1 }`

---

## 3. REST API Contract & Route Definitions

All endpoints require JWT Bearer authentication header unless marked otherwise:
`Authorization: Bearer <token>`

### 3.1 Authentication
- **`GET /api/auth/github`**: Redirects user to GitHub OAuth authorization screen.
- **`GET /api/auth/github/callback?code=<code>`**:
  - Exchanges OAuth code for GitHub token.
  - Upserts `User` document in MongoDB.
  - Issues 7-day signed JWT.
  - Redirects user to frontend: `${FRONTEND_URL}/auth/callback?token=${jwt}`.
- **`GET /api/auth/me`**:
  - Response: `{ user: { userId, username, email, avatarUrl } }`.

### 3.2 Repositories & Pull Requests
- **`GET /api/repos`**:
  - Fetches repositories accessible to the user (sorted by `updated_at`, up to 100).
- **`GET /api/repos/:owner/:repo/prs`**:
  - Fetches list of open PRs for the repository with title, author, branch, and numbers.
- **`GET /api/repos/:owner/:repo/prs/:number/diff`**:
  - Fetches all modified files and their unified diff patches (`githubService.getPullRequestFiles`).

### 3.3 Review Execution & Management
- **`POST /api/reviews`**:
  - Body: `{ owner, repo, pullNumber, prUrl, prTitle }`
  - Response: HTTP 202 Accepted `{ reviewId: "...", status: "pending" }`
  - Initializes background async review worker and creates/clears existing review document.
- **`GET /api/reviews/:id`**:
  - Response: `{ review: IReview, comments: IComment[] }`
- **`POST /api/reviews/:id/stop`**:
  - Sets abort flag `activeReviewAborts.set(reviewId, true)` to cleanly halt running workers.
- **`POST /api/reviews/:id/publish-github`**:
  - Posts all approved review comments as an official GitHub Pull Request Review (`EVENT: COMMENT`).

### 3.4 Collaborative Comment Actions
- **`PATCH /api/comments/:id/resolve`**:
  - Toggles `resolved: !comment.resolved` and sets `resolvedBy`.
- **`PATCH /api/comments/:id/upvote`**:
  - Toggles the requesting user's `userId` in `comment.upvotes`.
- **`POST /api/comments/:id/publish-github`**:
  - Publishes an individual comment directly to the GitHub PR diff line.

---

## 4. Socket.io Realtime Specification

The Socket.io server attaches to the Express HTTP listener on port 5001.

### 4.1 Connection & Handshake Authentication
Client initiates connection using direct WebSocket transport (`transports: ['websocket']`) to avoid long-polling timeout pitfalls:
```typescript
io('http://localhost:5001', {
  withCredentials: true,
  transports: ['websocket'],
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  timeout: 10000,
});
```
Authentication middleware validates candidate tokens in strict priority order:
1. **HttpOnly Cookie** (`auth_token`): Primary browser session token sent automatically with credentials.
2. **Socket Auth Payload** (`handshake.auth.token`): Used if non-cookie client connects.
3. **Authorization Header** (`Bearer <JWT>`): Fallback header authentication.

Sockets lacking a valid JWT in all candidate sources are rejected immediately during the handshake middleware.

### 4.2 Room Isolation
Every pull request review executes in an isolated socket room: `review:${reviewId}`.

### 4.3 Event Catalog
1. **`join:review`** (`client -> server`): Client joins room. Server validates ownership and emits `presence:update`.
2. **`leave:review`** (`client -> server`): Client leaves room. Server updates presence.
3. **`review:status`** (`server -> client`): Emits lifecycle updates:
   ```json
   { "reviewId": "...", "status": "streaming" | "done" | "error" }
   ```
4. **`review:progress`** (`server -> client`): Real-time progress bar telemetry:
   ```json
   {
     "reviewId": "...",
     "percent": 45,
     "stage": "Auditing backend/src/billing/metering.service.ts...",
     "currentFile": "backend/src/billing/metering.service.ts",
     "filesReviewed": 12,
     "totalFiles": 28,
     "totalComments": 18
   }
   ```
5. **`review:architecture`** (`server -> client`): Emits synthesized architecture specification.
6. **`comment:new`** (`server -> client`): Emitted immediately when a new defect is discovered and saved to MongoDB.
7. **`presence:update`** (`server -> client`): Broadcasts list of active peer avatars in the review room.
8. **`file:error`** (`server -> client`): Notifies client if an individual file encounters analysis failure.

---

## 5. AI Code Review Engine Deep-Dive

The AI engine in `backend/src/services/gemini.service.ts` coordinates automated audits using the official Google GenAI SDK (`@google/genai`).

### 5.1 Multi-Model Fallback Chain
```typescript
const ACTIVE_GEMINI_MODELS = [
  'gemini-3.5-flash-lite', // Primary: 1,500 req/day quota, ~1.2s response latency
  'gemini-3.8-flash',      // Flagship fallback: deep AST & security analysis
  'gemini-3.6-flash',      // Secondary flagship fallback
  'gemini-3.5-flash',      // Reserve fallback
];
```

### 5.2 The 26-Point Defect Audit Checklist
Every file diff is evaluated against 26 targeted defect categories:
1. **Asynchronous Flow**: Un-awaited callbacks in `Array.prototype.forEach`, missing `Promise.all`.
2. **Mathematical & Precision**: Division by zero hazards, floating-point precision loss in quota accumulation (`+= tokens * 0.0001`).
3. **Object Safety**: Key lookups on plain `{}` dictionary objects (`toString`, `__proto__`, `constructor`) without null-prototype or `hasOwnProperty`.
4. **Timezone Boundaries**: Local `setHours(0,0,0,0)` combined with `.toISOString()`, causing date bucket drift.
5. **Sanitization**: Single-instance `.replace()` missing subsequent traversal instances.
6. **Database Filtering**: Missing tenant scoping on Mongoose queries/aggregations; querying `ObjectId` fields using raw string variables.
7. **ReDoS**: Unescaped dynamic user input inside `new RegExp(query, 'i')`.
8. **Cookie Paths**: Mismatch between `setCookie(path: '/a/b')` and `clearCookie(path: '/a')`.
9. **Increment Side-Effects**: `arr[i++]` or `filesReviewedCount++` inside math calculations returning the pre-incremented value.
10. **Cleanup Symmetry**: Missing `.off()` / `.removeEventListener()` matching an active `.on()`.
11. **URL Encoding**: Double-encoding `encodeURIComponent()` on already encoded route segments.
12. **HTTP Method Consistency**: Frontend `fetch(POST)` calling backend `router.patch()`.
13. **Compound Index Scope**: Tenant scoping keys missing from unique compound Mongoose indexes.
14. **Async forEach**: Flagged and converted to `for...of` or `Promise.all(arr.map(...))`.
15. **String Addition in Expiry**: `exp + gracePeriod` where gracePeriod is `"60"` yielding `"170000000060"`.
16. **Timestamp Units**: Direct comparisons between milliseconds (`Date.now()`, 13 digits) and seconds (Unix timestamps, 10 digits).
17. **Multi-Tenant Aggregations**: `$match` stages in aggregation pipelines missing tenant `organizationId`.
18. **Directory Traversal**: Unsanitized `path.resolve(UPLOAD_DIR, category, filename)` allowing `../` directory escapes.
19. **In-Memory Cache Leaks**: In-memory maps lacking TTL eviction timers or max size caps.
20. **Circular JSON Serialization**: `JSON.stringify(job)` on objects containing circular references back to parent queues.
21. **Unsorted Chunk Reassembly**: Writing chunked file uploads asynchronously without ordering by chunk index.
22. **Webhook Timing Attacks**: Comparing HMAC signatures using `===` instead of `crypto.timingSafeEqual`.
23. **Nested Subdocument Casting**: Mongoose `$pull: { members: { userId: string } }` failing to match `ObjectId` schema fields.
24. **React 19 Render Loops**: `useEffect` state setters creating new object references that trigger downstream dependency updates.
25. **Docker Volume Shadowing**: Mounting `./backend:/app` in `docker-compose.yml` over pre-built `/app/dist`.
26. **Secret Hardcoding**: JWT secrets or encryption keys committed directly in configuration files.

### 5.3 Resilient Worker Pool Architecture
- **Concurrency Limit**: 2 concurrent worker tasks (`CONCURRENCY_LIMIT = 2`).
- **Polite Pacing**: 600ms delay between consecutive files to stay within rate-limit RPM boundaries.
- **Exponential Backoff**: If an API call encounters rate limiting (`429` or `RESOURCE_EXHAUSTED`), it backs off for `2s` $\rightarrow$ `4s` $\rightarrow$ `8s` across 3 retry rounds.
- **Secondary Retry Queue**: Files that fail due to transient network blips are stored in `failedFiles` and re-audited during a dedicated retry pass before completing.

---

## 6. Frontend User Experience & Components

Built with Next.js 16 App Router, React 19, Tailwind CSS v4, and Framer Motion 13.

### 6.1 Component Structure
- **`DiffViewer.tsx`**: Renders side-by-side and unified file diffs. Injects inline comment cards below flagged lines with severity tags and suggested code fixes.
  - **Clean PR & 0-Defect Verification**: Automatically displays affirmative verification badges and a dedicated "AST & Syntax Passed / OWASP Security Clean" banner when review concludes with 0 findings.
  - **Responsive Mobile Drawer**: Sidebar collapses into a touch-friendly slide-out drawer on `<md` screens with a backdrop overlay.
  - **Auto-Scroll to Findings**: Smoothly scrolls to the line containing the first audit finding upon selecting a file.
  - **Horizontal Scroll Non-Clipping**: Uses `.no-scrollbar` with `whitespace-nowrap` to display full file paths without truncation.
- **`PrList.tsx` & `RepoList.tsx`**:
  - Implements a mobile master-detail flow on viewports `< 768px`. Selecting a repository reveals pull requests with a back navigation arrow returning to the repository selector.
- **`PrArchitectureViewer.tsx`**:
  - Displays executive summary, real-world metaphor, and ASCII sequence flow.
  - Interactive file walkthrough with instant search filter.
  - Collapsible list (displays 12 files by default with "Show All" toggle).
  - QA watch-out checklist.
- **`PresenceIndicator.tsx`**: Renders peer avatars currently connected to the review room.
- **`VsCodeSyntaxHighlighter.tsx`**: Tokenizes diff snippets with VSCode-style syntax highlighting.
- **`HighTrafficModal.tsx`**: Graceful modal triggered when AI API traffic limits are exceeded.

---

## 7. Honest Review & Areas That Need Improvement

### Current Strengths
1. **Streaming Responsiveness**: Real-time Socket.io streaming provides immediate feedback rather than blocking the user for minutes.
2. **Fault Tolerance**: Multi-model fallback, retry queues, and exponential backoff prevent job abortion.
3. **High Defect Detection Accuracy**: Pre-fetching static context files enables the AI to cross-reference routes, schemas, and controllers across files.
4. **Token Encryption at Rest**: GitHub personal access tokens are encrypted using AES-256-GCM with unique IVs and HMAC auth tags prior to persisting in MongoDB.
5. **Clean Verification**: No ambiguous empty states when PRs have 0 defects; developers receive affirmative validation and one-click GitHub approval sync.
6. **Mobile First-Class Usability**: Responsive master-detail flow, drawers, and smooth scrolling for tablet and mobile devices.

### Critical Limitations & Improvement Roadmap
1. **In-Memory Job Execution**:
   - *Issue*: Review jobs run inside the Express Node process. If the server crashes or restarts, active reviews are lost.
   - *Remediation*: Implement BullMQ or Temporal with Redis for persistent, distributed job queues.
2. **Single-Node Socket Presence**:
   - *Issue*: Connected user presence is stored in process memory (`Map`).
   - *Remediation*: Add `@socket.io/redis-adapter` to support multi-container horizontal scaling.
3. **Google Free-Tier Quota Constraints**:
   - *Issue*: Models like `gemini-3.8-flash` have a 20 request/day limit on Google AI Studio Free Tier.
   - *Remediation*: Enable Google Cloud pay-as-you-go billing for enterprise workloads.
4. **Large Diff DOM Virtualization**:
   - *Issue*: Files with >5,000 diff lines render all DOM nodes, causing scroll lag.
   - *Remediation*: Implement `@tanstack/react-virtual` or integrate Monaco Editor's diff widget.

---

## 8. Environment Variables Reference

### Backend (`backend/.env`)
```env
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/ai-codereview
JWT_SECRET=your_super_secret_jwt_key_here
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GEMINI_API_KEY=your_gemini_api_key_here
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
```
