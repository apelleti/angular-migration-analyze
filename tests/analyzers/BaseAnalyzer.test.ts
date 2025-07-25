import { BaseAnalyzer } from '../../src/analyzers/BaseAnalyzer';
import { AnalyzerConfig, AnalysisProgress } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');

// Create a concrete implementation for testing
class TestAnalyzer extends BaseAnalyzer {
  async analyze(): Promise<any> {
    return { test: true };
  }
}

describe('BaseAnalyzer', () => {
  const mockProjectRoot = '/test/project';
  const mockConfig: AnalyzerConfig = {
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
  };
  const mockProgressCallback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided parameters', () => {
      const analyzer = new TestAnalyzer(mockProjectRoot, mockConfig, mockProgressCallback);
      expect(analyzer).toBeDefined();
      expect((analyzer as any).projectRoot).toBe(mockProjectRoot);
      expect((analyzer as any).config).toBe(mockConfig);
      expect((analyzer as any).progressCallback).toBe(mockProgressCallback);
    });
  });

  describe('loadPackageJson', () => {
    it('should load and parse package.json successfully', () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'express': '^4.18.0'
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));

      const analyzer = new TestAnalyzer(mockProjectRoot, mockConfig);
      const result = (analyzer as any).loadPackageJson();

      expect(result).toEqual(mockPackageJson);
      expect(fs.existsSync).toHaveBeenCalledWith(path.join(mockProjectRoot, 'package.json'));
    });

    it('should throw error if package.json does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const analyzer = new TestAnalyzer(mockProjectRoot, mockConfig);
      expect(() => (analyzer as any).loadPackageJson()).toThrow('package.json not found');
    });

    it('should throw error if package.json is invalid JSON', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      const analyzer = new TestAnalyzer(mockProjectRoot, mockConfig);
      expect(() => (analyzer as any).loadPackageJson()).toThrow();
    });
  });

  describe('reportProgress', () => {
    it('should call progress callback if provided', () => {
      const analyzer = new TestAnalyzer(mockProjectRoot, mockConfig, mockProgressCallback);
      const progress: AnalysisProgress = {
        phase: 'analysis',
        currentTask: 'Testing',
        percentage: 50,
        message: 'Test in progress'
      };

      (analyzer as any).reportProgress(progress);

      expect(mockProgressCallback).toHaveBeenCalledWith(progress);
    });

    it('should not throw if progress callback is not provided', () => {
      const analyzer = new TestAnalyzer(mockProjectRoot, mockConfig);
      const progress: AnalysisProgress = {
        phase: 'analysis',
        currentTask: 'Testing',
        percentage: 50
      };

      expect(() => (analyzer as any).reportProgress(progress)).not.toThrow();
    });
  });

  describe('loadLockFile', () => {
    it('should load package-lock.json if it exists', () => {
      const mockLockFile = {
        lockfileVersion: 2,
        dependencies: {}
      };

      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('package-lock.json');
      });
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockLockFile));

      const analyzer = new TestAnalyzer(mockProjectRoot, mockConfig);
      const result = (analyzer as any).loadLockFile();

      expect(result).toEqual(mockLockFile);
    });

    it('should load yarn.lock if it exists', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('yarn.lock');
      });
      (fs.readFileSync as jest.Mock).mockReturnValue('yarn lock file content');

      const analyzer = new TestAnalyzer(mockProjectRoot, mockConfig);
      const result = (analyzer as any).loadLockFile();

      expect(result).toBe('yarn lock file content');
    });

    it('should return null if no lock file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const analyzer = new TestAnalyzer(mockProjectRoot, mockConfig);
      const result = (analyzer as any).loadLockFile();

      expect(result).toBeNull();
    });
  });

  describe('getInstalledVersion', () => {
    it('should get version from node_modules', () => {
      const mockPackageJson = {
        version: '2.0.0'
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));

      const analyzer = new TestAnalyzer(mockProjectRoot, mockConfig);
      const version = (analyzer as any).getInstalledVersion('test-package');

      expect(version).toBe('2.0.0');
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join(mockProjectRoot, 'node_modules', 'test-package', 'package.json')
      );
    });

    it('should return null if package is not installed', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const analyzer = new TestAnalyzer(mockProjectRoot, mockConfig);
      const version = (analyzer as any).getInstalledVersion('non-existent-package');

      expect(version).toBeNull();
    });
  });
});