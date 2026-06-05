"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalCache = exports.MemoryCache = void 0;
class MemoryCache {
    cache = new Map();
    ttlMs;
    constructor(ttlSeconds = 1800) {
        this.ttlMs = ttlSeconds * 1000;
    }
    /**
     * Store a value in the cache with the configured TTL.
     */
    set(key, value) {
        const expiry = Date.now() + this.ttlMs;
        this.cache.set(key, { value, expiry });
    }
    /**
     * Retrieve a value from the cache. Returns null if missing or expired.
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    /**
     * Delete an entry from the cache.
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear the entire cache.
     */
    clear() {
        this.cache.clear();
    }
}
exports.MemoryCache = MemoryCache;
// Initialize a singleton cache using CACHE_TTL_SECONDS environment variable
const ttlSeconds = parseInt(process.env.CACHE_TTL_SECONDS || "1800", 10);
exports.globalCache = new MemoryCache(ttlSeconds);
