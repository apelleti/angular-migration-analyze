import { VersionCompatibilityAnalyzer } from '../../src/analyzers/VersionCompatibilityAnalyzer';
import { AnalyzerConfig } from '../../src/types';
import * as fs from 'fs';
import * as semver from 'semver';

jest.mock('fs');

describe('VersionCompatibilityAnalyzer', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  describe('analyze', () => {
    it('should detect version conflicts in dependencies', async () => {
      const mockPackageJson = {
        dependencies: {
          'package-a': '^1.0.0',
          'package-b': '^2.0.0',
          'package-c': '^1.5.0'
        }
      };

      const mockLockFile = {
        dependencies: {
          'package-a': {
            version: '1.2.0',
            requires: {
              'shared-lib': '^3.0.0'
            }
          },
          'package-b': {
            version: '2.1.0',
            requires: {
              'shared-lib': '^4.0.0' // Conflict!
            }
          },
          'package-c': {
            version: '1.5.5',
            requires: {
              'shared-lib': '^3.5.0'
            }
          }
        }
      };

      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        if (filePath.includes('package-lock.json')) {
          return JSON.stringify(mockLockFile);
        }
        return '{}';
      });

      const analyzer = new VersionCompatibilityAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.conflicts).toHaveLength(1);
      expect(results.conflicts[0]).toEqual(
        expect.objectContaining({
          package: 'shared-lib',
          versions: expect.arrayContaining([
            expect.objectContaining({
              version: '^3.0.0',
              requiredBy: ['package-a']
            }),
            expect.objectContaining({
              version: '^4.0.0',
              requiredBy: ['package-b']
            })
          ])
        })
      );
    });

    it('should detect incompatible version ranges', async () => {
      const mockPackageJson = {
        dependencies: {
          'typescript': '^4.5.0',
          'ts-node': '^10.0.0'
        }
      };

      const mockLockFile = {
        dependencies: {
          'ts-node': {
            version: '10.9.0',
            requires: {
              'typescript': '>=2.7' // Compatible range
            },
            peerDependencies: {
              'typescript': '>=2.7'
            }
          }
        }
      };

      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        if (filePath.includes('package-lock.json')) {
          return JSON.stringify(mockLockFile);
        }
        return '{}';
      });

      const analyzer = new VersionCompatibilityAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.incompatibleVersions).toHaveLength(0); // Should be compatible
    });

    it('should identify packages needing major updates', async () => {
      const mockPackageJson = {
        dependencies: {
          'react': '^16.14.0',
          'react-dom': '^16.14.0',
          'webpack': '^4.46.0'
        }
      };

      const mockLockFile = {
        dependencies: {
          'react': { version: '16.14.0' },
          'react-dom': { version: '16.14.0' },
          'webpack': { version: '4.46.0' }
        }
      };

      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        if (filePath.includes('package-lock.json')) {
          return JSON.stringify(mockLockFile);
        }
        return '{}';
      });

      // Mock latest versions (would normally come from npm registry)
      const latestVersions: Record<string, string> = {
        'react': '18.2.0',
        'react-dom': '18.2.0',
        'webpack': '5.88.0'
      };

      const analyzer = new VersionCompatibilityAnalyzer(mockProjectRoot, mockConfig);
      // Inject latest versions into the analyzer's context
      (analyzer as any).latestVersions = latestVersions;
      
      const results = await analyzer.analyze();

      expect(results.majorUpdatesAvailable).toContainEqual(
        expect.objectContaining({
          package: 'react',
          currentVersion: '16.14.0',
          latestVersion: '18.2.0',
          type: 'major'
        })
      );
    });

    it('should resolve version conflicts with suggestions', async () => {
      const mockPackageJson = {
        dependencies: {
          'lib-a': '^1.0.0',
          'lib-b': '^1.0.0'
        }
      };

      const mockLockFile = {
        dependencies: {
          'lib-a': {
            version: '1.5.0',
            requires: {
              'common-dep': '~2.1.0'
            }
          },
          'lib-b': {
            version: '1.3.0',
            requires: {
              'common-dep': '~2.2.0'
            }
          }
        }
      };

      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        if (filePath.includes('package-lock.json')) {
          return JSON.stringify(mockLockFile);
        }
        return '{}';
      });

      const analyzer = new VersionCompatibilityAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      const conflict = results.conflicts.find(c => c.package === 'common-dep');
      expect(conflict).toBeDefined();
      expect(conflict?.resolution).toBeDefined();
      expect(conflict?.resolution).toContain('2.2.0'); // Should suggest the higher compatible version
    });

    it('should handle cyclic dependencies', async () => {
      const mockPackageJson = {
        dependencies: {
          'package-a': '^1.0.0'
        }
      };

      const mockLockFile = {
        dependencies: {
          'package-a': {
            version: '1.0.0',
            requires: {
              'package-b': '^1.0.0'
            }
          },
          'package-b': {
            version: '1.0.0',
            requires: {
              'package-a': '^1.0.0' // Cyclic dependency
            }
          }
        }
      };

      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        if (filePath.includes('package-lock.json')) {
          return JSON.stringify(mockLockFile);
        }
        return '{}';
      });

      const analyzer = new VersionCompatibilityAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.cyclicDependencies).toContainEqual(
        expect.objectContaining({
          packages: expect.arrayContaining(['package-a', 'package-b']),
          severity: 'warning'
        })
      );
    });

    it('should work with yarn.lock format', async () => {
      const mockPackageJson = {
        dependencies: {
          'express': '^4.18.0'
        }
      };

      const mockYarnLock = `
# yarn lockfile v1

express@^4.18.0:
  version "4.18.2"
  resolved "https://registry.yarnpkg.com/express/-/express-4.18.2.tgz"
  dependencies:
    body-parser "1.20.1"
    cookie "0.5.0"
      `;

      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('package.json') || filePath.includes('yarn.lock');
      });
      
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        if (filePath.includes('yarn.lock')) {
          return mockYarnLock;
        }
        return '';
      });

      const analyzer = new VersionCompatibilityAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results).toBeDefined();
      expect(results.packageManager).toBe('yarn');
    });

    it('should detect resolution strategies in package.json', async () => {
      const mockPackageJson = {
        dependencies: {
          'package-a': '^1.0.0'
        },
        resolutions: {
          'package-b': '2.0.0',
          '**/package-c': '3.0.0'
        },
        overrides: {
          'package-d': '4.0.0'
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));

      const analyzer = new VersionCompatibilityAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.resolutionStrategies).toContainEqual(
        expect.objectContaining({
          type: 'resolutions',
          packages: expect.objectContaining({
            'package-b': '2.0.0'
          })
        })
      );
    });

    it('should work in offline mode', async () => {
      const offlineConfig = {
        ...mockConfig,
        analysis: {
          ...mockConfig.analysis,
          offlineMode: true
        }
      };

      const mockPackageJson = {
        dependencies: {
          'express': '^4.18.0'
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));

      const analyzer = new VersionCompatibilityAnalyzer(mockProjectRoot, offlineConfig);
      const results = await analyzer.analyze();

      expect(results).toBeDefined();
      expect(results.offlineMode).toBe(true);
      expect(results.majorUpdatesAvailable).toHaveLength(0);
    });
  });
});