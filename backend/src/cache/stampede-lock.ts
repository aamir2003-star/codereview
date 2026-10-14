export class StampedeLock {
  private inFlight: Map<string, Promise<any>> = new Map();

  public async fetchWithLock<T>(
    key: string,
    fetcher: () => Promise<T>,
    timeoutMs: number = 10000
  ): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Cache stampede lock timeout for key: ${key}`));
      }, timeoutMs);
    });

    const executionPromise = (async () => {
      try {
        const result = await Promise.race([fetcher(), timeoutPromise]);
        return result;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, executionPromise);
    return executionPromise;
  }

  public getInFlightCount(): number {
    return this.inFlight.size;
  }
}

export const stampedeLock = new StampedeLock();
