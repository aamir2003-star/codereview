import mongoose from 'mongoose';
import { config } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    // Don't crash immediately in dev mode so API health endpoints can still function without DB
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
  }
};
