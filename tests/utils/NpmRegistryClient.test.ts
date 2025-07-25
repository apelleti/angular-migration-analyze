import { NpmRegistryClient } from '../../src/utils/NpmRegistryClient';
import { AnalyzerConfig, NetworkError } from '../../src/types';
import * as https from 'https';
import * as http from 'http';
import { EventEmitter } from 'events';

jest.mock('https');
jest.mock('http');

describe('NpmRegistryClient', () => {
  const mockConfig: AnalyzerConfig = {
    registry: 'https://registry.npmjs.org',
    cache: { enabled: true, ttl: 300000, maxSize: 100 },
    network: { timeout: 30000, retries: 3, retryDelay: 1000 },
    analysis: {
      includeDevDependencies: true,
      checkVulnerabilities: true,
      checkLicenses: true,
      offlineMode: false
    }
  };

  let client: NpmRegistryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    client = new NpmRegistryClient(mockConfig);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getPackageInfo', () => {
    it('should fetch package info successfully', async () => {
      const mockPackageInfo = {
        name: 'test-package',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: 'test-package',
            version: '1.0.0',
            dependencies: { 'lodash': '^4.17.21' }
          }
        }
      };

      const mockResponse = new EventEmitter() as any;
      mockResponse.statusCode = 200;
      mockResponse.headers = { 'content-type': 'application/json' };
      mockResponse.setEncoding = jest.fn();

      const mockRequest = new EventEmitter() as any;
      mockRequest.end = jest.fn();
      mockRequest.setTimeout = jest.fn();
      mockRequest.on = jest.fn((event, handler) => {
        if (event === 'error') mockRequest.errorHandler = handler;
        return mockRequest;
      });

      (https.request as jest.Mock).mockReturnValue(mockRequest);

      setTimeout(() => {
        (https.request as jest.Mock).mock.calls[0][1](mockResponse);
        mockResponse.emit('data', JSON.stringify(mockPackageInfo));
        mockResponse.emit('end');
      }, 10);

      const result = await client.getPackageInfo('test-package');

      expect(result).toEqual(mockPackageInfo);
      expect(https.request).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'registry.npmjs.org',
          path: '/test-package',
          method: 'GET'
        }),
        expect.any(Function)
      );
    });

    it('should use cache for repeated requests', async () => {
      const mockPackageInfo = {
        name: 'cached-package',
        'dist-tags': { latest: '1.0.0' },
        versions: {}
      };

      const mockResponse = new EventEmitter() as any;
      mockResponse.statusCode = 200;
      mockResponse.headers = {};
      mockResponse.setEncoding = jest.fn();

      const mockRequest = new EventEmitter() as any;
      mockRequest.end = jest.fn();
      mockRequest.setTimeout = jest.fn();

      (https.request as jest.Mock).mockReturnValue(mockRequest);

      setTimeout(() => {
        (https.request as jest.Mock).mock.calls[0][1](mockResponse);
        mockResponse.emit('data', JSON.stringify(mockPackageInfo));
        mockResponse.emit('end');
      }, 10);

      // First request
      const result1 = await client.getPackageInfo('cached-package');
      expect(https.request).toHaveBeenCalledTimes(1);

      // Second request should use cache
      const result2 = await client.getPackageInfo('cached-package');
      expect(https.request).toHaveBeenCalledTimes(1); // Not called again
      expect(result2).toEqual(result1);
    });

    it('should handle network errors with retry', async () => {
      const mockRequest = new EventEmitter() as any;
      mockRequest.end = jest.fn();
      mockRequest.setTimeout = jest.fn();
      mockRequest.destroy = jest.fn();

      (https.request as jest.Mock).mockReturnValue(mockRequest);

      let attempts = 0;
      (https.request as jest.Mock).mockImplementation(() => {
        const req = new EventEmitter() as any;
        req.end = jest.fn();
        req.setTimeout = jest.fn();
        req.destroy = jest.fn();
        
        setTimeout(() => {
          attempts++;
          if (attempts < 3) {
            req.emit('error', new Error('Network error'));
          } else {
            // Success on third attempt
            const res = new EventEmitter() as any;
            res.statusCode = 200;
            res.headers = {};
            res.setEncoding = jest.fn();
            (https.request as jest.Mock).mock.calls[attempts - 1][1](res);
            res.emit('data', JSON.stringify({ name: 'test-package' }));
            res.emit('end');
          }
        }, 10);
        
        return req;
      });

      const result = await client.getPackageInfo('test-package');
      
      expect(result).toEqual({ name: 'test-package' });
      expect(https.request).toHaveBeenCalledTimes(3);
    });

    it('should handle 404 responses', async () => {
      const mockResponse = new EventEmitter() as any;
      mockResponse.statusCode = 404;
      mockResponse.headers = {};
      mockResponse.setEncoding = jest.fn();

      const mockRequest = new EventEmitter() as any;
      mockRequest.end = jest.fn();
      mockRequest.setTimeout = jest.fn();

      (https.request as jest.Mock).mockReturnValue(mockRequest);

      setTimeout(() => {
        (https.request as jest.Mock).mock.calls[0][1](mockResponse);
        mockResponse.emit('data', 'Not found');
        mockResponse.emit('end');
      }, 10);

      const result = await client.getPackageInfo('non-existent-package');
      expect(result).toBeNull();
    });

    it('should handle rate limiting', async () => {
      const mockResponse = new EventEmitter() as any;
      mockResponse.statusCode = 429;
      mockResponse.headers = { 'retry-after': '60' };
      mockResponse.setEncoding = jest.fn();

      const mockRequest = new EventEmitter() as any;
      mockRequest.end = jest.fn();
      mockRequest.setTimeout = jest.fn();

      (https.request as jest.Mock).mockReturnValue(mockRequest);

      setTimeout(() => {
        (https.request as jest.Mock).mock.calls[0][1](mockResponse);
        mockResponse.emit('data', '');
        mockResponse.emit('end');
      }, 10);

      await expect(client.getPackageInfo('test-package')).rejects.toThrow(NetworkError);
    });

    it('should sanitize package names', async () => {
      await expect(client.getPackageInfo('../../../etc/passwd')).rejects.toThrow();
      await expect(client.getPackageInfo('package-name; rm -rf /')).rejects.toThrow();
    });

    it('should handle offline mode', async () => {
      const offlineConfig = {
        ...mockConfig,
        analysis: { ...mockConfig.analysis, offlineMode: true }
      };
      const offlineClient = new NpmRegistryClient(offlineConfig);

      const result = await offlineClient.getPackageInfo('test-package');
      expect(result).toBeNull();
      expect(https.request).not.toHaveBeenCalled();
    });

    it('should support proxy configuration', async () => {
      const proxyConfig = {
        ...mockConfig,
        network: {
          ...mockConfig.network,
          proxy: {
            enabled: true,
            host: 'proxy.example.com',
            port: 8080,
            protocol: 'http' as const
          }
        }
      };

      const proxyClient = new NpmRegistryClient(proxyConfig);
      
      const mockRequest = new EventEmitter() as any;
      mockRequest.end = jest.fn();
      mockRequest.setTimeout = jest.fn();

      (http.request as jest.Mock).mockReturnValue(mockRequest);

      setTimeout(() => {
        const res = new EventEmitter() as any;
        res.statusCode = 200;
        res.headers = {};
        res.setEncoding = jest.fn();
        (http.request as jest.Mock).mock.calls[0][1](res);
        res.emit('data', JSON.stringify({ name: 'test-package' }));
        res.emit('end');
      }, 10);

      await proxyClient.getPackageInfo('test-package');

      expect(http.request).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'proxy.example.com',
          port: 8080
        }),
        expect.any(Function)
      );
    });
  });

  describe('getLatestVersion', () => {
    it('should get latest version from package info', async () => {
      const mockPackageInfo = {
        name: 'test-package',
        'dist-tags': { latest: '2.0.0', beta: '3.0.0-beta.1' },
        versions: {}
      };

      jest.spyOn(client, 'getPackageInfo').mockResolvedValue(mockPackageInfo);

      const latest = await client.getLatestVersion('test-package');
      expect(latest).toBe('2.0.0');
    });

    it('should get specific tag version', async () => {
      const mockPackageInfo = {
        name: 'test-package',
        'dist-tags': { latest: '2.0.0', beta: '3.0.0-beta.1' },
        versions: {}
      };

      jest.spyOn(client, 'getPackageInfo').mockResolvedValue(mockPackageInfo);

      const beta = await client.getLatestVersion('test-package', 'beta');
      expect(beta).toBe('3.0.0-beta.1');
    });

    it('should return null if package not found', async () => {
      jest.spyOn(client, 'getPackageInfo').mockResolvedValue(null);

      const latest = await client.getLatestVersion('non-existent');
      expect(latest).toBeNull();
    });
  });

  describe('cache management', () => {
    it('should clean up old cache entries', async () => {
      // Add some cache entries
      const mockPackageInfo = {
        name: 'test-package',
        'dist-tags': { latest: '1.0.0' },
        versions: {}
      };

      // Mock the cache directly
      const cache = (client as any).cache as Map<string, any>;
      
      // Add old entry
      cache.set('old-package', {
        data: mockPackageInfo,
        timestamp: Date.now() - 400000, // Older than TTL
        accessCount: 1,
        lastAccess: Date.now() - 400000
      });

      // Add recent entry
      cache.set('new-package', {
        data: mockPackageInfo,
        timestamp: Date.now() - 10000, // Recent
        accessCount: 1,
        lastAccess: Date.now() - 10000
      });

      // Trigger cleanup
      jest.advanceTimersByTime(60000);

      expect(cache.has('old-package')).toBe(false);
      expect(cache.has('new-package')).toBe(true);
    });

    it('should respect cache size limits', async () => {
      const smallCacheConfig = {
        ...mockConfig,
        cache: { ...mockConfig.cache, maxSize: 2 }
      };
      const limitedClient = new NpmRegistryClient(smallCacheConfig);

      // Mock getPackageInfo to add to cache
      const cache = (limitedClient as any).cache as Map<string, any>;
      
      // Add entries up to limit
      for (let i = 0; i < 3; i++) {
        cache.set(`package-${i}`, {
          data: { name: `package-${i}` },
          timestamp: Date.now(),
          accessCount: 1,
          lastAccess: Date.now() - i * 1000 // Different access times
        });
      }

      // Trigger cleanup
      (limitedClient as any).cleanupCache();

      expect(cache.size).toBeLessThanOrEqual(2);
      // Should keep the most recently accessed
      expect(cache.has('package-0')).toBe(true);
      expect(cache.has('package-1')).toBe(true);
      expect(cache.has('package-2')).toBe(false);
    });
  });
});