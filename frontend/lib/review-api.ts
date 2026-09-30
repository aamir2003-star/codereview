const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export type Severity = 'bug' | 'security' | 'smell' | 'nit';
export type ReviewStatus = 'pending' | 'streaming' | 'done' | 'error';

export interface PersistedComment {
  _id: string;
  reviewId: string;
  filePath: string;
  lineNumber: number;
  severity: Severity;
  message: string;
  suggestedFix?: string;
  upvotes: string[];
  resolved: boolean;
  resolvedBy?: string;
  createdAt: string;
}

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

export interface PersistedReview {
  _id: string;
  prUrl: string;
  owner: string;
  repo: string;
  pullNumber: number;
  prTitle: string;
  requestedBy: string;
  status: ReviewStatus;
  totalFiles: number;
  filesReviewed: number;
  totalComments: number;
  architectureSummary?: PrArchitectureSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewWithComments {
  review: PersistedReview;
  comments: PersistedComment[];
}

export async function triggerReview(
  token: string,
  payload: {
    owner: string;
    repo: string;
    pullNumber: number;
    prUrl: string;
    prTitle: string;
  }
): Promise<{ reviewId: string; status: string }> {
  const res = await fetch(`${API_URL}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to trigger review');
  }

  return res.json();
}

export async function fetchReview(token: string, reviewId: string): Promise<ReviewWithComments> {
  const res = await fetch(`${API_URL}/review/${reviewId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch review');
  }

  return res.json();
}

export async function stopReview(token: string, reviewId: string): Promise<{ success: boolean; review: PersistedReview }> {
  const res = await fetch(`${API_URL}/review/${reviewId}/stop`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to stop review');
  }

  return res.json();
}

export async function fetchReviewByPr(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<ReviewWithComments> {
  const res = await fetch(`${API_URL}/review/pr/${owner}/${repo}/${pullNumber}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'No existing review found');
  }

  return res.json();
}

export async function resolveComment(
  token: string,
  commentId: string
): Promise<{ comment: PersistedComment }> {
  const res = await fetch(`${API_URL}/comments/${commentId}/resolve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to resolve comment');
  }

  return res.json();
}

export async function upvoteComment(
  token: string,
  commentId: string
): Promise<{ comment: PersistedComment; upvotes: number }> {
  const res = await fetch(`${API_URL}/comments/${commentId}/upvote`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upvote comment');
  }

  return res.json();
}
