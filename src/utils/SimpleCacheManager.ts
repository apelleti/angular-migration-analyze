import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private cacheFile: string;
  
  constructor(cacheDir: string = '.migration-cache') {
    this.cacheFile = join(cacheDir, 'cache.json');
    this.loadCache();
  }
  
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  async set<T>(key: string, data: T, ttl: number = 24 * 60 * 60 * 1000): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    this.saveCache();
  }
  
  private loadCache(): void {
    try {
      if (existsSync(this.cacheFile)) {
        const content = readFileSync(this.cacheFile, 'utf-8');
        const cacheData = JSON.parse(content);
        
        // Load entries into map with validation
        Object.entries(cacheData).forEach(([key, entry]) => {
          // Validate cache entry structure before casting
          if (this.isValidCacheEntry(entry)) {
            this.cache.set(key, entry as CacheEntry<any>);
          } else {
            console.warn(`Invalid cache entry for key ${key}, skipping`);
          }
        });
      }
    } catch (error) {
      // Ignore cache load errors
      console.warn('Failed to load cache:', error.message);
    }
  }
  
  private saveCache(): void {
    try {
      const cacheDir = dirname(this.cacheFile);
      if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
      }
      
      const cacheData = Object.fromEntries(this.cache);
      writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      // Ignore cache save errors
      console.warn('Failed to save cache:', error.message);
    }
  }
  
  clear(): void {
    this.cache.clear();
    this.saveCache();
  }

  private isValidCacheEntry(entry: any): entry is CacheEntry<any> {
    return (
      entry !== null &&
      typeof entry === 'object' &&
      'data' in entry &&
      'timestamp' in entry &&
      'ttl' in entry &&
      typeof entry.timestamp === 'number' &&
      typeof entry.ttl === 'number'
    );
  }
}