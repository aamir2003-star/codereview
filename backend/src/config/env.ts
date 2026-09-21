import dotenv from 'dotenv';
dotenv.config();

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
  },
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};
