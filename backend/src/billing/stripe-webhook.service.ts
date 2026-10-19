import mongoose from 'mongoose';
import { Subscription, PlanTier } from '../models/Subscription';
import { cache } from '../cache/cache.manager';

export class StripeWebhookService {
  public async handleCustomerSubscriptionUpdated(eventData: {
    customerId: string;
    subscriptionId: string;
    planTier: PlanTier;
    status: 'active' | 'past_due' | 'canceled';
  }): Promise<boolean> {
    const quotaMap: Record<PlanTier, { tokens: number; seats: number }> = {
      free: { tokens: 50000, seats: 3 },
      starter: { tokens: 250000, seats: 10 },
      pro: { tokens: 1000000, seats: 25 },
      enterprise: { tokens: 10000000, seats: 100 },
    };

    const quotaInfo = quotaMap[eventData.planTier] || quotaMap.free;

    const subscription = await Subscription.findOneAndUpdate(
      { stripeCustomerId: eventData.customerId },
      {
        plan: eventData.planTier,
        status: eventData.status,
        monthlyTokenQuota: quotaInfo.tokens,
        maxSeats: quotaInfo.seats,
        stripeSubscriptionId: eventData.subscriptionId,
      },
      { new: true }
    );

    if (subscription) {
      await cache.delete(`sub:${subscription.organizationId}`);
      return true;
    }

    return false;
  }
}

export const stripeWebhookService = new StripeWebhookService();
