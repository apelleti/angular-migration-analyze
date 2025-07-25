import { NpmRegistryClient } from '../../src/utils/NpmRegistryClient';
import { AnalyzerConfig } from '../../src/types';

describe('NpmRegistryClient Unit Tests', () => {
  const mockConfig: AnalyzerConfig = {
    registry: 'https://registry.npmjs.org',
    timeout: 10000,
    retries: 3,
    maxConcurrentRequests: 10,
    cache: { 
      enabled: true, 
      ttl: 300000, 
      maxSize: 100,
      persistToDisk: false,
      diskCachePath: '.cache'
    },
    network: { 
      timeout: 30000,
      strictSSL: true,
      proxy: {
        enabled: false,
        protocol: 'http',
        bypassList: []
      }
    },
    analysis: {
      includeDevDependencies: true,
      checkVulnerabilities: true,
      skipOptionalPeerDeps: false,
      excludePackages: [],
      offlineMode: false
    }
  };

  describe('constructor', () => {
    it('should create instance with config', () => {
      const client = new NpmRegistryClient(mockConfig);
      expect(client).toBeDefined();
    });

    it('should handle offline mode', () => {
      const offlineConfig = {
        ...mockConfig,
        analysis: { ...mockConfig.analysis, offlineMode: true }
      };
      const client = new NpmRegistryClient(offlineConfig);
      expect(client).toBeDefined();
    });
  });

  describe('cache operations', () => {
    it('should clear cache', () => {
      const client = new NpmRegistryClient(mockConfig);
      client.clearCache();
      const stats = client.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should get cache stats', () => {
      const client = new NpmRegistryClient(mockConfig);
      const stats = client.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('oldestEntry');
      expect(stats).toHaveProperty('newestEntry');
    });
  });

  describe('offline mode', () => {
    it('should return null in offline mode', async () => {
      const offlineConfig = {
        ...mockConfig,
        analysis: { ...mockConfig.analysis, offlineMode: true }
      };
      const client = new NpmRegistryClient(offlineConfig);
      
      const result = await client.getPackageInfo('test-package');
      expect(result).toBeNull();
    });

    it('should return empty object for bulk fetch in offline mode', async () => {
      const offlineConfig = {
        ...mockConfig,
        analysis: { ...mockConfig.analysis, offlineMode: true }
      };
      const client = new NpmRegistryClient(offlineConfig);
      
      const result = await client.getBulkPackageInfo(['package1', 'package2']);
      expect(result).toEqual({});
    });
  });

  describe('input validation', () => {
    it('should throw error for invalid package name', async () => {
      const client = new NpmRegistryClient(mockConfig);
      
      await expect(client.getPackageInfo('')).rejects.toThrow('Package name must be a non-empty string');
      await expect(client.getPackageInfo(null as any)).rejects.toThrow('Package name must be a non-empty string');
    });

    it('should throw error for invalid package names array', async () => {
      const client = new NpmRegistryClient(mockConfig);
      
      await expect(client.getBulkPackageInfo(null as any)).rejects.toThrow('Package names must be an array');
      await expect(client.getBulkPackageInfo('not-array' as any)).rejects.toThrow('Package names must be an array');
    });
  });
});