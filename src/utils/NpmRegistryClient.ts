import http from 'http';
import https from 'https';
import * as zlib from 'zlib';

import pLimit from 'p-limit';

import type { AnalyzerConfig } from '../types/index.js';
import { NetworkError, ParseError } from '../types/index.js';
import { CacheManager } from './CacheManager.js';

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

export class NpmRegistryClient {
  private cacheManager: CacheManager;
  private readonly config: AnalyzerConfig;
  private connectionTested = false;
  private isOnline = true;
  private registryType: 'npm' | 'artifactory' | 'unknown' = 'unknown';
  private projectRoot: string;

  constructor(config: AnalyzerConfig, projectRoot: string = process.cwd()) {
    this.config = config;
    this.projectRoot = projectRoot;
    this.cacheManager = new CacheManager(config, projectRoot);
    this.detectRegistryType();

    if (config.analysis.offlineMode) {
      this.isOnline = false;
      console.log('🔌 Mode hors ligne activé - utilisation du cache local');
    }
  }

  private detectRegistryType(): void {
    const url = this.config.registry.toLowerCase();
    if (url.includes('registry.npmjs.org')) {
      this.registryType = 'npm';
    } else if (url.includes('artifactory') || url.includes('jfrog')) {
      this.registryType = 'artifactory';
    }
  }

  async testConnection(): Promise<boolean> {
    if (this.connectionTested) return this.isOnline;
    this.connectionTested = true;

    const startTime = Date.now();
    const testPackage = 'express'; // Package très stable pour tester

    try {
      await this.makeRequest(testPackage);
      this.isOnline = true;
      const duration = Date.now() - startTime;
      
      console.log(`✅ Connexion au registry ${this.registryType} réussie (${duration}ms)`);
      console.log(`   Registry: ${this.config.registry}`);
      
      return true;
    } catch (error) {
      this.isOnline = false;
      const duration = Date.now() - startTime;
      
      console.error('\n❌ ERREUR DE CONNEXION AU REGISTRY\n');
      console.error(`Type de registry: ${this.registryType}`);
      console.error(`URL: ${this.config.registry}`);
      console.error(`Durée avant échec: ${duration}ms`);
      console.error(`Message d'erreur: ${(error as any).message}`);

      // Messages d'aide spécifiques selon le type d'erreur
      if ((error as any).code === 'ENOTFOUND') {
        console.error('\n🔍 PROBLÈME: Le serveur registry n\'est pas accessible');
        console.error('   SOLUTIONS:');
        console.error('   1. Vérifiez votre connexion internet');
        console.error('   2. Vérifiez l\'URL du registry dans votre configuration');
        if (this.registryType === 'artifactory') {
          console.error('   3. Vérifiez que votre serveur Artifactory est démarré');
          console.error('   4. Vérifiez les paramètres VPN si nécessaire');
        }
      } else if ((error as any).code === 'ETIMEDOUT' || (error as any).code === 'ECONNREFUSED') {
        console.error('\n⏱️  PROBLÈME: Timeout ou connexion refusée');
        console.error('   SOLUTIONS:');
        console.error('   1. Vérifiez les paramètres de pare-feu');
        console.error('   2. Vérifiez les paramètres proxy:');
        console.error(`      HTTP_PROXY=${process.env.HTTP_PROXY || 'non défini'}`);
        console.error(`      HTTPS_PROXY=${process.env.HTTPS_PROXY || 'non défini'}`);
        if (this.registryType === 'artifactory') {
          console.error('   3. Vérifiez les ports Artifactory (généralement 8081 ou 8082)');
        }
      } else if ((error as any).statusCode === 401) {
        console.error('\n🔐 PROBLÈME: Authentification requise');
        console.error('   SOLUTIONS:');
        console.error('   1. Connectez-vous au registry: npm login');
        if (this.registryType === 'artifactory') {
          console.error('   2. Pour Artifactory, vérifiez votre fichier .npmrc');
          console.error('   3. Assurez-vous que votre token d\'accès est valide');
        }
      } else if ((error as any).statusCode === 403) {
        console.error('\n🚫 PROBLÈME: Accès refusé');
        console.error('   SOLUTIONS:');
        console.error('   1. Vérifiez vos permissions sur le registry');
        if (this.registryType === 'artifactory') {
          console.error('   2. Vérifiez les permissions du repository dans Artifactory');
        }
      }

      console.error('\n💡 CONSEIL: Pour continuer l\'analyse sans connexion, utilisez:');
      console.error('   ama analyze --offline\n');

      return false;
    }
  }

