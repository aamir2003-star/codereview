import mongoose from 'mongoose';
import { UsageRecord } from '../models/UsageRecord';
import { Subscription } from '../models/Subscription';
import { cache } from '../cache/cache.manager';

export class MeteringService {
  public async trackReviewUsage(
    organizationId: string,
    tokensUsed: number,
    commentsCount: number = 0
  ): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);

    await UsageRecord.findOneAndUpdate(
      { organizationId: orgObjectId, year, month },
      {
        $inc: {
          totalTokensUsed: tokensUsed,
          reviewsTriggered: 1,
          commentsGenerated: commentsCount,
        },
      },
      { upsert: true, new: true }
    );

    await cache.delete(`usage:${organizationId}:${year}:${month}`);
  }

  public async checkQuota(organizationId: string): Promise<{
    hasQuota: boolean;
    used: number;
    quota: number;
    percentUsed: number;
  }> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const cacheKey = `usage:${organizationId}:${year}:${month}`;
    const cachedUsage = await cache.get<{ used: number }>(cacheKey);

    let used = cachedUsage ? cachedUsage.used : 0;
    if (!cachedUsage) {
      const record = await UsageRecord.findOne({
        organizationId: new mongoose.Types.ObjectId(organizationId),
        year,
        month,
      });
      used = record ? record.totalTokensUsed : 0;
      await cache.set(cacheKey, { used }, { ttlSeconds: 60 });
    }

    const subscription = await Subscription.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    const quota = subscription ? subscription.monthlyTokenQuota : 50000;
    const hasQuota = used < quota;
    const percentUsed = quota > 0 ? Number(((used / quota) * 100).toFixed(1)) : 100;

    return {
      hasQuota,
      used,
      quota,
      percentUsed,
    };
  }

  public async getYearlyAggregation(organizationId: string, year: number) {
    return await UsageRecord.aggregate([
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(organizationId),
          year,
        },
      },
      {
        $group: {
          _id: '$year',
          totalTokens: { $sum: '$totalTokensUsed' },
          totalReviews: { $sum: '$reviewsTriggered' },
          totalComments: { $sum: '$commentsGenerated' },
        },
      },
    ]);
  }
}

export const meteringService = new MeteringService();
