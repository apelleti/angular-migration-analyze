import http from 'http';
import https from 'https';

import pLimit from 'p-limit';
import * as semver from 'semver';

import type { AnalyzerConfig } from '../types/index.js';
import { NetworkError, ValidationError, ParseError } from '../types/index.js';

export interface NpmPackageInfo {
  name: string;
  versions: Record<string, NpmVersionInfo>;
  'dist-tags': {
    latest: string;
    beta?: string;
    rc?: string;
    [key: string]: string | undefined;
  };
  time: Record<string, string>;
}

export interface NpmVersionInfo {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  engines?: Record<string, string>;
  repository?: any;
  deprecated?: string;
  license?: string;
  dist: {
    tarball: string;
    shasum: string;
    integrity?: string;
    unpackedSize?: number;
  };
}

interface CacheEntry {
  data: NpmPackageInfo;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
}

export class NpmRegistryClient {
  private cache = new Map<string, CacheEntry>();
  private readonly config: AnalyzerConfig;
  private connectionTested = false;
  private isOnline = true;
  private rateLimitResetTime = 0;

  constructor(config: AnalyzerConfig) {
    this.config = config;

    // Mode hors ligne
    if (config.analysis.offlineMode) {
      this.isOnline = false;
      console.log('🔌 Mode hors ligne activé - analyse limitée');
      return;
    }

    // Cleanup cache periodically
    setInterval(() => this.cleanupCache(), 60000);
  }

  async getPackageInfo(packageName: string): Promise<NpmPackageInfo | null> {
    // Mode hors ligne
    if (!this.isOnline) {
      console.warn(`Mode hors ligne: impossible de récupérer ${packageName}`);
      return null;
    }

    // Test de connexion initial
    if (!this.connectionTested) {
      await this.testConnection();
    }

    // Input validation
    if (!packageName || typeof packageName !== 'string') {
      throw new ValidationError('Package name must be a non-empty string');
    }

    const sanitizedName = this.sanitizePackageName(packageName);

    // Check cache
    const cached = this.getCachedEntry(sanitizedName);
    if (cached) {
      this.updateCacheAccess(sanitizedName);
      return cached.data;
    }

    // Rate limiting check
    if (Date.now() < this.rateLimitResetTime) {
      throw new NetworkError('Rate limited', 429, this.rateLimitResetTime - Date.now());
    }

    try {
      const data = await this.makeRequestWithRetry(sanitizedName);
      this.setCacheEntry(sanitizedName, data);
      return data;
    } catch (error) {
      if (error instanceof NetworkError) {
        if (error.statusCode === 404) {
          console.warn(`📦 Package ${sanitizedName} non trouvé`);
        } else {
          console.warn(`🌐 Erreur réseau pour ${sanitizedName}: ${error.message}`);
        }
        throw error;
      }
      console.warn(`Failed to fetch package info for ${sanitizedName}:`, error.message);
      return null;
    }
  }

  async getPackageVersion(packageName: string, version: string): Promise<NpmVersionInfo | null> {
    const packageInfo = await this.getPackageInfo(packageName);
    if (!packageInfo) return null;

    try {
      const resolvedVersion = this.resolveVersion(version, packageInfo);
      if (!resolvedVersion) return null;
      return packageInfo.versions[resolvedVersion] || null;
    } catch (error) {
      console.warn(`Failed to resolve version ${version} for ${packageName}:`, error.message);
      return null;
    }
  }

  async getLatestVersion(packageName: string): Promise<string | null> {
    const packageInfo = await this.getPackageInfo(packageName);
    return packageInfo?.['dist-tags']?.latest || null;
  }

  async getBulkPackageInfo(packageNames: string[]): Promise<Record<string, NpmPackageInfo | null>> {
    if (!Array.isArray(packageNames)) {
      throw new ValidationError('Package names must be an array');
    }

    // Use p-limit for better concurrency control
    const limit = pLimit(5); // Max 5 concurrent requests
    const results: Record<string, NpmPackageInfo | null> = {};

    // Create promises with limited concurrency
    const promises = packageNames.map(packageName =>
      limit(async () => {
        try {
          const info = await this.getPackageInfo(packageName);
          results[packageName] = info;
          return { packageName, info };
        } catch (error) {
          console.warn(`Failed to fetch ${packageName}:`, error.message);
          results[packageName] = null;
          return { packageName, info: null };
        }
      })
    );

    // Wait for all promises to complete
    await Promise.all(promises);

    return results;
  }

