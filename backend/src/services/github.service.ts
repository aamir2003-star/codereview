import { config } from '../config/env';

export class GitHubApiError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'GitHubApiError';
    this.statusCode = statusCode;
  }
}

export interface GitHubUserProfile {
  id: number;
  login: string;
  avatar_url: string;
  name?: string;
  email?: string;
}

export interface GitHubRepo {
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

export interface GitHubPR {
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

export interface GitHubFileDiff {
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

export const githubService = {
  getOAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.github.clientId,
      scope: 'repo read:user user:email',
      redirect_uri: config.github.oauthRedirectUri,
      state,
      allow_signup: 'true',
      prompt: 'consent',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  },

  async exchangeCodeForToken(code: string): Promise<string> {
    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: config.github.clientId,
          client_secret: config.github.clientSecret,
          code,
        }),
      });

      if (!response.ok) {
        throw new GitHubApiError(`Failed to exchange code: ${response.statusText}`, response.status);
      }

      const data = (await response.json()) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (data.error || !data.access_token) {
        throw new GitHubApiError(
          data.error_description || data.error || 'Failed to obtain access token from GitHub'
        );
      }

      return data.access_token;
    } catch (error) {
      if (error instanceof GitHubApiError) throw error;
      throw new GitHubApiError((error as Error).message);
    }
  },

  async fetchUserProfile(accessToken: string): Promise<GitHubUserProfile> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Code-Review-Copilot',
        },
      });

      if (!response.ok) {
        throw new GitHubApiError(`Failed to fetch user profile: ${response.statusText}`, response.status);
      }

      return (await response.json()) as GitHubUserProfile;
    } catch (error) {
      if (error instanceof GitHubApiError) throw error;
      throw new GitHubApiError((error as Error).message);
    }
  },

  async getUserRepos(accessToken: string): Promise<GitHubRepo[]> {
    try {
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Code-Review-Copilot',
        },
      });

      if (!response.ok) {
        throw new GitHubApiError(`Failed to fetch repos: ${response.statusText}`, response.status);
      }

      return (await response.json()) as GitHubRepo[];
    } catch (error) {
      if (error instanceof GitHubApiError) throw error;
      throw new GitHubApiError((error as Error).message);
    }
  },

  async getRepoPullRequests(accessToken: string, owner: string, repo: string): Promise<GitHubPR[]> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&sort=updated&direction=desc&per_page=50`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Code-Review-Copilot',
        },
      });

      if (!response.ok) {
        throw new GitHubApiError(`Failed to fetch pull requests: ${response.statusText}`, response.status);
      }

      return (await response.json()) as GitHubPR[];
    } catch (error) {
      if (error instanceof GitHubApiError) throw error;
      throw new GitHubApiError((error as Error).message);
    }
  },

  async getPullRequestFiles(
    accessToken: string,
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<GitHubFileDiff[]> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'AI-Code-Review-Copilot',
          },
        }
      );

      if (!response.ok) {
        throw new GitHubApiError(`Failed to fetch PR files: ${response.statusText}`, response.status);
      }

      return (await response.json()) as GitHubFileDiff[];
    } catch (error) {
      if (error instanceof GitHubApiError) throw error;
      throw new GitHubApiError((error as Error).message);
    }
  },

  async getPullRequestDiffRaw(
    accessToken: string,
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<string> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3.diff',
            'User-Agent': 'AI-Code-Review-Copilot',
          },
        }
      );

      if (!response.ok) {
        throw new GitHubApiError(`Failed to fetch raw PR diff: ${response.statusText}`, response.status);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof GitHubApiError) throw error;
      throw new GitHubApiError((error as Error).message);
    }
  },
};
