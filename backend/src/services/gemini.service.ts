import { config } from '../config/env';

export interface GeminiComment {
  line: number;
  severity: 'bug' | 'security' | 'smell' | 'nit';
  message: string;
  suggestedFix?: string;
}

export class GeminiApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

const SYSTEM_PROMPT = `You are a world-class principal code reviewer, security auditor, and performance architect (similar to CodeRabbit and GitHub Copilot).
Your mission is to perform a rigorous line-by-line inspection of the provided file diff.

AUDIT CHECKLIST TO ACTIVELY INSPECT:
1. Asynchronous Flow & Concurrency: Look for async callbacks passed to Array.prototype.forEach (which are NOT awaited), missing Promise.all on mapped async arrays, race conditions, or unhandled Promise rejections.
2. Mathematical & Type Edge Cases: Check for division by zero hazards (e.g. dividing by totalFiles or count where 0 yields NaN), floating-point precision, off-by-one loop indices (e.g. <= vs <), and unvalidated array indexing.
3. Object Safety & Prototype Collisions: Check for object key lookups on un-sanitized keys like 'toString', '__proto__', or 'constructor' in plain dictionary objects ({}) without Object.create(null) or hasOwnProperty checks.
4. Timezone & Boundary Discrepancies: Check for local timezone methods (e.g. setHours(0,0,0,0)) combined with UTC output (.toISOString()), causing date bucket drift.
5. Sanitization & String Operations: Check for single-instance .replace() (e.g. replace('../', '')) that misses subsequent traversal instances.
6. Database & Scoping Correctness: Check for unscoped countDocuments() or queries missing tenant/owner filters. Check that query filter field types match the schema (e.g. comparing a plain string against a Mongoose ObjectId field will silently return no results).
7. Regex Injection & ReDoS: Flag ANY use of new RegExp(userInput) or new RegExp(variable) where the argument originates from request params, query, body, or any external/untrusted source without prior escaping (e.g. escapeRegExp). Unescaped user input in RegExp enables Regular Expression Denial of Service (ReDoS) via catastrophic backtracking.
8. Cookie & Session Path Matching: When reviewing setCookie/clearCookie or cookie options, verify that the 'path' option matches EXACTLY between set and clear operations. A mismatched path (e.g. setting with path '/auth/github/callback' but clearing with path '/auth') means the cookie is NEVER actually cleared, causing stale state accumulation.
9. Increment/Decrement Operator Side-Effects: In expressions like arr[i++], fn(count++), or calculations using count++, the post-increment returns the OLD value AND mutates the variable as a side-effect. Flag when post-increment/decrement is used inside calculations, function arguments, or concurrent/async code where the mutation may cause double-counting or off-by-one errors.
10. Cleanup & Teardown Symmetry: For every .on(), .addEventListener(), .subscribe(), or event registration, verify the cleanup/teardown/unmount function has a MATCHING .off(), .removeEventListener(), or .unsubscribe(). Compare every registration against its cleanup — a single missing pair causes memory leaks and duplicate handler accumulation on reconnect/remount.
11. Double Encoding & URL Construction: Check for encodeURIComponent() applied to values that are already URL-safe or will be double-encoded. Also check for INCONSISTENT encoding where some path segments are encoded but others are not.
12. HTTP Method Consistency: When the file makes HTTP requests (fetch, axios, etc.), check that the HTTP method (GET, POST, PUT, PATCH, DELETE) matches what the target API endpoint expects. A mismatch (e.g. POST instead of PATCH) will result in 404/405 errors.

For EACH issue or improvement found:
- "line": The exact 1-indexed line number in the new file (+) where the issue or code is located.
- "severity": "bug" (logic/runtime error) | "security" (vulnerability/data leak) | "smell" (bad practice/anti-pattern) | "nit" (minor style/convention).
- "message": A clear explanation describing WHAT the flaw is and WHY it causes a failure, race condition, data corruption, or security risk.
- "suggestedFix": A concrete, ready-to-commit code snippet that completely fixes the issue.

You MUST respond strictly with a valid JSON array of objects:
[
  {
    "line": 15,
    "severity": "bug",
    "message": "Array.prototype.forEach does not await async callbacks. The function returns before asynchronous operations complete.",
    "suggestedFix": "const metrics = await Promise.all(Object.entries(byUser).map(async ([userId, userReviews]) => { ... }));"
  }
]

If the diff has absolutely no bugs, vulnerabilities, or code smells, respond with: []
Do NOT include markdown fences, backticks, or any prose outside the JSON array.`;

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

