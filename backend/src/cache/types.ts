export interface ICacheItem<T = any> {
  value: T;
  expiresAt: number;
  tags: string[];
  createdAt: number;
  hits: number;
}

export interface ICacheOptions {
  ttlSeconds?: number;
  tags?: string[];
  slidingExpiration?: boolean;
}

export interface ICacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRatio: number;
  memoryUsageEstimateBytes: number;
}
