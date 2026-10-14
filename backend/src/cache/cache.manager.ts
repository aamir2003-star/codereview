import { ICacheItem, ICacheOptions, ICacheStats } from './types';

export class CacheManager {
  private static instance: CacheManager;
  private l1Cache: Map<string, ICacheItem> = new Map();
  private l2Cache: Map<string, ICacheItem> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private defaultTtlSeconds: number = 300;

  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  public async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // Check L1
    const l1Item = this.l1Cache.get(key);
    if (l1Item) {
      if (l1Item.expiresAt > now) {
        l1Item.hits++;
        this.hits++;
        return l1Item.value as T;
      }
      this.l1Cache.delete(key);
    }

    // Check L2
    const l2Item = this.l2Cache.get(key);
    if (l2Item) {
      if (l2Item.expiresAt > now) {
        l2Item.hits++;
        this.hits++;
        // Promote to L1
        this.l1Cache.set(key, { ...l2Item });
        return l2Item.value as T;
      }
      this.l2Cache.delete(key);
    }

    this.misses++;
    return null;
  }

  public async set<T>(key: string, value: T, options: ICacheOptions = {}): Promise<void> {
    const ttl = (options.ttlSeconds ?? this.defaultTtlSeconds) * 1000;
    const now = Date.now();
    const item: ICacheItem<T> = {
      value,
      expiresAt: now + ttl,
      tags: options.tags || [],
      createdAt: now,
      hits: 0,
    };

    this.l1Cache.set(key, item);
    this.l2Cache.set(key, item);
  }

  public async delete(key: string): Promise<boolean> {
    const deletedL1 = this.l1Cache.delete(key);
    const deletedL2 = this.l2Cache.delete(key);
    return deletedL1 || deletedL2;
  }

  public async invalidateTags(tags: string[]): Promise<number> {
    let count = 0;
    for (const tag of tags) {
      for (const [key, item] of this.l2Cache.entries()) {
        if (item.tags.includes(tag)) {
          this.l2Cache.delete(key);
          this.l1Cache.delete(key);
          count++;
        }
      }
    }
    return count;
  }

  public getStats(): ICacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRatio = totalRequests > 0 ? this.hits / totalRequests : 0;
    const size = this.l1Cache.size + this.l2Cache.size;

    return {
      size,
      hits: this.hits,
      misses: this.misses,
      hitRatio: Number(hitRatio.toFixed(3)),
      memoryUsageEstimateBytes: size * 512,
    };
  }

  public clear(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const cache = CacheManager.getInstance();
