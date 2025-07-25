import { MigrationAnalyzer } from '../src/MigrationAnalyzer';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('../src/utils/NpmRegistryClient');

// Import mocked class
import { NpmRegistryClient } from '../src/utils/NpmRegistryClient';
const MockedNpmRegistryClient = NpmRegistryClient as jest.MockedClass<typeof NpmRegistryClient>;

describe('MigrationAnalyzer', () => {
  const mockProjectPath = '/test/project';
  const mockPackageJson = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      '@angular/core': '^15.0.0',
      '@angular/common': '^15.0.0',
      'rxjs': '^7.5.0'
    },
    devDependencies: {
      '@angular/cli': '^15.0.0',
      'typescript': '^4.8.0'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock NpmRegistryClient
    MockedNpmRegistryClient.mockImplementation(() => ({
      getPackageInfo: jest.fn(),
      getLatestVersion: jest.fn().mockResolvedValue('18.0.0'),
      getAngularCompatibilityMatrix: jest.fn().mockResolvedValue({}),
      getBulkPackageInfo: jest.fn().mockResolvedValue({
        '@angular/core': {
          name: '@angular/core',
          'dist-tags': { latest: '18.0.0' },
          versions: {
            '15.0.0': { name: '@angular/core', version: '15.0.0' },
            '16.0.0': { name: '@angular/core', version: '16.0.0' },
            '17.0.0': { name: '@angular/core', version: '17.0.0' },
            '18.0.0': { name: '@angular/core', version: '18.0.0' }
          }
        },
        '@angular/common': {
          name: '@angular/common',
          'dist-tags': { latest: '18.0.0' },
          versions: {
            '15.0.0': { name: '@angular/common', version: '15.0.0' },
            '16.0.0': { name: '@angular/common', version: '16.0.0' },
            '17.0.0': { name: '@angular/common', version: '17.0.0' },
            '18.0.0': { name: '@angular/common', version: '18.0.0' }
          }
        }
      }),
      testConnection: jest.fn().mockResolvedValue(true)
    } as any));
    
    // Mock file system
    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      const normalizedPath = filePath.toString();
      if (normalizedPath.includes('pnpm-lock.yaml') || normalizedPath.includes('yarn.lock')) {
        return false;
      }
      return true;
    });
    (fs.statSync as jest.Mock).mockImplementation((filePath: string) => {
      const normalizedPath = filePath.toString();
      if (normalizedPath.includes('pnpm-lock.yaml') || normalizedPath.includes('yarn.lock')) {
        throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
      }
      return {
        isFile: () => true,
        isDirectory: () => false
      };
    });
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('package.json')) {
        return JSON.stringify(mockPackageJson);
      }
      if (filePath.endsWith('package-lock.json')) {
        return JSON.stringify({
          lockfileVersion: 2,
          name: 'test-project',
          version: '1.0.0',
          packages: {}
        });
      }
      if (filePath.endsWith('.ng-migrate.json')) {
        return JSON.stringify({
          targetVersion: '16',
          skipPackages: [],
          customRules: []
        });
      }
      if (filePath.endsWith('angular.json')) {
        return JSON.stringify({
          version: 1,
          projects: {}
        });
      }
      if (filePath.endsWith('tsconfig.json')) {
        return JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'ES2020'
          }
        });
      }
      return '';
    });
  });

  describe('constructor', () => {
    it('should initialize with project path', () => {
      const analyzer = new MigrationAnalyzer(mockProjectPath);
      expect(analyzer).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        cache: { enabled: false },
        registry: 'https://custom.registry.com'
      };
      const analyzer = new MigrationAnalyzer(mockProjectPath, customConfig);
      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return analysis results', async () => {
      const analyzer = new MigrationAnalyzer(mockProjectPath);
      const results = await analyzer.analyze();

      expect(results).toHaveProperty('summary');
      expect(results).toHaveProperty('missingPeerDeps');
      expect(results).toHaveProperty('conflicts');
      expect(results).toHaveProperty('angularPackages');
      expect(results).toHaveProperty('recommendations');
      expect(results).toHaveProperty('migrationPath');
      expect(results).toHaveProperty('metadata');
    });

    it('should detect Angular packages', async () => {
      const analyzer = new MigrationAnalyzer(mockProjectPath);
      const results = await analyzer.analyze();

      expect(results.angularPackages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: '@angular/core',
            currentVersion: '15.0.0'
          }),
          expect.objectContaining({
            name: '@angular/common',
            currentVersion: '15.0.0'
          })
        ])
      );
    });

    it('should calculate health score', async () => {
      const analyzer = new MigrationAnalyzer(mockProjectPath);
      const results = await analyzer.analyze();

      expect(results.summary.healthScore).toBeGreaterThanOrEqual(0);
      expect(results.summary.healthScore).toBeLessThanOrEqual(100);
    });
  });

  describe('error handling', () => {
    it('should throw error if package.json not found', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
      
      expect(() => new MigrationAnalyzer(mockProjectPath)).toThrow('Failed to initialize analyzer');
    });

    it('should handle invalid package.json', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
      
      expect(() => new MigrationAnalyzer(mockProjectPath)).toThrow('Failed to initialize analyzer');
    });
  });
});