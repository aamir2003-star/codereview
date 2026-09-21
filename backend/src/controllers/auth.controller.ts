import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { githubService } from '../services/github.service';
import { User } from '../models/User';
import { encrypt } from '../utils/crypto';
import { config } from '../config/env';
import { AuthenticatedRequest, JwtPayload } from '../middleware/auth.middleware';

export const authController = {
  /**
   * Redirect user to GitHub OAuth login
   */
  redirectToGitHub(_req: Request, res: Response): void {
    const authUrl = githubService.getOAuthUrl();
    res.redirect(authUrl);
  },

  /**
   * Handle GitHub OAuth callback
   */
  async handleCallback(req: Request, res: Response): Promise<void> {
    const { code, error, error_description } = req.query;

    if (error) {
      console.error('[Auth Callback Error]:', error, error_description);
      res.redirect(`${config.clientUrl}/login?error=${encodeURIComponent(String(error_description || error))}`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.redirect(`${config.clientUrl}/login?error=${encodeURIComponent('No authorization code received')}`);
      return;
    }

    try {
      // 1. Exchange code for GitHub access token
      const accessToken = await githubService.exchangeCodeForToken(code);

      // 2. Fetch user profile from GitHub
      const profile = await githubService.fetchUserProfile(accessToken);

      // 3. Encrypt the access token at rest
      const encryptedToken = encrypt(accessToken);

      // 4. Upsert User in MongoDB
      const user = await User.findOneAndUpdate(
        { githubId: String(profile.id) },
        {
          githubId: String(profile.id),
          username: profile.login,
          avatarUrl: profile.avatar_url,
          accessToken: encryptedToken,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // 5. Generate application JWT
      const payload: JwtPayload = {
        userId: user._id.toString(),
        githubId: user.githubId,
        username: user.username,
      };

      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

      // 6. Redirect to frontend with token
      res.redirect(`${config.clientUrl}/auth/callback?token=${encodeURIComponent(token)}`);
    } catch (err) {
      console.error('[OAuth Callback Exception]:', err);
      const message = err instanceof Error ? err.message : 'Failed to authenticate with GitHub';
      res.redirect(`${config.clientUrl}/login?error=${encodeURIComponent(message)}`);
    }
  },

  /**
   * Get current authenticated user details
   */
  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await User.findById(req.user.userId).select('-accessToken');
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({ user });
    } catch (err) {
      console.error('[GetMe Error]:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
