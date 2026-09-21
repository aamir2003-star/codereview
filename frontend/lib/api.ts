const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  html_url: string;
  description: string | null;
  updated_at: string;
  language: string | null;
  stargazers_count: number;
  open_issues_count: number;
  default_branch: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  body: string | null;
  draft: boolean;
}

export interface FileDiff {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  raw_url: string;
  previous_filename?: string;
}

export interface PrDiffResponse {
  owner: string;
  repo: string;
  pullNumber: number;
  filesCount: number;
  files: FileDiff[];
}

export async function fetchRepos(token: string): Promise<Repository[]> {
  const res = await fetch(`${API_URL}/repos`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch repositories');
  }

  const data = await res.json();
  return data.repos;
}

export async function fetchPullRequests(
  token: string,
  owner: string,
  repo: string
): Promise<PullRequest[]> {
  const res = await fetch(`${API_URL}/repos/${owner}/${repo}/prs`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch pull requests');
  }

  const data = await res.json();
  return data.prs;
}

export async function fetchPullRequestDiff(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PrDiffResponse> {
  const res = await fetch(`${API_URL}/repos/${owner}/${repo}/prs/${pullNumber}/diff`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch pull request diff');
  }

  return await res.json();
}