  async getPackageInfo(packageName: string): Promise<NpmPackageInfo | null> {
    // Vérifier le cache d'abord
    const cached = this.cacheManager.get(packageName);
    if (cached) {
      return cached;
    }

    // En mode offline, on ne peut que retourner les données cachées
    if (!this.isOnline) {
      return null;
    }

    if (!this.connectionTested) {
      await this.testConnection();
      if (!this.isOnline) {
        // Si la connexion échoue, essayer le cache même s'il est expiré
        const cachedOffline = this.cacheManager.get(packageName);
        if (cachedOffline) {
          console.log(`📦 Utilisation du cache expiré pour ${packageName} (mode offline)`);
          return cachedOffline;
        }
        return null;
      }
    }

    try {
      const data = await this.makeRequest(packageName);
      this.cacheManager.set(packageName, data);
      return data;
    } catch (error) {
      if ((error as any).statusCode === 404) {
        console.warn(`⚠️  Package '${packageName}' introuvable sur ${this.registryType}`);
      } else {
        console.error(`❌ Erreur lors de la récupération de '${packageName}': ${(error as any).message}`);
      }
      return null;
    }
  }

  async getBulkPackageInfo(packageNames: string[]): Promise<Record<string, NpmPackageInfo>> {
    const limit = pLimit(this.config.maxConcurrentRequests);
    const results: Record<string, NpmPackageInfo> = {};

    await Promise.all(
      packageNames.map(name =>
        limit(async () => {
          const info = await this.getPackageInfo(name);
          if (info) results[name] = info;
        })
      )
    );

    return results;
  }

  async getAngularCompatibilityMatrix(): Promise<any> {
    // Matrice de compatibilité Angular codée en dur pour le MVP
    return {
      '20': { node: '>=18.19.1 || >=20.11.1 || >=22.0.0', typescript: '>=5.6.0 <5.8.0' },
      '19': { node: '>=18.19.1 || >=20.11.1 || >=22.0.0', typescript: '>=5.5.0 <5.7.0' },
      '18': { node: '>=18.19.1', typescript: '>=5.4.0 <5.6.0' },
      '17': { node: '>=18.13.0', typescript: '>=5.2.0 <5.5.0' },
      '16': { node: '>=16.14.0', typescript: '>=4.9.3 <5.2.0' },
      '15': { node: '>=14.20.0', typescript: '>=4.7.2 <4.9.0' },
    };
  }

  private async makeRequest(packageName: string): Promise<NpmPackageInfo> {
    const url = `${this.config.registry}/${encodeURIComponent(packageName)}`;
    const urlParts = new URL(url);
    const isHttps = urlParts.protocol === 'https:';

    return new Promise((resolve, reject) => {
      const options = {
        hostname: urlParts.hostname,
        port: urlParts.port || (isHttps ? 443 : 80),
        path: urlParts.pathname + urlParts.search,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'User-Agent': 'angular-migration-analyzer/1.0.0',
        },
        timeout: this.config.timeout,
      };

      const httpModule = isHttps ? https : http;
      
      const req = httpModule.request(options, (res) => {
        let data = '';
        const chunks: Buffer[] = [];

        // Handle different response encodings
        let stream: NodeJS.ReadableStream = res;
        const encoding = res.headers['content-encoding'];
        
        if (encoding === 'gzip') {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
          stream = res.pipe(zlib.createInflate());
        }

        stream.on('data', (chunk) => chunks.push(chunk));
        
        stream.on('end', () => {
          data = Buffer.concat(chunks).toString();
          
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch (error) {
              reject(new ParseError(`Réponse invalide du registry pour ${packageName}`));
            }
          } else {
            const error = new NetworkError(
              `Registry ${this.registryType} a retourné le code ${res.statusCode}`,
              res.statusCode || 0
            );
            reject(error);
          }
        });
      });

      req.on('error', (error: any) => {
        reject(new NetworkError(error.message, error.code));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new NetworkError(`Timeout après ${this.config.timeout}ms`, 'ETIMEDOUT'));
      });

      req.end();
    });
  }

  // Sauvegarder le cache à la fin de l'analyse
  async saveCache(): Promise<void> {
    this.cacheManager.saveToDisk();
  }

  // Nettoyer le cache
  clearCache(): void {
    this.cacheManager.clear();
  }

  // Obtenir les statistiques du cache
  getCacheStats(): { size: number; oldestEntry: Date | null; newestEntry: Date | null } {
    return this.cacheManager.getStats();
  }
}