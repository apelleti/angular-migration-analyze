import { PeerDependencyAnalyzer } from '../../src/analyzers/PeerDependencyAnalyzer';
import { AnalyzerConfig } from '../../src/types';
import { NpmRegistryClient } from '../../src/utils/NpmRegistryClient';
import * as fs from 'fs';

jest.mock('fs');
jest.mock('../../src/utils/NpmRegistryClient');

describe('PeerDependencyAnalyzer', () => {
  const mockProjectRoot = '/test/project';
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

  const mockPackageJson = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      '@angular/common': '^17.0.0',
      'rxjs': '^7.8.0'
    },
    devDependencies: {
      '@angular/cli': '^17.0.0'
    }
  };

  const mockNpmClient = {
    getPackageInfo: jest.fn(),
    getLatestVersion: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (NpmRegistryClient as jest.MockedClass<typeof NpmRegistryClient>).mockImplementation(
      () => mockNpmClient as any
    );
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));
  });

  describe('analyze', () => {
    it('should detect missing peer dependencies', async () => {
      // Mock npm responses
      mockNpmClient.getPackageInfo.mockImplementation(async (pkgName: string) => {
        if (pkgName === '@angular/common') {
          return {
            name: '@angular/common',
            versions: {
              '17.0.0': {
                peerDependencies: {
                  '@angular/core': '^17.0.0',
                  'rxjs': '^6.5.3 || ^7.4.0',
                  'tslib': '^2.3.0'
                }
              }
            }
          };
        }
        if (pkgName === '@angular/cli') {
          return {
            name: '@angular/cli',
            versions: {
              '17.0.0': {
                peerDependencies: {
                  '@angular-devkit/architect': '^0.1700.0',
                  '@angular-devkit/core': '^17.0.0'
                }
              }
            }
          };
        }
        return null;
      });

      const analyzer = new PeerDependencyAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.missingPeerDeps).toHaveLength(4); // @angular/core, tslib, @angular-devkit/architect, @angular-devkit/core
      expect(results.missingPeerDeps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            package: '@angular/core',
            requiredBy: '@angular/common',
            requiredVersion: '^17.0.0',
            optional: false
          }),
          expect.objectContaining({
            package: 'tslib',
            requiredBy: '@angular/common',
            requiredVersion: '^2.3.0',
            optional: false
          })
        ])
      );
    });

    it('should handle optional peer dependencies', async () => {
      mockNpmClient.getPackageInfo.mockResolvedValue({
        name: 'test-package',
        versions: {
          '1.0.0': {
            peerDependencies: {
              'optional-dep': '^1.0.0'
            },
            peerDependenciesMeta: {
              'optional-dep': { optional: true }
            }
          }
        }
      });

      const packageJsonWithTestPkg = {
        ...mockPackageJson,
        dependencies: {
          'test-package': '^1.0.0'
        }
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJsonWithTestPkg));

      const analyzer = new PeerDependencyAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      const optionalDep = results.missingPeerDeps.find(dep => dep.package === 'optional-dep');
      expect(optionalDep).toBeDefined();
      expect(optionalDep?.optional).toBe(true);
    });

    it('should not report peer deps that are already installed', async () => {
      mockNpmClient.getPackageInfo.mockResolvedValue({
        name: '@angular/common',
        versions: {
          '17.0.0': {
            peerDependencies: {
              'rxjs': '^7.0.0' // Already in dependencies
            }
          }
        }
      });

      const analyzer = new PeerDependencyAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.missingPeerDeps).toHaveLength(0);
    });

    it('should handle packages without peer dependencies', async () => {
      mockNpmClient.getPackageInfo.mockResolvedValue({
        name: 'simple-package',
        versions: {
          '1.0.0': {
            // No peerDependencies
          }
        }
      });

      const simplePackageJson = {
        dependencies: {
          'simple-package': '^1.0.0'
        }
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(simplePackageJson));

      const analyzer = new PeerDependencyAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.missingPeerDeps).toHaveLength(0);
    });

    it('should handle npm registry errors gracefully', async () => {
      mockNpmClient.getPackageInfo.mockRejectedValue(new Error('Network error'));

      const analyzer = new PeerDependencyAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.missingPeerDeps).toHaveLength(0);
      expect(results.errors).toBeDefined();
    });

    it('should skip dev dependencies when configured', async () => {
      const configWithoutDev = {
        ...mockConfig,
        analysis: {
          ...mockConfig.analysis,
          includeDevDependencies: false
        }
      };

      mockNpmClient.getPackageInfo.mockResolvedValue(null);

      const analyzer = new PeerDependencyAnalyzer(mockProjectRoot, configWithoutDev);
      const results = await analyzer.analyze();

      // Should not check @angular/cli from devDependencies
      expect(mockNpmClient.getPackageInfo).not.toHaveBeenCalledWith('@angular/cli');
      expect(mockNpmClient.getPackageInfo).toHaveBeenCalledWith('@angular/common');
    });

    it('should report progress during analysis', async () => {
      const progressCallback = jest.fn();
      mockNpmClient.getPackageInfo.mockResolvedValue(null);

      const analyzer = new PeerDependencyAnalyzer(mockProjectRoot, mockConfig, progressCallback);
      await analyzer.analyze();

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'analysis',
          currentTask: expect.stringContaining('peer dependencies')
        })
      );
    });
  });
});