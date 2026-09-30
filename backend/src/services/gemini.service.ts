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

const SYSTEM_PROMPT = `You are a world-class senior code reviewer, principal software architect, and cybersecurity auditor.
Analyze the provided unified diff patch for a single file.

Your task:
1. Carefully examine all added and modified lines (+).
2. Detect real bugs, runtime exceptions, syntax/logic errors, security vulnerabilities, hardcoded secrets, race conditions, memory leaks, bad practices, or code smells.
3. For EACH issue found:
   - "line": The exact 1-indexed line number in the new file where the issue resides.
   - "severity": One of "bug" | "security" | "smell" | "nit".
   - "message": A clear explanation of WHAT the problem is and WHY it causes a failure or security risk.
   - "suggestedFix": A clean, concrete code snippet or replacement line that fixes the problem directly.

You MUST respond strictly with a valid JSON array of objects matching this schema:
[
  {
    "line": 10,
    "severity": "bug",
    "message": "Calling session.user when session is undefined throws a TypeError: Cannot read properties of undefined at runtime.",
    "suggestedFix": "if (!session?.user) return null;"
  }
]

If the code looks good and has no issues, respond strictly with: []
Do NOT output markdown fences, backticks, or any explanation outside the JSON array.`;

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const geminiService = {
  async reviewFileDiff(filename: string, patch: string): Promise<GeminiComment[]> {
    if (!config.geminiApiKey) {
      throw new GeminiApiError('GEMINI_API_KEY is not configured in backend .env');
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    // Truncate overly long patches to prevent timeout on massive files
    const trimmedPatch =
      patch.length > 25000 ? patch.slice(0, 25000) + '\n... [diff truncated]' : patch;
    const userPrompt = `File: ${filename}\n\nUnified diff:\n\`\`\`\n${trimmedPatch}\n\`\`\``;

    // Resilient fallback chain of active Gemini models
    const modelsToTry = [
      'gemini-3.6-flash',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.7-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    let rawResponse = '';
    let lastError: unknown = null;

    // Retry loop with exponential backoff for transient 503 high demand / 429 rate limit spikes
    const maxRounds = 2;
    outerLoop: for (let round = 0; round < maxRounds; round++) {
      for (const model of modelsToTry) {
        try {
          console.log(`[Gemini] [Round ${round + 1}] Analyzing ${filename} using ${model}...`);

          const apiCall = ai.models.generateContent({
            model,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: 0.1,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json',
            },
            contents: userPrompt,
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after 12s for model ${model}`)), 12000)
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
          // Quick breather between model tries
          await sleep(250);
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
      const cleaned = stripCodeFences(rawResponse);
      const parsed = JSON.parse(cleaned) as GeminiComment[];

      if (!Array.isArray(parsed)) {
        console.warn(`[Gemini] Response was not an array:`, cleaned);
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

    const modelsToTry = [
      'gemini-3.6-flash',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.7-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    let rawResponse = '';
    let lastError: unknown = null;

    for (let round = 0; round < 2; round++) {
      for (const model of modelsToTry) {
        try {
          console.log(`[Gemini] Generating PR architecture using ${model}...`);
          const apiCall = ai.models.generateContent({
            model,
            config: {
              systemInstruction: ARCHITECTURE_SYSTEM_PROMPT,
              temperature: 0.2,
              maxOutputTokens: 3000,
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
          await sleep(250);
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
};
