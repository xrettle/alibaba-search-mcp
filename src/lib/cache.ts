interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private ttlMs: number;

  constructor(ttlSeconds: number = 1800) {
    this.ttlMs = ttlSeconds * 1000;
  }

  /**
   * Store a value in the cache with the configured TTL.
   */
  set<T>(key: string, value: T): void {
    const expiry = Date.now() + this.ttlMs;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Retrieve a value from the cache. Returns null if missing or expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Delete an entry from the cache.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
  }
}

// Initialize a singleton cache using CACHE_TTL_SECONDS environment variable
const ttlSeconds = parseInt(process.env.CACHE_TTL_SECONDS || "1800", 10);
export const globalCache = new MemoryCache(ttlSeconds);
