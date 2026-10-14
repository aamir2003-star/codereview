export class ClientCacheStore {
  private memoryCache: Map<string, { value: any; expiresAt: number }> = new Map();

  public get<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value as T;
  }

  public set<T>(key: string, value: T, ttlSeconds: number = 60): void {
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public remove(key: string): void {
    this.memoryCache.delete(key);
  }

  public clear(): void {
    this.memoryCache.clear();
  }
}

export const clientCache = new ClientCacheStore();
