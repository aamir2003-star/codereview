import { cache } from './cache.manager';

export class CacheInvalidationService {
  private dependencyMap: Map<string, Set<string>> = new Map();

  public registerDependency(entityKey: string, dependentCacheKey: string): void {
    if (!this.dependencyMap.has(entityKey)) {
      this.dependencyMap.set(entityKey, new Set());
    }
    this.dependencyMap.get(entityKey)!.add(dependentCacheKey);
  }

  public async invalidateEntity(entityType: string, entityId: string): Promise<number> {
    const primaryKey = `${entityType}:${entityId}`;
    let invalidatedCount = 0;

    const deleted = await cache.delete(primaryKey);
    if (deleted) invalidatedCount++;

    const dependents = this.dependencyMap.get(primaryKey);
    if (dependents) {
      for (const depKey of dependents) {
        const depDeleted = await cache.delete(depKey);
        if (depDeleted) invalidatedCount++;
      }
      this.dependencyMap.delete(primaryKey);
    }

    const tagCount = await cache.invalidateTags([primaryKey, entityType]);
    invalidatedCount += tagCount;

    return invalidatedCount;
  }
}

export const cacheInvalidation = new CacheInvalidationService();
