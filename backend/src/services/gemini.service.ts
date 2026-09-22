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

const SYSTEM_PROMPT = `You are an expert code reviewer. You will be given a unified diff patch of a single file.

Your task: identify issues in the CHANGED lines only (lines starting with + or -).

Respond ONLY with a valid JSON array. No markdown, no code fences, no explanation before or after.

Each item in the array must have exactly these fields:
- "line": number (the line number within the patch where the issue is, 1-indexed)
- "severity": one of "bug" | "security" | "smell" | "nit"
- "message": string (concise, actionable, under 120 chars)

If there are no issues, respond with an empty array: []

Severity definitions:
- "security": Vulnerabilities, injection risks, exposed secrets, insecure defaults
- "bug": Logic errors, likely runtime failures, incorrect behavior  
- "smell": Maintainability issues, anti-patterns, unclear naming, dead code
- "nit": Minor style, formatting suggestions`;

function stripCodeFences(raw: string): string {
  // Strip ```json ... ``` or ``` ... ``` wrappers if model ignores instructions
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

export const geminiService = {
  async reviewFileDiff(filename: string, patch: string): Promise<GeminiComment[]> {
    if (!config.geminiApiKey) {
      throw new GeminiApiError('GEMINI_API_KEY is not configured');
    }

    // Load the SDK only when a review is requested. This keeps authentication
    // and the HTTP server available even if the AI SDK takes time to initialise.
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const userPrompt = `File: ${filename}\n\nDiff patch:\n\`\`\`\n${patch}\n\`\`\``;

    let rawResponse = '';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
        contents: userPrompt,
      });

      rawResponse = response.text ?? '';

      if (!rawResponse) {
        console.warn(`[Gemini] Empty response for file: ${filename}`);
        return [];
      }

      const cleaned = stripCodeFences(rawResponse);
      const parsed = JSON.parse(cleaned) as GeminiComment[];

      if (!Array.isArray(parsed)) {
        throw new GeminiApiError('Gemini response is not an array');
      }

      // Validate and sanitise each comment
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
      if (err instanceof GeminiApiError) throw err;
      // Log raw response for debugging prompt issues
      console.error('[Gemini] Parse failure. Raw response:', rawResponse);
      console.error('[Gemini] Error:', err);
      throw new GeminiApiError(
        `Failed to parse Gemini response for ${filename}: ${(err as Error).message}`
      );
    }
  },
};
