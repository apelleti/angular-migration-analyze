import { ConfigurationManager } from '../../src/utils/ConfigurationManager';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('ConfigurationManager', () => {
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.NG_MIGRATE_REGISTRY;
    delete process.env.NG_MIGRATE_CACHE;
    delete process.env.NG_MIGRATE_TIMEOUT;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.NO_PROXY;
  });

  describe('loadConfiguration', () => {
    it('should return default configuration when no config file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      expect(config).toEqual({
        registry: 'https://registry.npmjs.org',
        cache: {
          enabled: true,
          ttl: 300000,
          maxSize: 100
        },
        network: {
          timeout: 30000,
          retries: 3,
          retryDelay: 1000
        },
        analysis: {
          includeDevDependencies: true,
          checkVulnerabilities: true,
          checkLicenses: true,
          offlineMode: false
        }
      });
    });

    it('should load configuration from .ng-migrate.json', () => {
      const customConfig = {
        registry: 'https://custom-registry.com',
        cache: {
          enabled: false
        },
        network: {
          timeout: 60000
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(customConfig));

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      expect(config.registry).toBe('https://custom-registry.com');
      expect(config.cache.enabled).toBe(false);
      expect(config.cache.ttl).toBe(300000); // Default value preserved
      expect(config.network.timeout).toBe(60000);
      expect(config.network.retries).toBe(3); // Default value preserved
    });

    it('should override with environment variables', () => {
      process.env.NG_MIGRATE_REGISTRY = 'https://env-registry.com';
      process.env.NG_MIGRATE_CACHE = 'false';
      process.env.NG_MIGRATE_TIMEOUT = '45000';

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      expect(config.registry).toBe('https://env-registry.com');
      expect(config.cache.enabled).toBe(false);
      expect(config.network.timeout).toBe(45000);
    });

    it('should configure proxy from environment variables', () => {
      process.env.HTTP_PROXY = 'http://proxy.company.com:8080';
      process.env.NO_PROXY = 'localhost,127.0.0.1';

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      expect(config.network.proxy).toEqual({
        enabled: true,
        host: 'proxy.company.com',
        port: 8080,
        protocol: 'http',
        noProxy: ['localhost', '127.0.0.1']
      });
    });

    it('should handle HTTPS proxy configuration', () => {
      process.env.HTTPS_PROXY = 'https://secure-proxy.company.com:443';

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      expect(config.network.proxy).toEqual({
        enabled: true,
        host: 'secure-proxy.company.com',
        port: 443,
        protocol: 'https',
        noProxy: []
      });
    });

    it('should merge all configuration sources with correct precedence', () => {
      // File config
      const fileConfig = {
        registry: 'https://file-registry.com',
        cache: {
          enabled: true,
          ttl: 600000
        },
        network: {
          timeout: 20000
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fileConfig));

      // Environment overrides
      process.env.NG_MIGRATE_REGISTRY = 'https://env-registry.com';
      process.env.NG_MIGRATE_TIMEOUT = '90000';

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      // Environment should override file
      expect(config.registry).toBe('https://env-registry.com');
      expect(config.network.timeout).toBe(90000);
      // File config should override defaults
      expect(config.cache.ttl).toBe(600000);
      // Default should be used when not specified
      expect(config.network.retries).toBe(3);
    });

    it('should handle invalid JSON in config file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Erreur lors du chargement')
      );
      expect(config).toEqual(expect.objectContaining({
        registry: 'https://registry.npmjs.org' // Default config
      }));

      consoleWarnSpy.mockRestore();
    });

    it('should validate configuration values', () => {
      const invalidConfig = {
        network: {
          timeout: -1000, // Invalid
          retries: 0 // Invalid
        },
        cache: {
          ttl: -5000 // Invalid
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      // Should use defaults for invalid values
      expect(config.network.timeout).toBe(30000);
      expect(config.network.retries).toBe(3);
      expect(config.cache.ttl).toBe(300000);
    });
  });

  describe('generateDefaultConfigFile', () => {
    it('should create default config file', () => {
      ConfigurationManager.generateDefaultConfigFile(mockProjectRoot);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.ng-migrate.json'),
        expect.any(String)
      );

      const writtenContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(parsed).toHaveProperty('registry');
      expect(parsed).toHaveProperty('cache');
      expect(parsed).toHaveProperty('network');
      expect(parsed).toHaveProperty('analysis');
    });

    it('should format JSON with proper indentation', () => {
      ConfigurationManager.generateDefaultConfigFile(mockProjectRoot);

      const writtenContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      
      // Check for 2-space indentation
      expect(writtenContent).toMatch(/^\{\n  /);
      expect(writtenContent).toContain('  "registry":');
    });

    it('should handle write errors', () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => {
        ConfigurationManager.generateDefaultConfigFile(mockProjectRoot);
      }).toThrow('Permission denied');
    });

    it('should include helpful comments in generated file', () => {
      ConfigurationManager.generateDefaultConfigFile(mockProjectRoot);

      const writtenContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      // Check for proxy configuration template
      expect(parsed.network.proxy).toBeDefined();
      expect(parsed.network.proxy.enabled).toBe(false);
      expect(parsed.network.proxy.host).toBe('proxy.company.com');
    });
  });

  // TODO: loadFromPackageJson method doesn't exist in ConfigurationManager
  // describe('loadFromPackageJson', () => {
  //   it('should detect package manager from lockfiles', () => {
  //     (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
  //       return filePath.includes('yarn.lock');
  //     });

  //     const metadata = ConfigurationManager.loadFromPackageJson(mockProjectRoot);

  //     expect(metadata.packageManager).toBe('yarn');
  //   });

  //   it('should detect npm as package manager', () => {
  //     (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
  //       return filePath.includes('package-lock.json');
  //     });

  //     const metadata = ConfigurationManager.loadFromPackageJson(mockProjectRoot);

  //     expect(metadata.packageManager).toBe('npm');
  //   });

  //   it('should detect pnpm as package manager', () => {
  //     (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
  //       return filePath.includes('pnpm-lock.yaml');
  //     });

  //     const metadata = ConfigurationManager.loadFromPackageJson(mockProjectRoot);

  //     expect(metadata.packageManager).toBe('pnpm');
  //   });

  //   it('should default to npm when no lockfile found', () => {
  //     (fs.existsSync as jest.Mock).mockReturnValue(false);

  //     const metadata = ConfigurationManager.loadFromPackageJson(mockProjectRoot);

  //     expect(metadata.packageManager).toBe('npm');
  //   });

  //   it('should extract node version', () => {
  //     const metadata = ConfigurationManager.loadFromPackageJson(mockProjectRoot);

  //     expect(metadata.nodeVersion).toBeDefined();
  //     expect(metadata.nodeVersion).toMatch(/^v?\d+\.\d+\.\d+/);
  //   });
  // });

  describe('configuration validation', () => {
    it('should validate registry URL', () => {
      const configWithInvalidRegistry = {
        registry: 'not-a-url'
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(configWithInvalidRegistry));

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      // Should fallback to default
      expect(config.registry).toBe('https://registry.npmjs.org');
    });

    it('should validate cache configuration', () => {
      const configWithInvalidCache = {
        cache: {
          enabled: 'yes', // Should be boolean
          ttl: '5 minutes', // Should be number
          maxSize: -10 // Should be positive
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(configWithInvalidCache));

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      expect(config.cache.enabled).toBe(true); // Default
      expect(config.cache.ttl).toBe(300000); // Default
      expect(config.cache.maxSize).toBe(100); // Default
    });

    it('should handle missing required fields gracefully', () => {
      const incompleteConfig = {
        // Missing most fields
        network: {
          timeout: 15000
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(incompleteConfig));

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      expect(config.registry).toBeDefined();
      expect(config.cache).toBeDefined();
      expect(config.analysis).toBeDefined();
      expect(config.network.timeout).toBe(15000);
    });
  });

  describe('proxy configuration parsing', () => {
    it('should parse proxy URL with authentication', () => {
      process.env.HTTP_PROXY = 'http://user:pass@proxy.company.com:8080';

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      expect(config.network.proxy).toEqual({
        enabled: true,
        host: 'proxy.company.com',
        port: 8080,
        protocol: 'http',
        auth: {
          username: 'user',
          password: 'pass'
        },
        noProxy: []
      });
    });

    it('should handle proxy URL without port', () => {
      process.env.HTTP_PROXY = 'http://proxy.company.com';

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      expect(config.network.proxy?.port).toBe(80); // Default HTTP port
    });

    it('should handle malformed proxy URLs', () => {
      process.env.HTTP_PROXY = 'not a valid url';

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = ConfigurationManager.loadConfiguration(mockProjectRoot);

      expect(config.network.proxy).toBeUndefined();
    });
  });
});