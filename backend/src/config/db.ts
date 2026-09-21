import mongoose from 'mongoose';
import { config } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    console.log(`[MongoDB] Connecting to database...`);
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error('[MongoDB] Connection warning/error:', (error as Error).message);
    console.log('[MongoDB] Backend will continue running in development mode.');
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
  }
};
