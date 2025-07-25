import { PerformanceAnalyzer } from '../../src/analyzers/PerformanceAnalyzer';
import { AnalyzerConfig } from '../../src/types';
import { NpmRegistryClient } from '../../src/utils/NpmRegistryClient';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

jest.mock('fs');
jest.mock('glob');
jest.mock('../../src/utils/NpmRegistryClient');

describe('PerformanceAnalyzer', () => {
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
    dependencies: {
      'lodash': '^4.17.21',
      'moment': '^2.29.4',
      'rxjs': '^7.8.0',
      '@angular/core': '^17.0.0'
    },
    devDependencies: {
      'webpack': '^5.88.0'
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
    it('should analyze bundle sizes', async () => {
      mockNpmClient.getPackageInfo.mockImplementation(async (pkgName: string) => {
        const sizes: Record<string, number> = {
          'lodash': 71800,
          'moment': 290400,
          'rxjs': 188000,
          '@angular/core': 1200000
        };
        return {
          versions: {
            '1.0.0': {
              dist: {
                unpackedSize: sizes[pkgName] || 10000
              }
            }
          }
        };
      });

      const analyzer = new PerformanceAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.bundleAnalysis).toBeDefined();
      expect(results.bundleAnalysis.totalSize).toBeGreaterThan(0);
      expect(results.bundleAnalysis.packages).toHaveLength(4);
      expect(results.bundleAnalysis.packages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'moment',
            size: 290400,
            percentage: expect.any(Number)
          })
        ])
      );
    });

    it('should detect duplicate dependencies', async () => {
      const mockLockFile = {
        dependencies: {
          'lodash': {
            version: '4.17.21',
            resolved: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz'
          },
          'some-package': {
            version: '1.0.0',
            requires: {
              'lodash': '^3.10.0'
            },
            dependencies: {
              'lodash': {
                version: '3.10.1',
                resolved: 'https://registry.npmjs.org/lodash/-/lodash-3.10.1.tgz'
              }
            }
          }
        }
      };

      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('package-lock.json') || filePath.includes('package.json');
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package-lock.json')) {
          return JSON.stringify(mockLockFile);
        }
        return JSON.stringify(mockPackageJson);
      });

      const analyzer = new PerformanceAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.duplicatedDependencies).toHaveLength(1);
      expect(results.duplicatedDependencies[0]).toEqual(
        expect.objectContaining({
          name: 'lodash',
          versions: ['4.17.21', '3.10.1'],
          estimatedSizeSaving: expect.any(Number)
        })
      );
    });

    it('should provide optimization suggestions for large packages', async () => {
      mockNpmClient.getPackageInfo.mockImplementation(async (pkgName: string) => {
        if (pkgName === 'moment') {
          return {
            versions: {
              '2.29.4': {
                dist: { unpackedSize: 2904000 } // ~2.9MB
              }
            }
          };
        }
        return {
          versions: {
            '1.0.0': {
              dist: { unpackedSize: 10000 }
            }
          }
        };
      });

      const analyzer = new PerformanceAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.optimizationSuggestions).toContainEqual(
        expect.objectContaining({
          package: 'moment',
          type: 'large-dependency',
          suggestion: expect.stringContaining('date-fns'),
          impact: 'high',
          estimatedSizeSaving: expect.any(Number)
        })
      );
    });

    it('should suggest tree-shaking opportunities', async () => {
      mockNpmClient.getPackageInfo.mockImplementation(async (pkgName: string) => {
        if (pkgName === 'lodash') {
          return {
            versions: {
              '4.17.21': {
                dist: { unpackedSize: 718000 },
                main: 'lodash.js' // No ES modules
              }
            }
          };
        }
        return { versions: {} };
      });

      const analyzer = new PerformanceAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.optimizationSuggestions).toContainEqual(
        expect.objectContaining({
          package: 'lodash',
          type: 'tree-shaking',
          suggestion: expect.stringContaining('lodash-es'),
          impact: 'medium'
        })
      );
    });

    it('should analyze build output if available', async () => {
      (glob as unknown as jest.Mock).mockResolvedValue([
        '/test/project/dist/main.js',
        '/test/project/dist/vendor.js',
        '/test/project/dist/polyfills.js'
      ]);

      (fs.statSync as jest.Mock).mockImplementation((filePath: string) => ({
        size: filePath.includes('vendor') ? 2000000 : 500000
      }));

      const analyzer = new PerformanceAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.buildAnalysis).toBeDefined();
      expect(results.buildAnalysis?.totalSize).toBe(3000000);
      expect(results.buildAnalysis?.files).toHaveLength(3);
      expect(results.buildAnalysis?.largestFile).toEqual(
        expect.objectContaining({
          name: expect.stringContaining('vendor.js'),
          size: 2000000
        })
      );
    });

    it('should detect unused dependencies', async () => {
      // Mock source files
      (glob as unknown as jest.Mock).mockImplementation((pattern: string) => {
        if (pattern.includes('**/*.ts')) {
          return Promise.resolve([
            '/test/project/src/app.ts',
            '/test/project/src/main.ts'
          ]);
        }
        return Promise.resolve([]);
      });

      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('app.ts')) {
          return `import { Observable } from 'rxjs';\nimport * as _ from 'lodash';`;
        }
        if (filePath.includes('main.ts')) {
          return `import '@angular/core';`;
        }
        if (filePath.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        return '';
      });

      const analyzer = new PerformanceAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      // moment is in package.json but not imported anywhere
      expect(results.unusedDependencies).toContainEqual(
        expect.objectContaining({
          package: 'moment',
          confidence: 'high'
        })
      );
    });

    it('should calculate performance score', async () => {
      mockNpmClient.getPackageInfo.mockResolvedValue({
        versions: {
          '1.0.0': {
            dist: { unpackedSize: 100000 }
          }
        }
      });

      const analyzer = new PerformanceAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.performanceScore).toBeDefined();
      expect(results.performanceScore).toBeGreaterThanOrEqual(0);
      expect(results.performanceScore).toBeLessThanOrEqual(100);
    });

    it('should handle missing package size information', async () => {
      mockNpmClient.getPackageInfo.mockResolvedValue({
        versions: {
          '1.0.0': {
            // No dist.unpackedSize
          }
        }
      });

      const analyzer = new PerformanceAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.bundleAnalysis.packages).toHaveLength(4);
      results.bundleAnalysis.packages.forEach(pkg => {
        expect(pkg.size).toBeGreaterThanOrEqual(0);
      });
    });

    it('should work in offline mode', async () => {
      const offlineConfig = {
        ...mockConfig,
        analysis: {
          ...mockConfig.analysis,
          offlineMode: true
        }
      };

      const analyzer = new PerformanceAnalyzer(mockProjectRoot, offlineConfig);
      const results = await analyzer.analyze();

      expect(mockNpmClient.getPackageInfo).not.toHaveBeenCalled();
      expect(results.bundleAnalysis.packages).toHaveLength(0);
      expect(results.offlineMode).toBe(true);
    });
  });
});