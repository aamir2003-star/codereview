import { IPolicyConfig } from './types';
import { cache } from '../cache/cache.manager';

export class PolicyService {
  private policies: Map<string, IPolicyConfig> = new Map();

  public async getPolicyForOrg(orgId: string): Promise<IPolicyConfig> {
    const cacheKey = `policy:${orgId}`;
    const cached = await cache.get<IPolicyConfig>(cacheKey);
    if (cached) return cached;

    let policy = this.policies.get(orgId);
    if (!policy) {
      policy = {
        organizationId: orgId,
        rules: {},
        excludePaths: ['node_modules/**', 'dist/**', '**/*.min.js'],
        maxViolationsAllowed: 50,
      };
      this.policies.set(orgId, policy);
    }

    await cache.set(cacheKey, policy, { ttlSeconds: 600, tags: [`org:${orgId}`] });
    return policy;
  }

  public async updatePolicy(orgId: string, updates: Partial<IPolicyConfig>): Promise<IPolicyConfig> {
    const current = await this.getPolicyForOrg(orgId);
    const updated: IPolicyConfig = {
      ...current,
      ...updates,
      rules: {
        ...current.rules,
        ...(updates.rules || {}),
      },
    };

    this.policies.set(orgId, updated);
    await cache.delete(`policy:${orgId}`);
    return updated;
  }
}

export const policyService = new PolicyService();
