import { MigrationAnalyzer } from '../src/MigrationAnalyzer';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('../src/utils/NpmRegistryClient');

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
    
    // Mock file system
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('package.json')) {
        return JSON.stringify(mockPackageJson);
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
            currentVersion: '^15.0.0'
          }),
          expect.objectContaining({
            name: '@angular/common',
            currentVersion: '^15.0.0'
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
    it('should throw error if package.json not found', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const analyzer = new MigrationAnalyzer(mockProjectPath);
      await expect(analyzer.analyze()).rejects.toThrow();
    });

    it('should handle invalid package.json', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
      
      const analyzer = new MigrationAnalyzer(mockProjectPath);
      await expect(analyzer.analyze()).rejects.toThrow();
    });
  });
});