import dotenv from 'dotenv';
dotenv.config();

// Validate required environment variables at startup
function validateConfig() {
  const errors: string[] = [];

  // In production, enforce all required vars
  if (process.env.NODE_ENV === 'production') {
    const required = [
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'GEMINI_API_KEY',
      'MONGODB_URI',
    ];

    for (const key of required) {
      if (!process.env[key]) {
        errors.push(`Missing required env var: ${key}`);
      }
    }

    // Check for weak defaults in production
    if (process.env.JWT_SECRET?.startsWith('dev_')) {
      errors.push('JWT_SECRET cannot use dev_ prefix in production');
    }
    if (process.env.ENCRYPTION_KEY?.startsWith('dev_')) {
      errors.push('ENCRYPTION_KEY cannot use dev_ prefix in production');
    }
  }

  if (errors.length > 0) {
    console.error('[Config] Validation failed:');
    errors.forEach((e) => console.error(`  - ${e}`));
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

validateConfig();

export const config = {
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/codereview',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret',
  encryptionKey: process.env.ENCRYPTION_KEY || 'dev_encryption_key_32_chars_len',
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    oauthRedirectUri:
      process.env.GITHUB_OAUTH_REDIRECT_URI ||
      `http://localhost:${process.env.PORT || 5001}/auth/github/callback`,
  },
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};
