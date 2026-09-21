const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface GeminiComment {
  line: number;
  severity: 'bug' | 'security' | 'smell' | 'nit';
  message: string;
}

export interface FileReviewResult {
  filename: string;
  status: 'ok' | 'error' | 'skipped';
  comments: GeminiComment[];
  error?: string;
}

export interface PrReviewResponse {
  owner: string;
  repo: string;
  pullNumber: number;
  filesReviewed: number;
  totalFilesChanged: number;
  totalComments: number;
  results: FileReviewResult[];
}

export async function reviewSingleFile(
  token: string,
  filename: string,
  patch: string
): Promise<{ filename: string; comments: GeminiComment[]; total: number }> {
  const res = await fetch(`${API_URL}/review/file`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ filename, patch }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to review file');
  }

  return res.json();
}

export async function reviewPullRequest(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PrReviewResponse> {
  const res = await fetch(`${API_URL}/review/pr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ owner, repo, pullNumber }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to review pull request');
  }

  return res.json();
}
