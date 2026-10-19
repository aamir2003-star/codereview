import { http, authHeader } from '@/lib/http';

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
  publishedToGithub?: boolean;
  githubCommentUrl?: string;
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
  publishedToGithub?: boolean;
  githubReviewUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewWithComments {
  review: PersistedReview;
  comments: PersistedComment[];
}

export async function triggerReview(
  token: string | null | undefined,
  payload: {
    owner: string;
    repo: string;
    pullNumber: number;
    prUrl: string;
    prTitle: string;
  }
): Promise<{ reviewId: string; status: string }> {
  const { data } = await http.post<{ reviewId: string; status: string }>('/review', payload, {
    headers: authHeader(token),
  });
  return data;
}

export async function fetchReview(token: string | null | undefined, reviewId: string): Promise<ReviewWithComments> {
  const { data } = await http.get<ReviewWithComments>(`/review/${reviewId}`, {
    headers: authHeader(token),
  });
  return data;
}

export async function stopReview(token: string | null | undefined, reviewId: string): Promise<{ success: boolean; review: PersistedReview }> {
  const { data } = await http.post<{ success: boolean; review: PersistedReview }>(`/review/${reviewId}/stop`, {}, {
    headers: authHeader(token),
  });
  return data;
}

export async function fetchReviewByPr(
  token: string | null | undefined,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<ReviewWithComments> {
  const { data } = await http.get<ReviewWithComments>(`/review/pr/${owner}/${repo}/${pullNumber}`, {
    headers: authHeader(token),
  });
  return data;
}

export async function resolveComment(
  token: string | null | undefined,
  commentId: string
): Promise<{ comment: PersistedComment }> {
  const { data } = await http.patch<{ comment: PersistedComment }>(`/comments/${commentId}/resolve`, {}, {
    headers: authHeader(token),
  });
  return data;
}

export async function upvoteComment(
  token: string | null | undefined,
  commentId: string
): Promise<{ comment: PersistedComment; upvotes: number }> {
  const { data } = await http.patch<{ comment: PersistedComment; upvotes: number }>(`/comments/${commentId}/upvote`, {}, {
    headers: authHeader(token),
  });
  return data;
}

export async function publishReviewToGithub(
  token: string | null | undefined,
  reviewId: string
): Promise<{ success: boolean; published: boolean; githubReviewUrl: string; commentsCount: number }> {
  const { data } = await http.post<{ success: boolean; published: boolean; githubReviewUrl: string; commentsCount: number }>(`/review/${reviewId}/publish-github`, {}, {
    headers: authHeader(token),
  });
  return data;
}

export async function publishSingleCommentToGithub(
  token: string | null | undefined,
  commentId: string
): Promise<{ success: boolean; comment: PersistedComment; githubCommentUrl: string }> {
  const { data } = await http.post<{ success: boolean; comment: PersistedComment; githubCommentUrl: string }>(`/comments/${commentId}/publish-github`, {}, {
    headers: authHeader(token),
  });
  return data;
}
