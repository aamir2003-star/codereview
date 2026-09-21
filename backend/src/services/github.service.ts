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

export const githubService = {
  getOAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: config.github.clientId,
      scope: 'repo read:user user:email',
      redirect_uri: `http://localhost:${config.port}/auth/github/callback`,
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
};
