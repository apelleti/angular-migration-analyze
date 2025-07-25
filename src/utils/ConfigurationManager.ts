import * as fs from 'fs';
import * as path from 'path';

import type { AnalyzerConfig } from '../types/index.js';
import { AnalyzerConfigSchema } from '../types/index.js';

export class ConfigurationManager {
  private static readonly CONFIG_FILE_NAME = '.ng-migrate.json';
  private static readonly DEFAULT_CONFIG: AnalyzerConfig = {
    registry: 'https://registry.npmjs.org',
    timeout: 10000,
    retries: 3,
    maxConcurrentRequests: 10,
    network: {
      proxy: {
        enabled: false,
        protocol: 'http',
        bypassList: [],
      },
      strictSSL: true,
      timeout: 30000,
    },
    cache: {
      enabled: true,
      ttl: 300000,
      maxSize: 100,
      persistToDisk: false,
      diskCachePath: './.ng-migrate-cache',
    },
    analysis: {
      includeDevDependencies: true,
      checkVulnerabilities: true,
      skipOptionalPeerDeps: false,
      excludePackages: [],
      offlineMode: false,
    },
  };

  static loadConfiguration(projectRoot: string = process.cwd()): AnalyzerConfig {
    // Try to load configuration from multiple sources
    const config = {
      ...this.DEFAULT_CONFIG,
      ...this.loadFromFile(projectRoot),
      ...this.loadFromEnvironment(),
    };

    // Validate configuration
    try {
      return AnalyzerConfigSchema.parse(config);
    } catch (error) {
      console.warn('Invalid configuration, using defaults:', error.message);
      return this.DEFAULT_CONFIG;
    }
  }

  private static loadFromFile(projectRoot: string): Partial<AnalyzerConfig> {
    const configPath = path.join(projectRoot, this.CONFIG_FILE_NAME);

    try {
      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        const parsedConfig = JSON.parse(fileContent);
        console.log(`📄 Configuration loaded from ${this.CONFIG_FILE_NAME}`);
        return parsedConfig;
      }
    } catch (error) {
      console.warn(`Failed to load configuration from ${configPath}:`, error.message);
    }

    return {};
  }

  private static loadFromEnvironment(): Partial<AnalyzerConfig> {
    const envConfig: Partial<AnalyzerConfig> = {};

    // Registry from environment
    if (process.env.NG_MIGRATE_REGISTRY) {
      envConfig.registry = process.env.NG_MIGRATE_REGISTRY;
    }

    // Timeout from environment
    if (process.env.NG_MIGRATE_TIMEOUT) {
      envConfig.timeout = parseInt(process.env.NG_MIGRATE_TIMEOUT, 10);
    }

    // Cache settings from environment
    if (process.env.NG_MIGRATE_CACHE === 'false') {
      envConfig.cache = {
        ...envConfig.cache,
        enabled: false,
        ttl: 300000,
        maxSize: 100,
        persistToDisk: false,
        diskCachePath: '.cache',
      };
    }

    // Proxy settings from environment
    if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      if (proxyUrl) {
        try {
          const url = new URL(proxyUrl);
          envConfig.network = {
            ...envConfig.network,
            proxy: {
              enabled: true,
              host: url.hostname,
              port: parseInt(url.port || '80', 10),
              protocol: url.protocol.replace(':', '') as 'http' | 'https',
              bypassList: process.env.NO_PROXY?.split(',') || [],
            },
          };
        } catch (error) {
          console.warn('Invalid proxy URL in environment:', proxyUrl);
        }
      }
    }

    // SSL settings from environment
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      envConfig.network = { ...envConfig.network, strictSSL: false };
    }

    return envConfig;
  }

  static saveConfiguration(config: AnalyzerConfig, projectRoot: string = process.cwd()): void {
    const configPath = path.join(projectRoot, this.CONFIG_FILE_NAME);

    try {
      // Validate configuration before saving
      const validatedConfig = AnalyzerConfigSchema.parse(config);

      fs.writeFileSync(configPath, JSON.stringify(validatedConfig, null, 2), 'utf8');

      console.log(`💾 Configuration saved to ${this.CONFIG_FILE_NAME}`);
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  static generateDefaultConfigFile(projectRoot: string = process.cwd()): void {
    const configPath = path.join(projectRoot, this.CONFIG_FILE_NAME);

    if (fs.existsSync(configPath)) {
      console.warn(`Configuration file ${this.CONFIG_FILE_NAME} already exists`);
      return;
    }

    const exampleConfig = {
      registry: 'https://registry.npmjs.org',
      cache: {
        enabled: true,
        ttl: 300000,
      },
      analysis: {
        includeDevDependencies: true,
        checkVulnerabilities: true,
        excludePackages: ['@types/*', 'eslint-*'],
      },
      network: {
        proxy: {
          enabled: false,
          host: 'proxy.company.com',
          port: 8080,
        },
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2), 'utf8');

    console.log(`📝 Default configuration file created: ${this.CONFIG_FILE_NAME}`);
  }
}
