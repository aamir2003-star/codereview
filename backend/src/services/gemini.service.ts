import { config } from '../config/env';

export interface GeminiComment {
  line: number;
  severity: 'bug' | 'security' | 'smell' | 'nit';
  message: string;
}

export class GeminiApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

const SYSTEM_PROMPT = `You are a world-class senior code reviewer and security auditor.
Analyze the provided unified diff patch for a single file.

Your task:
1. Examine the changed lines (lines starting with + or -).
2. Flag any real bugs, security vulnerabilities, code smells, or high-value nits.
3. For each issue found, specify the line number where the issue exists (1-indexed line number in the new file).
4. Keep messages concise, actionable, and clear (under 140 characters).

You MUST respond strictly with a valid JSON array of objects.
Schema:
[
  {
    "line": 1,
    "severity": "bug" | "security" | "smell" | "nit",
    "message": "Description of issue"
  }
]

If the code looks good and has no issues, respond with an empty JSON array: []

Do NOT output markdown, backticks, or any explanation outside the JSON array.`;

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

export const geminiService = {
  async reviewFileDiff(filename: string, patch: string): Promise<GeminiComment[]> {
    if (!config.geminiApiKey) {
      throw new GeminiApiError('GEMINI_API_KEY is not configured in backend .env');
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    // Truncate overly long patches to prevent timeout on massive files
    const trimmedPatch = patch.length > 25000 ? patch.slice(0, 25000) + '\n... [diff truncated]' : patch;
    const userPrompt = `File: ${filename}\n\nUnified diff:\n\`\`\`\n${trimmedPatch}\n\`\`\``;

    // Active supported fast Gemini models
    const modelsToTry = [
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    let rawResponse = '';
    let lastError: unknown = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[Gemini] Requesting analysis for ${filename} using ${model}...`);

        // Enforce 14-second timeout per model attempt to avoid hanging
        const apiCall = ai.models.generateContent({
          model,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.15,
            maxOutputTokens: 2048,
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
          console.log(`[Gemini] Analysis completed successfully for ${filename} with ${model}`);
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini] Model ${model} failed for ${filename}:`, (err as Error).message);
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
          message: c.message.slice(0, 200),
        }));
    } catch (err) {
      console.error('[Gemini] Parse error. Raw response was:', rawResponse);
      throw new GeminiApiError(
        `Failed to parse review output for ${filename}: ${(err as Error).message}`
      );
    }
  },
};