  async getPackageVulnerabilities(packageName: string, version: string): Promise<any[]> {
    try {
      const auditData = await this.makeAuditRequest(packageName, version);
      return auditData?.vulnerabilities || [];
    } catch (error) {
      console.warn(`Failed to check vulnerabilities for ${packageName}@${version}:`, error.message);
      return [];
    }
  }

  async getAngularCompatibilityMatrix(): Promise<Record<string, any>> {
    try {
      const angularCore = await this.getPackageInfo('@angular/core');
      if (!angularCore) return {};

      const compatibilityMatrix: Record<string, any> = {};

      // Analyze major versions only to reduce processing
      const majorVersions = new Set<number>();
      Object.keys(angularCore.versions).forEach(version => {
        const major = semver.major(version);
        if (major >= 12) {
          // Only include modern versions
          majorVersions.add(major);
        }
      });

      for (const major of majorVersions) {
        // Get the latest version for this major
        const versions = Object.keys(angularCore.versions)
          .filter(v => semver.major(v) === major)
          .sort((a, b) => semver.rcompare(a, b));

        if (versions.length > 0) {
          const latestInMajor = versions[0];
          const versionInfo = angularCore.versions[latestInMajor];

          compatibilityMatrix[major] = {
            version: latestInMajor,
            node: versionInfo.engines?.node,
            typescript: versionInfo.peerDependencies?.typescript,
            releaseDate: angularCore.time[latestInMajor],
          };
        }
      }

      return compatibilityMatrix;
    } catch (error) {
      console.warn('Failed to build Angular compatibility matrix:', error.message);
      return {};
    }
  }

  async testConnection(): Promise<boolean> {
    if (this.connectionTested) return this.isOnline;

    this.connectionTested = true;

    try {
      // Test avec un package très commun
      await this.makeRequest('express');
      this.isOnline = true;
      console.log('✅ Connexion au registry npm réussie');
      return true;
    } catch (error) {
      this.isOnline = false;
      console.warn('❌ Impossible de se connecter au registry:', error.message);

      console.log('\n🔧 Vérifiez votre configuration réseau:');
      console.log(`   Registry: ${this.config.registry}`);
      console.log(`   Proxy: ${this.config.network.proxy?.enabled ? 'Configuré' : 'Aucun'}`);
      console.log(`   SSL strict: ${this.config.network.strictSSL ? 'Oui' : 'Non'}`);

      return false;
    }
  }