/**
 * Resilient JSON parser that gracefully handles truncated AI responses
 */
function repairAndParseJsonArray(raw: string): any[] {
  const cleaned = stripCodeFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch (firstErr) {
    // Attempt 1: Find the last complete JSON object closing brace '}' and close the array
    const lastBraceIdx = cleaned.lastIndexOf('}');
    if (lastBraceIdx !== -1) {
      const truncated = cleaned.slice(0, lastBraceIdx + 1) + '\n]';
      try {
        const parsed = JSON.parse(truncated);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Continue to fallback
      }
    }

    // Attempt 2: Regex extraction of individual valid comment objects
    const objects: any[] = [];
    const objectRegex = /\{[\s\S]*?"line"\s*:\s*\d+[\s\S]*?"message"\s*:\s*"[^"]*"[\s\S]*?\}/g;
    let match: RegExpExecArray | null;
    while ((match = objectRegex.exec(cleaned)) !== null) {
      try {
        objects.push(JSON.parse(match[0]));
      } catch {
        // Skip unparseable chunk
      }
    }

    if (objects.length > 0) return objects;
    throw firstErr;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ACTIVE_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
];

export const geminiService = {
  async reviewFileDiff(
    filename: string,
    patch: string,
    contextFiles?: Array<{ filename: string; snippet: string }>
  ): Promise<GeminiComment[]> {
    if (!config.geminiApiKey) {
      throw new GeminiApiError('GEMINI_API_KEY is not configured in backend .env');
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    // Truncate overly long patches to prevent timeout on massive files
    const trimmedPatch =
      patch.length > 25000 ? patch.slice(0, 25000) + '\n... [diff truncated]' : patch;

    let userPrompt = `File: ${filename}\n\nUnified diff:\n\`\`\`\n${trimmedPatch}\n\`\`\``;

    // Phase 2: Inject cross-file context so AI can cross-reference related files
    if (contextFiles && contextFiles.length > 0) {
      userPrompt += '\n\n## Related Context Files (cross-reference for consistency)\n';
      userPrompt +=
        'Verify that HTTP methods, type signatures, route paths, schema field types, ' +
        'cookie paths, and event listener patterns in the reviewed file are CONSISTENT ' +
        'with these context files.\n\n';
      for (const ctx of contextFiles) {
        const trimmedSnippet =
          ctx.snippet.length > 3000
            ? ctx.snippet.slice(0, 3000) + '\n... [truncated]'
            : ctx.snippet;
        userPrompt += `### ${ctx.filename}\n\`\`\`\n${trimmedSnippet}\n\`\`\`\n\n`;
      }
    }

    let rawResponse = '';
    let lastError: unknown = null;

    // Retry loop with exponential backoff for transient 503 high demand / 429 rate limit spikes
    const maxRounds = 2;
    outerLoop: for (let round = 0; round < maxRounds; round++) {
      for (const model of ACTIVE_GEMINI_MODELS) {
        try {
          console.log(`[Gemini] [Round ${round + 1}] Analyzing ${filename} using ${model}...`);

          const apiCall = ai.models.generateContent({
            model,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: 0.1,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
            },
            contents: userPrompt,
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after 14s for model ${model}`)), 14000)
          );

          const response: any = await Promise.race([apiCall, timeoutPromise]);
          rawResponse = response.text ?? '';

          if (rawResponse) {
            console.log(`[Gemini] Successfully reviewed ${filename} using ${model}`);
            break outerLoop;
          }
        } catch (err) {
          lastError = err;
          const msg = (err as Error).message || '';
          console.warn(`[Gemini] ${model} attempt failed for ${filename}:`, msg.slice(0, 120));
          await sleep(200);
        }
      }

      if (round < maxRounds - 1) {
        const backoffMs = 1000 * Math.pow(2, round);
        console.log(`[Gemini] Retrying review for ${filename} in ${backoffMs}ms...`);
        await sleep(backoffMs);
      }
    }

    if (!rawResponse) {
      if (lastError) {
        throw new GeminiApiError(`Gemini API call failed: ${(lastError as Error).message}`);
      }
      return [];
    }

    try {
      const parsed = repairAndParseJsonArray(rawResponse) as GeminiComment[];

      if (!Array.isArray(parsed)) {
        console.warn(`[Gemini] Response was not an array:`, rawResponse);
        return [];
      }

      return parsed
        .filter(
          (c) =>
            typeof c.line === 'number' &&
            typeof c.message === 'string' &&
            ['bug', 'security', 'smell', 'nit'].includes(c.severity)
        )
        .map((c) => ({
          line: Math.max(1, Math.floor(c.line)),
          severity: c.severity,
          message: c.message,
          suggestedFix: typeof c.suggestedFix === 'string' ? c.suggestedFix.trim() : undefined,
        }));
    } catch (err) {
      console.error('[Gemini] Parse error. Raw response was:', rawResponse);
      throw new GeminiApiError(
        `Failed to parse review output for ${filename}: ${(err as Error).message}`
      );
    }
  },

  /**
   * Generates a CodeRabbit-style comprehensive architecture overview and PR explanation
   */
  async generatePrArchitecture(
    prTitle: string,
    prDescription: string,
    files: Array<{ filename: string; patch?: string; additions?: number; deletions?: number }>
  ): Promise<{
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
  }> {
    if (!config.geminiApiKey) {
      throw new GeminiApiError('GEMINI_API_KEY is not configured in backend .env');
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const fileSummary = files
      .map((f) => {
        const snippet = f.patch ? f.patch.slice(0, 1500) : 'No patch';
        return `### File: ${f.filename} (+${f.additions || 0}/-${f.deletions || 0})\n\`\`\`diff\n${snippet}\n\`\`\``;
      })
      .join('\n\n');

    const ARCHITECTURE_SYSTEM_PROMPT = `You are a Principal Software Architect and Technical Lead at a top engineering organization.
Analyze the following Pull Request holistically, like CodeRabbit.

Your task:
1. "highLevelSummary": A clear, concise 2-4 sentence executive summary of what this Pull Request achieves from a product and system perspective.
2. "architectureOverview": A detailed breakdown of the architectural changes, patterns introduced, data flow adjustments, and module interactions.
3. "keyComponentsChanged": An array of the main modules/components affected, each with:
   - "component": Component or module name (e.g. "Auth Service", "Session Storage", "Diff Rendering Engine")
   - "purpose": What role this component plays in the change
   - "impactLevel": One of "HIGH" | "MEDIUM" | "LOW"
4. "sequenceFlowOrDiagram": A clear ASCII or Mermaid sequence diagram illustrating the new or modified request/execution flow.
5. "walkthrough": An array mapping each significant file to a concise 1-2 sentence explanation of what changed in that file:
   - "file": The file path
   - "changes": Brief summary of changes
6. "potentialRisks": An array of bullet points highlighting potential edge cases, breaking changes, performance concerns, or security risks to test before merging.

Respond strictly with a valid JSON object matching this schema:
{
  "highLevelSummary": "...",
  "architectureOverview": "...",
  "keyComponentsChanged": [
    { "component": "...", "purpose": "...", "impactLevel": "HIGH" }
  ],
  "sequenceFlowOrDiagram": "User -> API Client -> Express Controller -> Gemini AI Engine",
  "walkthrough": [
    { "file": "src/services/auth.ts", "changes": "Added JWT verification and session refresh logic." }
  ],
  "potentialRisks": [
    "Ensure token expiration is properly handled during network disconnects."
  ]
}

Do NOT output markdown fences or commentary outside the JSON object.`;

    const userPrompt = `Pull Request: ${prTitle}
Description: ${prDescription || 'No description provided.'}

Files Changed:
${fileSummary}`;

    let rawResponse = '';
    let lastError: unknown = null;

    for (let round = 0; round < 2; round++) {
      for (const model of ACTIVE_GEMINI_MODELS) {
        try {
          console.log(`[Gemini] Generating PR architecture using ${model}...`);
          const apiCall = ai.models.generateContent({
            model,
            config: {
              systemInstruction: ARCHITECTURE_SYSTEM_PROMPT,
              temperature: 0.2,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
            },
            contents: userPrompt,
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after 15s for model ${model}`)), 15000)
          );

          const response = (await Promise.race([apiCall, timeoutPromise])) as any;
          if (response?.text) {
            rawResponse = response.text;
            console.log(`[Gemini] Architecture generated successfully using ${model}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[Gemini] Model ${model} failed for PR architecture:`, err.message || err);
          await sleep(200);
        }
      }
      if (rawResponse) break;
      await sleep(1000);
    }

    if (!rawResponse) {
      // Return a graceful fallback if AI calls were rate limited
      return {
        highLevelSummary: `Pull Request "${prTitle}" modifies ${files.length} files across the repository.`,
        architectureOverview: `This change includes updates across ${files.map((f) => f.filename).slice(0, 5).join(', ')}.`,
        keyComponentsChanged: files.slice(0, 4).map((f) => ({
          component: f.filename,
          purpose: 'Source code modification',
          impactLevel: 'MEDIUM' as const,
        })),
        sequenceFlowOrDiagram: 'PR Branch -> Code Inspection -> Build & Verify -> Merge',
        walkthrough: files.map((f) => ({
          file: f.filename,
          changes: `Modified with +${f.additions || 0}/-${f.deletions || 0} lines.`,
        })),
        potentialRisks: ['Verify unit test coverage and regression test modified components.'],
      };
    }

    try {
      const cleaned = stripCodeFences(rawResponse);
      const parsed = JSON.parse(cleaned);
      return {
        highLevelSummary: typeof parsed.highLevelSummary === 'string' ? parsed.highLevelSummary : '',
        architectureOverview: typeof parsed.architectureOverview === 'string' ? parsed.architectureOverview : '',
        keyComponentsChanged: Array.isArray(parsed.keyComponentsChanged) ? parsed.keyComponentsChanged : [],
        sequenceFlowOrDiagram: typeof parsed.sequenceFlowOrDiagram === 'string' ? parsed.sequenceFlowOrDiagram : '',
        walkthrough: Array.isArray(parsed.walkthrough) ? parsed.walkthrough : [],
        potentialRisks: Array.isArray(parsed.potentialRisks) ? parsed.potentialRisks : [],
      };
    } catch (err) {
      console.error('[Gemini] Failed to parse architecture JSON:', rawResponse);
      return {
        highLevelSummary: `Pull Request "${prTitle}" updates ${files.length} files.`,
        architectureOverview: rawResponse.slice(0, 300),
        keyComponentsChanged: [],
        walkthrough: [],
        potentialRisks: [],
      };
    }
  },

  /**
   * Phase 3: Cross-file integration review
   * Reviews all changed files TOGETHER to catch cross-file consistency bugs
   * that no single-file review can detect.
   */
  async crossFileIntegrationReview(
    files: Array<{ filename: string; patch: string }>,
    repoContextFiles?: Array<{ filename: string; snippet: string }>
  ): Promise<GeminiComment[]> {
    if (!config.geminiApiKey) {
      throw new GeminiApiError('GEMINI_API_KEY is not configured in backend .env');
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const CROSS_FILE_PROMPT = `You are a Principal Integration Architect performing a CROSS-FILE consistency review.

You are given ALL files changed in a Pull Request, PLUS key reference files from the repository (route definitions, model schemas, middleware). Your job is to find bugs that ONLY appear when comparing files against each other — issues that are INVISIBLE when reviewing any single file in isolation.

CROSS-FILE CHECKS:
1. HTTP Method Mismatches: Frontend API calls use one HTTP method (e.g. POST) but the backend route expects a different one (e.g. PATCH). Compare the fetch/axios calls in frontend files against the Express router method (router.get, router.post, router.patch, etc.) in the route definition files. This causes 404/405 errors at runtime.
2. Type Mismatches Across Boundaries: A controller passes a string where a Mongoose model schema expects ObjectId, or vice versa. Compare the controller's query filter fields against the model schema field types. The query silently returns null/empty.
3. Route Path Mismatches: Frontend calls /api/foo but backend registers /api/bar.
4. Schema Changes Breaking Queries: A model index or field was changed, but existing queries in controllers still use the old field names or assumptions.
5. Cookie/Session Path Inconsistencies: setCookie in one file uses path '/a/b' but clearCookie in another file uses path '/a'.
6. Event/Message Contract Mismatches: Socket.io emit in backend uses event name 'x' but frontend listens for 'y', or payload shapes differ.
7. Shared State Assumptions: One file assumes a variable is a number, another treats it as a string.
8. Import/Export Mismatches: A function signature changed in the source file but callers still use the old signature.

For EACH cross-file issue found:
- "line": The line number in the file where the SYMPTOM appears (the consuming/calling side).
- "severity": "bug" | "security" | "smell"
- "message": Explain BOTH files involved: "In [fileA] line X, ... but in [fileB] line Y, ... This causes ..."
- "suggestedFix": The code fix for the file containing the bug.

Respond with a valid JSON array. If no cross-file issues found, respond with [].
Do NOT include markdown fences or prose outside the JSON array.`;

    // Build combined diff context (limit total size to avoid timeouts)
    let combinedDiffs = '';
    let totalChars = 0;
    const MAX_TOTAL_CHARS = 50000;

    for (const file of files) {
      const snippet = file.patch.length > 4000 ? file.patch.slice(0, 4000) + '\n...[truncated]' : file.patch;
      if (totalChars + snippet.length > MAX_TOTAL_CHARS) break;
      combinedDiffs += `\n### Changed File: ${file.filename}\n\`\`\`diff\n${snippet}\n\`\`\`\n`;
      totalChars += snippet.length;
    }

    // Include repo reference files (routes, models, schemas)
    if (repoContextFiles && repoContextFiles.length > 0) {
      combinedDiffs += '\n\n## Reference Files from Repository (NOT changed in PR, for cross-reference):\n';
      for (const ctx of repoContextFiles) {
        const snippet = ctx.snippet.length > 2500 ? ctx.snippet.slice(0, 2500) + '\n...[truncated]' : ctx.snippet;
        if (totalChars + snippet.length > MAX_TOTAL_CHARS) break;
        combinedDiffs += `\n### Reference: ${ctx.filename}\n\`\`\`\n${snippet}\n\`\`\`\n`;
        totalChars += snippet.length;
      }
    }

    const userPrompt = `All changed files in this PR:\n${combinedDiffs}`;

    let rawResponse = '';
    let lastError: unknown = null;

    for (let round = 0; round < 2; round++) {
      for (const model of ACTIVE_GEMINI_MODELS) {
        try {
          console.log(`[Gemini] [Cross-File Pass] Analyzing ${files.length} files together using ${model}...`);

          const apiCall = ai.models.generateContent({
            model,
            config: {
              systemInstruction: CROSS_FILE_PROMPT,
              temperature: 0.1,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
            },
            contents: userPrompt,
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after 20s for cross-file model ${model}`)), 20000)
          );

          const response: any = await Promise.race([apiCall, timeoutPromise]);
          rawResponse = response.text ?? '';

          if (rawResponse) {
            console.log(`[Gemini] Cross-file review completed using ${model}`);
            break;
          }
        } catch (err) {
          lastError = err;
          const msg = (err as Error).message || '';
          console.warn(`[Gemini] Cross-file ${model} failed:`, msg.slice(0, 120));
          await sleep(300);
        }
      }
      if (rawResponse) break;
      await sleep(1500);
    }

    if (!rawResponse) {
      console.warn('[Gemini] Cross-file integration review failed, skipping.');
      return [];
    }

    try {
      const parsed = repairAndParseJsonArray(rawResponse) as GeminiComment[];
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(
          (c) =>
            typeof c.line === 'number' &&
            typeof c.message === 'string' &&
            ['bug', 'security', 'smell', 'nit'].includes(c.severity)
        )
        .map((c) => ({
          line: Math.max(1, Math.floor(c.line)),
          severity: c.severity,
          message: `[Cross-File] ${c.message}`,
          suggestedFix: typeof c.suggestedFix === 'string' ? c.suggestedFix.trim() : undefined,
        }));
    } catch (err) {
      console.error('[Gemini] Cross-file parse error:', rawResponse);
      return [];
    }
  },

  /**
   * Phase 4: Dedicated security scanner for auth/security-sensitive files.
   * Uses a hardened OWASP-focused prompt.
   */
  async securityScanFile(
    filename: string,
    patch: string,
    contextFiles?: Array<{ filename: string; snippet: string }>
  ): Promise<GeminiComment[]> {
    if (!config.geminiApiKey) {
      throw new GeminiApiError('GEMINI_API_KEY is not configured in backend .env');
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const SECURITY_PROMPT = `You are a Senior Application Security Engineer performing a dedicated security audit.
This file has been flagged as security-sensitive (authentication, authorization, middleware, database queries, user input handling, or cookie/session management).

MANDATORY SECURITY CHECKS (OWASP Top 10 + Node.js specifics):
1. JWT Misconfigurations: algorithms array allowing 'none', missing algorithm restriction, weak secrets, missing expiration validation.
2. Authentication Bypasses: Middleware that can be skipped, missing auth checks on sensitive routes, token validation gaps.
3. NoSQL Injection: Unsanitized user input in MongoDB queries (req.body/params/query passed directly to $where, $regex, or query operators).
4. Regex Denial of Service (ReDoS): new RegExp(userInput) without escaping enables catastrophic backtracking.
5. Cookie Security: Missing httpOnly, secure, sameSite flags. Mismatched set/clear paths. Cookie not actually cleared on logout.
6. Path Traversal: User-controlled file paths without sanitization (e.g. ../../../etc/passwd).
7. Privilege Escalation: Users accessing resources they don't own, missing ownership checks in CRUD operations.
8. Information Disclosure: Stack traces, internal paths, or database details leaked in error responses.
9. SSRF: User-controlled URLs in server-side fetch/request calls.
10. Mass Assignment: Accepting full req.body into database create/update without whitelisting fields.
11. Timing Attacks: Using === to compare secrets/tokens instead of crypto.timingSafeEqual.
12. Rate Limiting Gaps: Auth endpoints without rate limiting enabling brute force.

For EACH security issue found:
- "line": Line number where the vulnerability exists.
- "severity": "security" (for actual vulnerabilities) | "bug" (for auth logic errors).
- "message": Describe the vulnerability, attack vector, and potential impact.
- "suggestedFix": A production-ready fix.

Respond with a valid JSON array. If no security issues, respond with [].
Do NOT include markdown fences or prose.`;

    const trimmedPatch = patch.length > 20000 ? patch.slice(0, 20000) + '\n...[truncated]' : patch;
    let userPrompt = `Security-sensitive file: ${filename}\n\n\`\`\`diff\n${trimmedPatch}\n\`\`\``;

    if (contextFiles && contextFiles.length > 0) {
      userPrompt += '\n\n## Related files for cross-reference:\n';
      for (const ctx of contextFiles) {
        const trimmed = ctx.snippet.length > 2000 ? ctx.snippet.slice(0, 2000) + '\n...[truncated]' : ctx.snippet;
        userPrompt += `### ${ctx.filename}\n\`\`\`\n${trimmed}\n\`\`\`\n\n`;
      }
    }

    let rawResponse = '';

    for (const model of ACTIVE_GEMINI_MODELS) {
      try {
        console.log(`[Security] Scanning ${filename} using ${model}...`);

        const apiCall = ai.models.generateContent({
          model,
          config: {
            systemInstruction: SECURITY_PROMPT,
            temperature: 0.05,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
          contents: userPrompt,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Security scan timeout for ${model}`)), 15000)
        );

        const response: any = await Promise.race([apiCall, timeoutPromise]);
        rawResponse = response.text ?? '';

        if (rawResponse) {
          console.log(`[Security] Completed security scan of ${filename} using ${model}`);
          break;
        }
      } catch (err) {
        console.warn(`[Security] ${model} failed for ${filename}:`, ((err as Error).message || '').slice(0, 100));
        await sleep(200);
      }
    }

    if (!rawResponse) return [];

    try {
      const parsed = repairAndParseJsonArray(rawResponse) as GeminiComment[];
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(
          (c) =>
            typeof c.line === 'number' &&
            typeof c.message === 'string' &&
            ['bug', 'security', 'smell', 'nit'].includes(c.severity)
        )
        .map((c) => ({
          line: Math.max(1, Math.floor(c.line)),
          severity: c.severity,
          message: `[Security Scan] ${c.message}`,
          suggestedFix: typeof c.suggestedFix === 'string' ? c.suggestedFix.trim() : undefined,
        }));
    } catch (err) {
      console.error('[Security] Parse error:', rawResponse);
      return [];
    }
  },
};
