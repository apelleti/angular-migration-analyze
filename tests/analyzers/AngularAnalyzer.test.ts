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
      offlineMode: false
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
  });

  describe('analyze', () => {
    it('should detect Angular packages and their versions', async () => {
      const mockPackageJson = {
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

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));
      mockNpmClient.getLatestVersion.mockResolvedValue('18.0.0');

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.angularPackages).toHaveLength(5);
      expect(results.angularPackages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: '@angular/core',
            currentVersion: '^15.0.0',
            targetVersion: '18.0.0',
            isCore: true
          }),
          expect.objectContaining({
            name: '@angular/cli',
            currentVersion: '^15.0.0',
            targetVersion: '18.0.0',
            isDevDependency: true
          })
        ])
      );
    });

    it('should calculate migration complexity correctly', async () => {
      const mockPackageJson = {
        dependencies: {
          '@angular/core': '^12.0.0', // Very old version
          '@angular/common': '^12.0.0'
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));
      mockNpmClient.getLatestVersion.mockResolvedValue('18.0.0');

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      const corePackage = results.angularPackages.find(pkg => pkg.name === '@angular/core');
      expect(corePackage?.migrationComplexity).toBe('high'); // 6 major versions jump
    });

    it('should detect mismatched Angular versions', async () => {
      const mockPackageJson = {
        dependencies: {
          '@angular/core': '^17.0.0',
          '@angular/common': '^16.0.0', // Mismatched version
          '@angular/router': '^17.0.0'
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));
      mockNpmClient.getLatestVersion.mockResolvedValue('18.0.0');

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.versionMismatches).toHaveLength(1);
      expect(results.versionMismatches[0]).toEqual(
        expect.objectContaining({
          package: '@angular/common',
          currentVersion: '^16.0.0',
          expectedVersion: '^17.0.0',
          severity: 'error'
        })
      );
    });

    it('should generate migration path for multi-version jumps', async () => {
      const mockPackageJson = {
        dependencies: {
          '@angular/core': '^14.0.0'
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));
      mockNpmClient.getLatestVersion.mockResolvedValue('18.0.0');

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.migrationPath).toBeDefined();
      expect(results.migrationPath.length).toBeGreaterThan(0);
      expect(results.migrationPath[0]).toEqual(
        expect.objectContaining({
          from: '14',
          to: '15',
          description: expect.stringContaining('Angular 14 to 15')
        })
      );
    });

    it('should handle projects without Angular packages', async () => {
      const mockPackageJson = {
        dependencies: {
          'express': '^4.18.0',
          'lodash': '^4.17.21'
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.angularPackages).toHaveLength(0);
      expect(results.migrationPath).toHaveLength(0);
    });

    it('should detect deprecated Angular packages', async () => {
      const mockPackageJson = {
        dependencies: {
          '@angular/core': '^17.0.0',
          '@angular/http': '^7.0.0' // Deprecated package
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));
      mockNpmClient.getLatestVersion.mockResolvedValue('18.0.0');
      mockNpmClient.getPackageInfo.mockResolvedValue({
        versions: {
          '7.0.0': {
            deprecated: 'Use @angular/common/http instead'
          }
        }
      });

      const analyzer = new AngularAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      const httpPackage = results.angularPackages.find(pkg => pkg.name === '@angular/http');
      expect(httpPackage?.deprecated).toBe(true);
      expect(httpPackage?.deprecationMessage).toContain('@angular/common/http');
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
        dependencies: {
          '@angular/core': '^17.0.0'
        },
        devDependencies: {
          '@angular/cli': '^17.0.0'
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));
      mockNpmClient.getLatestVersion.mockResolvedValue('18.0.0');

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
        dependencies: {
          '@angular/core': '^17.0.0'
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));

      const analyzer = new AngularAnalyzer(mockProjectRoot, offlineConfig);
      const results = await analyzer.analyze();

      expect(mockNpmClient.getLatestVersion).not.toHaveBeenCalled();
      expect(results.angularPackages[0].targetVersion).toBe('unknown');
    });
  });
});