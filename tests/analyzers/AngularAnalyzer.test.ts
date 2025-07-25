import { AngularAnalyzer } from '../../src/analyzers/AngularAnalyzer';
import { AnalyzerConfig } from '../../src/types';
import { NpmRegistryClient } from '../../src/utils/NpmRegistryClient';
import * as fs from 'fs';

jest.mock('fs');
jest.mock('../../src/utils/NpmRegistryClient');

describe('AngularAnalyzer', () => {
  const mockProjectRoot = '/test/project';
  const mockConfig: AnalyzerConfig = {
    registry: 'https://registry.npmjs.org',
    cache: { enabled: true, ttl: 300000, maxSize: 100 },
    network: { timeout: 30000, retries: 3, retryDelay: 1000 },
    analysis: {
      includeDevDependencies: true,
      checkVulnerabilities: true,
      checkLicenses: true,
      offlineMode: false,
      excludePackages: []
    }
  };

  const mockNpmClient = {
    getPackageInfo: jest.fn(),
    getLatestVersion: jest.fn(),
    getAngularCompatibilityMatrix: jest.fn().mockResolvedValue({}),
    getBulkPackageInfo: jest.fn()
  };

  const setupMocks = (packageJson: any, lockJson?: any) => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes('package-lock.json')) {
        return JSON.stringify(lockJson || {
          lockfileVersion: 2,
          name: packageJson.name || 'test-project',
          version: packageJson.version || '1.0.0',
          packages: {
            '': {
              name: packageJson.name || 'test-project',
              version: packageJson.version || '1.0.0',
              dependencies: packageJson.dependencies || {},
              devDependencies: packageJson.devDependencies || {}
            }
          }
        });
      }
      return JSON.stringify(packageJson);
    });
  };

  const setupAngularPackageMocks = (packages: string[]) => {
    const packageInfos: any = {};
    packages.forEach(pkg => {
      packageInfos[pkg] = {
        name: pkg,
        'dist-tags': { latest: '18.0.0' },
        versions: {
          '13.0.0': { name: pkg, version: '13.0.0' },
          '14.0.0': { name: pkg, version: '14.0.0' },
          '15.0.0': { name: pkg, version: '15.0.0' },
          '16.0.0': { name: pkg, version: '16.0.0' },
          '17.0.0': { name: pkg, version: '17.0.0' },
          '18.0.0': { name: pkg, version: '18.0.0' }
        }
      };
    });
    mockNpmClient.getBulkPackageInfo.mockResolvedValue(packageInfos);
    mockNpmClient.getLatestVersion.mockResolvedValue('18.0.0');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (NpmRegistryClient as jest.MockedClass<typeof NpmRegistryClient>).mockImplementation(
      () => mockNpmClient as any
    );
    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      const normalizedPath = filePath.toString();
      // Return false for pnpm and yarn lock files
      if (normalizedPath.includes('pnpm-lock.yaml') || normalizedPath.includes('yarn.lock')) {
        return false;
      }
      return true;
    });
    (fs.statSync as jest.Mock).mockImplementation((filePath: string) => {
      const normalizedPath = filePath.toString();
      // Throw error for pnpm and yarn lock files
      if (normalizedPath.includes('pnpm-lock.yaml') || normalizedPath.includes('yarn.lock')) {
        throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
      }
      return {
        isFile: () => true,
        isDirectory: () => false
      };
    });
  });

  describe('analyze', () => {
    it('should detect Angular packages and their versions', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@angular/core': '^15.0.0',
          '@angular/common': '^15.0.0',
          '@angular/router': '^15.0.0',
          'rxjs': '^7.8.0'
        },
        devDependencies: {
          '@angular/cli': '^15.0.0',
          '@angular-devkit/build-angular': '^15.0.0'
        }
      };

      setupMocks(mockPackageJson);
      setupAngularPackageMocks([
        '@angular/core',
        '@angular/common', 
        '@angular/router',
        '@angular/cli',
        '@angular-devkit/build-angular'
      ]);

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.angularPackages).toHaveLength(5);
      expect(results.angularPackages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: '@angular/core',
            currentVersion: '15.0.0',
            targetVersion: '16.0.0',
            hasBreakingChanges: true,
            migrationComplexity: 'medium'
          }),
          expect.objectContaining({
            name: '@angular/cli',
            currentVersion: '15.0.0',
            targetVersion: '16.0.0',
            hasBreakingChanges: true
          })
        ])
      );
    });

    it('should calculate migration complexity correctly', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@angular/core': '^12.0.0', // Very old version
          '@angular/common': '^12.0.0'
        }
      };

      setupMocks(mockPackageJson);
      setupAngularPackageMocks(['@angular/core', '@angular/common']);

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      const corePackage = results.angularPackages.find(pkg => pkg.name === '@angular/core');
      expect(corePackage?.migrationComplexity).toBe('medium'); // v12 to v13 is medium complexity
    });

    it('should detect mismatched Angular versions', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@angular/core': '^17.0.0',
          '@angular/common': '^16.0.0', // Mismatched version
          '@angular/router': '^17.0.0'
        }
      };

      setupMocks(mockPackageJson);
      setupAngularPackageMocks(['@angular/core', '@angular/common', '@angular/router']);

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.incompatibleVersions).toBeDefined();
      expect(results.incompatibleVersions.length).toBeGreaterThan(0);
      // Check that mismatched versions are detected
      const commonPackage = results.angularPackages.find(pkg => pkg.name === '@angular/common');
      expect(commonPackage?.currentVersion).toBe('16.0.0');
    });

    it('should generate migration path for multi-version jumps', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@angular/core': '^14.0.0'
        }
      };

      setupMocks(mockPackageJson);
      setupAngularPackageMocks(Object.keys({...mockPackageJson.dependencies, ...mockPackageJson.devDependencies}).filter(pkg => pkg.startsWith('@angular')));

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.migrationPath).toBeDefined();
      expect(results.migrationPath.length).toBeGreaterThan(0);
      expect(results.migrationPath[0]).toEqual(
        expect.objectContaining({
          order: 1,
          description: expect.stringContaining('Angular')
        })
      );
    });

    it('should handle projects without Angular packages', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'express': '^4.18.0',
          'lodash': '^4.17.21'
        }
      };

      setupMocks(mockPackageJson);
      // No Angular packages to mock

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.angularPackages).toHaveLength(0);
      expect(results.migrationPath).toHaveLength(0);
    });

    it('should detect deprecated Angular packages', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@angular/core': '^17.0.0',
          '@angular/http': '^7.0.0' // Deprecated package
        }
      };

      setupMocks(mockPackageJson);
      setupAngularPackageMocks(Object.keys({...mockPackageJson.dependencies, ...mockPackageJson.devDependencies}).filter(pkg => pkg.startsWith('@angular')));
      mockNpmClient.getPackageInfo.mockResolvedValue({
        versions: {
          '7.0.0': {
            deprecated: 'Use @angular/common/http instead'
          }
        }
      });

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      // Check if deprecated package is detected in recommendations
      const deprecatedRecommendation = results.recommendations.find(
        rec => rec.package === '@angular/http' && rec.message.includes('deprecated')
      );
      expect(deprecatedRecommendation).toBeDefined();
    });

    it('should skip dev dependencies when configured', async () => {
      const configWithoutDev = {
        ...mockConfig,
        analysis: {
          ...mockConfig.analysis,
          includeDevDependencies: false
        }
      };

      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@angular/core': '^17.0.0'
        },
        devDependencies: {
          '@angular/cli': '^17.0.0'
        }
      };

      setupMocks(mockPackageJson);
      setupAngularPackageMocks(Object.keys({...mockPackageJson.dependencies, ...mockPackageJson.devDependencies}).filter(pkg => pkg.startsWith('@angular')));

      const analyzer = new AngularAnalyzer(mockProjectRoot, configWithoutDev);
      const results = await analyzer.analyze();

      expect(results.angularPackages).toHaveLength(1);
      expect(results.angularPackages[0].name).toBe('@angular/core');
    });

    it('should handle offline mode', async () => {
      const offlineConfig = {
        ...mockConfig,
        analysis: {
          ...mockConfig.analysis,
          offlineMode: true
        }
      };

      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@angular/core': '^17.0.0'
        }
      };

      setupMocks(mockPackageJson);
      // Don't setup package mocks for offline mode

      const analyzer = new AngularAnalyzer(mockProjectRoot, offlineConfig);
      const results = await analyzer.analyze();

      expect(mockNpmClient.getBulkPackageInfo).not.toHaveBeenCalled();
      expect(results.angularPackages).toHaveLength(1);
      expect(results.angularPackages[0].name).toBe('@angular/core');
    });

    it('should handle Angular 19 projects', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@angular/core': '^19.0.0',
          '@angular/common': '^19.0.0',
          '@angular/router': '^19.0.0'
        },
        devDependencies: {
          '@angular/cli': '^19.0.0'
        }
      };

      setupMocks(mockPackageJson);
      setupAngularPackageMocks(['@angular/core', '@angular/common', '@angular/router', '@angular/cli']);

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.angularPackages).toHaveLength(4);
      const corePackage = results.angularPackages.find(pkg => pkg.name === '@angular/core');
      expect(corePackage?.currentVersion).toBe('19.0.0');
    });

    it('should handle Angular 20 projects', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@angular/core': '^20.0.0',
          '@angular/common': '^20.0.0',
          '@angular/router': '^20.0.0'
        },
        devDependencies: {
          '@angular/cli': '^20.0.0'
        }
      };

      setupMocks(mockPackageJson);
      setupAngularPackageMocks(['@angular/core', '@angular/common', '@angular/router', '@angular/cli']);

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.angularPackages).toHaveLength(4);
      const corePackage = results.angularPackages.find(pkg => pkg.name === '@angular/core');
      expect(corePackage?.currentVersion).toBe('20.0.0');
    });

    it('should detect Node.js 22 compatibility', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@angular/core': '^19.0.0'
        },
        engines: {
          node: '>=22.0.0'
        }
      };

      setupMocks(mockPackageJson);
      setupAngularPackageMocks(['@angular/core']);

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      // Angular 19 and 20 support Node.js 22
      expect(results.recommendations).not.toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Node.js version incompatible')
        })
      );
    });
  });
});