import { http, authHeader } from '@/lib/http';

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

export async function fetchRepos(token?: string): Promise<Repository[]> {
  const { data } = await http.get<{ repos: Repository[] }>('/repos', {
    headers: authHeader(token),
  });
  return data.repos;
}

export async function fetchPullRequests(
  token?: string,
  owner?: string,
  repo?: string
): Promise<PullRequest[]> {
  if (!owner || !repo) return [];
  const { data } = await http.get<{ prs: PullRequest[] }>(`/repos/${owner}/${repo}/prs`, {
    headers: authHeader(token),
  });
  return data.prs;
}

export async function fetchPullRequestDiff(
  token: string | undefined,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PrDiffResponse> {
  const { data } = await http.get<PrDiffResponse>(`/repos/${owner}/${repo}/prs/${pullNumber}/diff`, {
    headers: authHeader(token),
  });
  return data;
}
