import { ConfigurationAnalyzer } from '../../src/analyzers/ConfigurationAnalyzer';
import { AnalyzerConfig } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('ConfigurationAnalyzer', () => {
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
    (fs.existsSync as jest.Mock).mockReturnValue(false);
  });

  describe('analyze', () => {
    it('should analyze tsconfig.json for issues', async () => {
      const mockTsConfig = {
        compilerOptions: {
          target: 'es5', // Outdated
          module: 'commonjs',
          strict: false, // Not recommended
          skipLibCheck: false,
          esModuleInterop: false,
          allowJs: true,
          checkJs: false
        },
        exclude: ['node_modules']
      };

      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('tsconfig.json');
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('tsconfig.json')) {
          return JSON.stringify(mockTsConfig);
        }
        return '{}';
      });

      const analyzer = new ConfigurationAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.configurationIssues).toContainEqual(
        expect.objectContaining({
          file: 'tsconfig.json',
          issue: expect.stringContaining('target'),
          severity: 'warning',
          suggestion: expect.stringContaining('es2020')
        })
      );

      expect(results.configurationIssues).toContainEqual(
        expect.objectContaining({
          file: 'tsconfig.json',
          issue: expect.stringContaining('strict'),
          severity: 'error',
          suggestion: expect.stringContaining('true')
        })
      );
    });

    it('should analyze angular.json configuration', async () => {
      const mockAngularJson = {
        version: 1,
        projects: {
          'test-app': {
            architect: {
              build: {
                options: {
                  outputPath: 'dist/test-app',
                  optimization: false, // Issue for production
                  buildOptimizer: false,
                  aot: false, // Outdated, should be true by default
                  vendorChunk: true,
                  extractLicenses: false,
                  sourceMap: true,
                  namedChunks: true
                },
                configurations: {
                  production: {
                    optimization: false, // Should be true
                    sourceMap: true // Should be false for production
                  }
                }
              }
            }
          }
        }
      };

      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('angular.json');
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('angular.json')) {
          return JSON.stringify(mockAngularJson);
        }
        return '{}';
      });

      const analyzer = new ConfigurationAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.configurationIssues).toContainEqual(
        expect.objectContaining({
          file: 'angular.json',
          issue: expect.stringContaining('optimization'),
          severity: 'error',
          context: 'production'
        })
      );

      expect(results.configurationIssues).toContainEqual(
        expect.objectContaining({
          file: 'angular.json',
          issue: expect.stringContaining('aot'),
          severity: 'warning'
        })
      );
    });

    it('should suggest modernization improvements', async () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        scripts: {
          'build': 'ng build',
          'test': 'ng test',
          'lint': 'tslint -c tslint.json' // Outdated, should use ESLint
        },
        dependencies: {
          '@angular/core': '^17.0.0'
        },
        devDependencies: {
          'tslint': '^6.1.0' // Deprecated
        }
      };

      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('package.json') || filePath.includes('tslint.json');
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        return '{}';
      });

      const analyzer = new ConfigurationAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.modernizationSuggestions).toContainEqual(
        expect.objectContaining({
          area: 'linting',
          current: 'tslint',
          suggestion: expect.stringContaining('ESLint'),
          impact: 'medium',
          effort: 'medium'
        })
      );
    });

    it('should check for missing configuration files', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const analyzer = new ConfigurationAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.missingConfigurations).toContainEqual(
        expect.objectContaining({
          file: '.editorconfig',
          importance: 'low',
          suggestion: expect.any(String)
        })
      );

      expect(results.missingConfigurations).toContainEqual(
        expect.objectContaining({
          file: '.prettierrc',
          importance: 'medium'
        })
      );
    });

    it('should validate .gitignore patterns', async () => {
      const mockGitignore = `
node_modules/
*.log
# Missing important patterns
      `;

      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('.gitignore');
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.gitignore')) {
          return mockGitignore;
        }
        return '';
      });

      const analyzer = new ConfigurationAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.gitignoreIssues).toContainEqual(
        expect.objectContaining({
          missing: expect.arrayContaining(['dist/', '.env', 'coverage/'])
        })
      );
    });

    it('should check browserslist configuration', async () => {
      const mockBrowserslist = `
last 2 Chrome versions
last 2 Firefox versions
IE 11  # Still supporting IE11!
      `;

      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('.browserslistrc');
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.browserslistrc')) {
          return mockBrowserslist;
        }
        return '';
      });

      const analyzer = new ConfigurationAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.configurationIssues).toContainEqual(
        expect.objectContaining({
          file: '.browserslistrc',
          issue: expect.stringContaining('IE 11'),
          severity: 'warning',
          suggestion: expect.stringContaining('remove IE 11')
        })
      );
    });

    it('should analyze ESLint configuration', async () => {
      const mockEslintConfig = {
        extends: ['eslint:recommended'],
        rules: {
          'no-console': 'off', // Too permissive
          'no-debugger': 'off'
        },
        env: {
          browser: true,
          node: true
        }
      };

      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('.eslintrc');
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.eslintrc')) {
          return JSON.stringify(mockEslintConfig);
        }
        return '{}';
      });

      const analyzer = new ConfigurationAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.configurationIssues).toContainEqual(
        expect.objectContaining({
          file: '.eslintrc.json',
          issue: expect.stringContaining('no-console'),
          severity: 'warning',
          suggestion: expect.stringContaining('warn')
        })
      );
    });

    it('should suggest workspace configuration for monorepos', async () => {
      const mockPackageJson = {
        name: 'test-monorepo',
        private: true,
        workspaces: [
          'packages/*',
          'apps/*'
        ]
      };

      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('package.json');
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        return '{}';
      });

      const analyzer = new ConfigurationAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.workspaceConfiguration).toBeDefined();
      expect(results.workspaceConfiguration).toEqual(
        expect.objectContaining({
          type: 'npm-workspaces',
          packages: ['packages/*', 'apps/*']
        })
      );
    });

    it('should detect environment-specific issues', async () => {
      const mockEnvExample = `
API_KEY=your-api-key
DATABASE_URL=postgresql://localhost/db
      `;

      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('.env.example') && !filePath.includes('.env');
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.env.example')) {
          return mockEnvExample;
        }
        return '';
      });

      const analyzer = new ConfigurationAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.environmentIssues).toContainEqual(
        expect.objectContaining({
          issue: 'Missing .env file',
          suggestion: expect.stringContaining('Create .env')
        })
      );
    });

    it('should calculate configuration health score', async () => {
      const analyzer = new ConfigurationAnalyzer(mockProjectRoot, mockConfig);
      const results = await analyzer.analyze();

      expect(results.configurationScore).toBeDefined();
      expect(results.configurationScore).toBeGreaterThanOrEqual(0);
      expect(results.configurationScore).toBeLessThanOrEqual(100);
    });
  });
});