  private async makeRequestWithRetry(packageName: string): Promise<NpmPackageInfo> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
          await this.delay(delay);
        }

        return await this.makeRequest(packageName);
      } catch (error) {
        lastError = error as Error;

        if (error instanceof NetworkError) {
          if (error.statusCode === 404) {
            throw error; // Don't retry 404s
          }
          if (error.statusCode === 429 && error.retryAfter) {
            this.rateLimitResetTime = Date.now() + error.retryAfter;
            await this.delay(error.retryAfter);
          }
        }

        console.warn(`Attempt ${attempt + 1} failed for ${packageName}:`, error.message);
      }
    }

    throw lastError;
  }

  private async makeRequest(packageName: string): Promise<NpmPackageInfo> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.config.registry}/${encodeURIComponent(packageName)}`);
      const timeout = this.config.network.timeout || this.config.timeout;

      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET',
        headers: {
          'User-Agent': `angular-migration-analyzer/1.0.0 (Node.js ${process.version})`,
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        timeout,
        rejectUnauthorized: this.config.network.strictSSL,
      };

      // Handle proxy if configured
      if (this.config.network.proxy?.enabled && this.config.network.proxy.host) {
        const proxy = this.config.network.proxy;
        options.hostname = proxy.host;
        options.port = proxy.port;
        options.path = url.href;
        options.headers['Host'] = url.hostname;
      }

      const protocol = url.protocol === 'https:' ? https : http;

      const request = protocol.get(options, response => {
        let data = '';

        response.on('data', chunk => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            if (response.statusCode === 200) {
              const packageInfo = JSON.parse(data);
              resolve(packageInfo);
            } else if (response.statusCode === 404) {
              reject(new NetworkError(`Package ${packageName} not found`, 404));
            } else if (response.statusCode === 429) {
              const retryAfterHeader = response.headers['retry-after'];
              const retryAfter =
                parseInt(typeof retryAfterHeader === 'string' ? retryAfterHeader : '60') * 1000;
              reject(new NetworkError('Rate limited', 429, retryAfter));
            } else {
              reject(
                new NetworkError(
                  `HTTP ${response.statusCode}: ${response.statusMessage}`,
                  response.statusCode
                )
              );
            }
          } catch (error) {
            reject(new ParseError(`JSON parse error: ${error.message}`));
          }
        });
      });

      request.on('error', error => {
        reject(new NetworkError(`Request failed: ${error.message}`));
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new NetworkError(`Request timeout after ${timeout}ms`));
      });
    });
  }

  private async makeAuditRequest(packageName: string, version: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        [packageName]: version,
      });

      const options = {
        hostname: 'registry.npmjs.org',
        port: 443,
        path: '/-/npm/v1/security/audits',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'angular-migration-analyzer/1.0.0',
        },
        timeout: this.config.timeout,
      };

      const request = https.request(options, response => {
        let data = '';

        response.on('data', chunk => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            if (response.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new NetworkError(`Audit API error: ${response.statusCode}`));
            }
          } catch (error) {
            reject(new ParseError(`Audit response parse error: ${error.message}`));
          }
        });
      });

      request.on('error', error => {
        reject(new NetworkError(`Audit request failed: ${error.message}`));
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new NetworkError('Audit request timeout'));
      });

      request.write(postData);
      request.end();
    });
  }

  private resolveVersion(versionRange: string, packageInfo: NpmPackageInfo): string | null {
    if (!versionRange || !packageInfo.versions) return null;

    const versions = Object.keys(packageInfo.versions);

    // Exact version
    if (versions.includes(versionRange)) {
      return versionRange;
    }

    // Latest tag
    if (versionRange === 'latest') {
      return packageInfo['dist-tags'].latest;
    }

    // Semver range resolution
    try {
      const satisfying = versions.filter(v => {
        try {
          return semver.satisfies(v, versionRange);
        } catch {
          return false;
        }
      });

      return satisfying.sort((a, b) => semver.rcompare(a, b))[0] || null;
    } catch (error) {
      console.warn(`Failed to resolve version range ${versionRange}:`, error.message);
      return null;
    }
  }

  private sanitizePackageName(packageName: string): string {
    // Remove any potentially dangerous characters but keep scoped packages (@scope/name)
    // eslint-disable-next-line no-useless-escape
    return packageName.replace(/[^a-zA-Z0-9@\/\-_.]/g, '');
  }

  private getCachedEntry(packageName: string): CacheEntry | null {
    const entry = this.cache.get(packageName);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.config.cache.ttl) {
      this.cache.delete(packageName);
      return null;
    }

    return entry;
  }

  private setCacheEntry(packageName: string, data: NpmPackageInfo): void {
    if (!this.config.cache.enabled) return;

    // Check cache size limit
    if (this.cache.size >= this.config.cache.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(packageName, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccess: Date.now(),
    });
  }

  private updateCacheAccess(packageName: string): void {
    const entry = this.cache.get(packageName);
    if (entry) {
      entry.accessCount++;
      entry.lastAccess = Date.now();
    }
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.cache.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hitRate: number; oldestEntry: number; newestEntry: number } {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    const cacheHits = entries.filter(e => e.accessCount > 1).length;

    return {
      size: entries.length,
      hitRate: entries.length > 0 ? (cacheHits / entries.length) * 100 : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }
}
