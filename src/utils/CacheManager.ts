import * as fs from 'fs';
import * as path from 'path';
import type { NpmPackageInfo } from './NpmRegistryClient.js';
import type { AnalyzerConfig } from '../types/index.js';

export interface CacheEntry {
  data: NpmPackageInfo;
  timestamp: number;
  registry: string;
}

export interface CacheData {
  version: string;
  lastUpdated: string;
  entries: Record<string, CacheEntry>;
}

export class CacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private cachePath: string;
  private config: AnalyzerConfig;
  private isDirty = false;

  constructor(config: AnalyzerConfig, projectRoot: string) {
    this.config = config;
    this.cachePath = path.join(projectRoot, '.migration-cache.json');
    
    if (this.config.cache.enabled && this.config.cache.persistToDisk) {
      this.loadFromDisk();
    }
  }

  get(packageName: string): NpmPackageInfo | null {
    const entry = this.memoryCache.get(packageName);
    
    if (!entry) return null;
    
    // Vérifier l'expiration
    const age = Date.now() - entry.timestamp;
    if (age > this.config.cache.ttl) {
      this.memoryCache.delete(packageName);
      this.isDirty = true;
      return null;
    }
    
    // Vérifier que l'entrée vient du bon registry
    if (entry.registry !== this.config.registry) {
      return null;
    }
    
    return entry.data;
  }

  set(packageName: string, data: NpmPackageInfo): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      registry: this.config.registry,
    };
    
    this.memoryCache.set(packageName, entry);
    this.isDirty = true;
    
    // Limiter la taille du cache
    if (this.memoryCache.size > this.config.cache.maxSize) {
      this.evictOldest();
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  private loadFromDisk(): void {
    if (!fs.existsSync(this.cachePath)) {
      return;
    }
    
    try {
      const content = fs.readFileSync(this.cachePath, 'utf-8');
      const cacheData: CacheData = JSON.parse(content);
      
      // Vérifier la version du cache
      if (cacheData.version !== '1.0') {
        console.log('⚠️  Version de cache incompatible, cache réinitialisé');
        return;
      }
      
      // Charger les entrées valides
      let loaded = 0;
      for (const [packageName, entry] of Object.entries(cacheData.entries)) {
        // Ne charger que les entrées du même registry et non expirées
        const age = Date.now() - entry.timestamp;
        if (entry.registry === this.config.registry && age < this.config.cache.ttl) {
          this.memoryCache.set(packageName, entry);
          loaded++;
        }
      }
      
      if (loaded > 0) {
        console.log(`📦 ${loaded} entrées chargées depuis le cache`);
      }
    } catch (error) {
      console.warn('⚠️  Impossible de charger le cache:', (error as Error).message);
    }
  }

  saveToDisk(): void {
    if (!this.config.cache.persistToDisk || !this.isDirty) {
      return;
    }
    
    try {
      const cacheData: CacheData = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        entries: Object.fromEntries(this.memoryCache),
      };
      
      fs.writeFileSync(this.cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
      this.isDirty = false;
    } catch (error) {
      console.warn('⚠️  Impossible de sauvegarder le cache:', (error as Error).message);
    }
  }

  clear(): void {
    this.memoryCache.clear();
    this.isDirty = true;
    
    if (fs.existsSync(this.cachePath)) {
      try {
        fs.unlinkSync(this.cachePath);
        console.log('🗑️  Cache supprimé');
      } catch (error) {
        console.warn('⚠️  Impossible de supprimer le cache:', (error as Error).message);
      }
    }
  }

  getStats(): { size: number; oldestEntry: Date | null; newestEntry: Date | null } {
    let oldest: number | null = null;
    let newest: number | null = null;
    
    for (const entry of this.memoryCache.values()) {
      if (oldest === null || entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
      if (newest === null || entry.timestamp > newest) {
        newest = entry.timestamp;
      }
    }
    
    return {
      size: this.memoryCache.size,
      oldestEntry: oldest ? new Date(oldest) : null,
      newestEntry: newest ? new Date(newest) : null,
    };
  }
}