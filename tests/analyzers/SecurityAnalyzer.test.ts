import { SecurityAnalyzer } from '../../src/analyzers/SecurityAnalyzer';
import { AnalyzerConfig } from '../../src/types';
import { NpmRegistryClient } from '../../src/utils/NpmRegistryClient';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import { promisify } from 'util';

jest.mock('fs');
jest.mock('child_process');
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn((fn) => fn)
}));
jest.mock('../../src/utils/NpmRegistryClient');

describe('SecurityAnalyzer', () => {
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
      'lodash': '^4.17.11',
      'express': '^4.16.0',
      'axios': '^0.21.1'
    },
    devDependencies: {
      'jest': '^27.0.0'
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
    it('should detect vulnerabilities using npm audit', async () => {
      const mockAuditOutput = {
        vulnerabilities: {
          lodash: {
            name: 'lodash',
            severity: 'high',
            via: [{
              title: 'Prototype Pollution',
              cve: 'CVE-2019-10744',
              severity: 'high',
              url: 'https://npmjs.com/advisories/1065'
            }],
            effects: [],
            range: '<4.17.19',
            nodes: ['node_modules/lodash'],
            fixAvailable: {
              name: 'lodash',
              version: '4.17.21',
              isSemVerMajor: false
            }
          }
        },
        metadata: {
          vulnerabilities: {
            info: 0,
            low: 0,
            moderate: 0,
            high: 1,
            critical: 0,
            total: 1
          }
        }
      };

      (childProcess.exec as jest.Mock).mockImplementation((cmd, callback) => {
        callback(null, JSON.stringify(mockAuditOutput), '');
      });

      const analyzer = new SecurityAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.vulnerabilities).toHaveLength(1);
      expect(results.vulnerabilities[0]).toEqual(
        expect.objectContaining({
          package: 'lodash',
          severity: 'high',
          title: 'Prototype Pollution',
          cve: 'CVE-2019-10744',
          fixAvailable: true,
          fixVersion: '4.17.21'
        })
      );
    });

    it('should detect deprecated packages', async () => {
      mockNpmClient.getPackageInfo.mockImplementation(async (pkgName: string) => {
        if (pkgName === 'express') {
          return {
            versions: {
              '4.16.0': {
                deprecated: 'This version has been deprecated. Please upgrade to 4.18.0 or later.'
              }
            }
          };
        }
        return { versions: {} };
      });

      const analyzer = new SecurityAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.deprecatedPackages).toHaveLength(1);
      expect(results.deprecatedPackages[0]).toEqual(
        expect.objectContaining({
          package: 'express',
          currentVersion: '^4.16.0',
          reason: expect.stringContaining('deprecated'),
          recommendation: expect.any(String)
        })
      );
    });

    it('should check license compatibility', async () => {
      mockNpmClient.getPackageInfo.mockImplementation(async (pkgName: string) => {
        const licenses: Record<string, string> = {
          'lodash': 'MIT',
          'express': 'MIT',
          'axios': 'MIT',
          'jest': 'MIT'
        };
        return {
          versions: {
            '1.0.0': {
              license: licenses[pkgName] || 'UNLICENSED'
            }
          }
        };
      });

      const analyzer = new SecurityAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.licenses).toHaveLength(4);
      expect(results.licenses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            package: 'lodash',
            license: 'MIT',
            compatible: true
          })
        ])
      );
    });

    it('should flag incompatible licenses', async () => {
      mockNpmClient.getPackageInfo.mockImplementation(async (pkgName: string) => {
        if (pkgName === 'problematic-package') {
          return {
            versions: {
              '1.0.0': {
                license: 'GPL-3.0' // Copyleft license
              }
            }
          };
        }
        return {
          versions: {
            '1.0.0': { license: 'MIT' }
          }
        };
      });

      const packageJsonWithGPL = {
        ...mockPackageJson,
        dependencies: {
          ...mockPackageJson.dependencies,
          'problematic-package': '^1.0.0'
        }
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(packageJsonWithGPL));

      const analyzer = new SecurityAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      const gplPackage = results.licenses.find(lic => lic.package === 'problematic-package');
      expect(gplPackage).toEqual(
        expect.objectContaining({
          package: 'problematic-package',
          license: 'GPL-3.0',
          compatible: false,
          risk: 'high'
        })
      );
    });

    it('should handle npm audit failures gracefully', async () => {
      (childProcess.exec as jest.Mock).mockImplementation((cmd, callback) => {
        callback(new Error('npm audit failed'), '', 'error output');
      });

      const analyzer = new SecurityAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.vulnerabilities).toHaveLength(0);
      expect(results.errors).toBeDefined();
      expect(results.errors[0]).toContain('audit failed');
    });

    it('should skip vulnerability check when configured', async () => {
      const configNoVulnCheck = {
        ...mockConfig,
        analysis: {
          ...mockConfig.analysis,
          checkVulnerabilities: false
        }
      };

      const analyzer = new SecurityAnalyzer(mockProjectRoot, configNoVulnCheck);
      const results = await analyzer.analyze();

      expect(childProcess.exec).not.toHaveBeenCalled();
      expect(results.vulnerabilities).toHaveLength(0);
    });

    it('should skip license check when configured', async () => {
      const configNoLicenseCheck = {
        ...mockConfig,
        analysis: {
          ...mockConfig.analysis,
          checkLicenses: false
        }
      };

      const analyzer = new SecurityAnalyzer(mockProjectRoot, configNoLicenseCheck);
      const results = await analyzer.analyze();

      expect(results.licenses).toHaveLength(0);
    });

    it('should report critical vulnerabilities with urgency', async () => {
      const mockCriticalAudit = {
        vulnerabilities: {
          'critical-package': {
            severity: 'critical',
            via: [{
              title: 'Remote Code Execution',
              cve: 'CVE-2023-12345',
              severity: 'critical'
            }],
            fixAvailable: true
          }
        },
        metadata: {
          vulnerabilities: {
            critical: 1,
            high: 0,
            moderate: 0,
            low: 0,
            info: 0,
            total: 1
          }
        }
      };

      (childProcess.exec as jest.Mock).mockImplementation((cmd, callback) => {
        callback(null, JSON.stringify(mockCriticalAudit), '');
      });

      const analyzer = new SecurityAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.criticalCount).toBe(1);
      expect(results.requiresImmediateAction).toBe(true);
    });

    it('should work in offline mode', async () => {
      const offlineConfig = {
        ...mockConfig,
        analysis: {
          ...mockConfig.analysis,
          offlineMode: true
        }
      };

      const analyzer = new SecurityAnalyzer(mockProjectRoot, offlineConfig);
      const results = await analyzer.analyze();

      expect(childProcess.exec).not.toHaveBeenCalled();
      expect(mockNpmClient.getPackageInfo).not.toHaveBeenCalled();
      expect(results.vulnerabilities).toHaveLength(0);
      expect(results.deprecatedPackages).toHaveLength(0);
    });
  });
});