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
};
