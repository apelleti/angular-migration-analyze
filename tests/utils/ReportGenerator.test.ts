import { ReportGenerator } from '../../src/utils/ReportGenerator';
import { AnalysisResult } from '../../src/types';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('ReportGenerator', () => {
  let generator: ReportGenerator;
  const mockResults: AnalysisResult = {
    missingPeerDeps: [
      {
        package: '@angular/animations',
        requiredBy: '@angular/platform-browser',
        requiredVersion: '^17.0.0',
        currentVersion: null,
        severity: 'error',
        optional: false
      }
    ],
    incompatibleVersions: [
      {
        package: 'typescript',
        currentVersion: '4.9.0',
        requiredVersions: ['^5.0.0', '>=5.1.0'],
        severity: 'error',
        affectedBy: ['@angular/core', '@angular/compiler']
      }
    ],
    conflicts: [
      {
        package: 'rxjs',
        versions: [
          { version: '^7.8.0', requiredBy: ['@angular/core'] },
          { version: '^6.6.0', requiredBy: ['legacy-lib'] }
        ],
        resolution: 'Update legacy-lib or use rxjs@7.8.0',
        severity: 'warning'
      }
    ],
    angularPackages: [
      {
        name: '@angular/core',
        currentVersion: '^16.0.0',
        targetVersion: '17.0.0',
        isCore: true,
        isDevDependency: false,
        migrationComplexity: 'medium'
      },
      {
        name: '@angular/cli',
        currentVersion: '^16.0.0',
        targetVersion: '17.0.0',
        isCore: false,
        isDevDependency: true,
        migrationComplexity: 'low'
      }
    ],
    recommendations: [
      {
        type: 'error',
        message: 'Critical security vulnerability in lodash',
        priority: 'high',
        command: 'npm update lodash@latest',
        estimatedEffort: '5 minutes',
        category: 'security'
      },
      {
        type: 'warning',
        message: 'Consider updating to Angular 17 for better performance',
        priority: 'medium',
        command: 'ng update @angular/core@17 @angular/cli@17',
        estimatedEffort: '1-2 hours',
        category: 'performance'
      }
    ],
    migrationPath: [
      {
        order: 1,
        from: '16',
        to: '17',
        description: 'Update Angular from v16 to v17',
        commands: ['ng update @angular/core@17 @angular/cli@17'],
        validation: 'npm run build && npm run test',
        estimatedDuration: '45 minutes',
        breakingChanges: ['Standalone components are now default']
      }
    ],
    summary: {
      healthScore: 75,
      totalIssues: 8,
      criticalIssues: 2,
      warnings: 6,
      angularPackagesCount: 12,
      recommendationsCount: 5
    },
    metadata: {
      analyzedAt: '2024-01-24T10:00:00.000Z',
      projectPath: '/test/project',
      packageManager: 'npm',
      nodeVersion: '18.19.0',
      duration: 3456
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new ReportGenerator();
  });

  describe('generateJSON', () => {
    it('should generate JSON report with timestamp', async () => {
      const filePath = '/test/report.json';
      
      await generator.generateJSON(mockResults, filePath);

      expect(fs.writeFile).toHaveBeenCalledWith(
        filePath,
        expect.any(String)
      );

      const writtenContent = (fs.writeFile as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('summary', mockResults.summary);
      expect(parsed).toHaveProperty('missingPeerDeps');
      expect(parsed).toHaveProperty('angularPackages');
    });

    it('should format JSON with proper indentation', async () => {
      const filePath = '/test/formatted.json';
      
      await generator.generateJSON(mockResults, filePath);

      const writtenContent = (fs.writeFile as jest.Mock).mock.calls[0][1];
      
      // Check for 2-space indentation
      expect(writtenContent).toMatch(/^\{\n  /);
      expect(writtenContent).toContain('  "summary": {');
    });

    it('should handle write errors', async () => {
      const filePath = '/test/error.json';
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(generator.generateJSON(mockResults, filePath))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('generateHTML', () => {
    it('should generate complete HTML report', async () => {
      const filePath = '/test/report.html';
      
      await generator.generateHTML(mockResults, filePath);

      expect(fs.writeFile).toHaveBeenCalledWith(
        filePath,
        expect.any(String)
      );

      const html = (fs.writeFile as jest.Mock).mock.calls[0][1];

      // Check HTML structure
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="fr">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</html>');
    });

    it('should include all report sections', async () => {
      const filePath = '/test/report.html';
      
      await generator.generateHTML(mockResults, filePath);

      const html = (fs.writeFile as jest.Mock).mock.calls[0][1];

      // Check for main sections
      expect(html).toContain('Rapport de Migration Angular');
      expect(html).toContain('Résumé');
      expect(html).toContain('Peer Dependencies Manquantes');
      expect(html).toContain('Conflits de Versions');
      expect(html).toContain('Packages Angular');
      expect(html).toContain('Recommandations');
      expect(html).toContain('Plan de Migration');
    });

    it('should apply correct CSS classes based on severity', async () => {
      const filePath = '/test/styled.html';
      
      await generator.generateHTML(mockResults, filePath);

      const html = (fs.writeFile as jest.Mock).mock.calls[0][1];

      // Check for severity-based styling
      expect(html).toContain('class="section error"'); // For critical issues
      expect(html).toContain('class="section warning"'); // For warnings
      expect(html).toContain('border-left: 4px solid #f44336'); // Error color
      expect(html).toContain('border-left: 4px solid #ff9800'); // Warning color
    });

    it('should format dates in French locale', async () => {
      const filePath = '/test/report.html';
      
      await generator.generateHTML(mockResults, filePath);

      const html = (fs.writeFile as jest.Mock).mock.calls[0][1];

      // Date should be formatted
      expect(html).toMatch(/Généré le: \d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should generate summary section with health score', async () => {
      const filePath = '/test/summary.html';
      
      await generator.generateHTML(mockResults, filePath);

      const html = (fs.writeFile as jest.Mock).mock.calls[0][1];

      expect(html).toContain('Score de santé:</strong> 75/100');
      expect(html).toContain('Problèmes critiques:</strong> 2');
      expect(html).toContain('Total des problèmes:</strong> 8');
      expect(html).toContain('Packages Angular:</strong> 12');
      expect(html).toContain('Recommandations:</strong> 5');
    });

    it('should generate peer dependencies table', async () => {
      const filePath = '/test/peerdeps.html';
      
      await generator.generateHTML(mockResults, filePath);

      const html = (fs.writeFile as jest.Mock).mock.calls[0][1];

      // Check table structure
      expect(html).toContain('<table class="table">');
      expect(html).toContain('<th>Package</th>');
      expect(html).toContain('<th>Requis par</th>');
      expect(html).toContain('<th>Version</th>');
      expect(html).toContain('<th>Type</th>');

      // Check data
      expect(html).toContain('@angular/animations');
      expect(html).toContain('@angular/platform-browser');
      expect(html).toContain('^17.0.0');
      expect(html).toContain('❌ Requis'); // Required emoji
    });

    it('should generate migration path with steps', async () => {
      const filePath = '/test/migration.html';
      
      await generator.generateHTML(mockResults, filePath);

      const html = (fs.writeFile as jest.Mock).mock.calls[0][1];

      expect(html).toContain('🗺️ Plan de Migration');
      expect(html).toContain('Étape 1: Update Angular from v16 to v17');
      expect(html).toContain('ng update @angular/core@17 @angular/cli@17');
      expect(html).toContain('npm run build && npm run test');
    });

    it('should handle empty sections gracefully', async () => {
      const emptyResults: AnalysisResult = {
        ...mockResults,
        missingPeerDeps: [],
        conflicts: [],
        recommendations: [],
        migrationPath: []
      };

      const filePath = '/test/empty.html';
      
      await generator.generateHTML(emptyResults, filePath);

      const html = (fs.writeFile as jest.Mock).mock.calls[0][1];

      // Should not include empty sections
      expect(html).not.toContain('Peer Dependencies Manquantes');
      expect(html).not.toContain('Conflits de Versions');
      expect(html).not.toContain('Plan de Migration');
    });

    it('should include inline CSS styles', async () => {
      const filePath = '/test/styles.html';
      
      await generator.generateHTML(mockResults, filePath);

      const html = (fs.writeFile as jest.Mock).mock.calls[0][1];

      expect(html).toContain('<style>');
      expect(html).toContain('font-family: Arial, sans-serif');
      expect(html).toContain('.header { background: #1976d2');
      expect(html).toContain('.error { border-left: 4px solid #f44336');
      expect(html).toContain('.table { width: 100%; border-collapse: collapse');
    });

    it('should escape HTML in user data', async () => {
      const resultsWithHtml: AnalysisResult = {
        ...mockResults,
        recommendations: [
          {
            type: 'error',
            message: 'Package <script>alert("XSS")</script> has issues',
            priority: 'high',
            command: 'npm update',
            category: 'security'
          }
        ]
      };

      const filePath = '/test/escaped.html';
      
      await generator.generateHTML(resultsWithHtml, filePath);

      const html = (fs.writeFile as jest.Mock).mock.calls[0][1];

      // Should escape HTML tags
      expect(html).not.toContain('<script>alert');
      expect(html).toContain('Package &lt;script&gt;');
    });

    it('should display command blocks with proper formatting', async () => {
      const filePath = '/test/commands.html';
      
      await generator.generateHTML(mockResults, filePath);

      const html = (fs.writeFile as jest.Mock).mock.calls[0][1];

      // Check command formatting
      expect(html).toContain('class="command"');
      expect(html).toContain('background: #f5f5f5');
      expect(html).toContain('font-family: monospace');
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined values', async () => {
      const incompleteResults: any = {
        missingPeerDeps: null,
        conflicts: undefined,
        angularPackages: [],
        summary: {
          healthScore: 0,
          totalIssues: 0
        },
        metadata: {
          analyzedAt: new Date().toISOString()
        }
      };

      const filePath = '/test/incomplete.html';
      
      // Should not throw
      await expect(generator.generateHTML(incompleteResults, filePath))
        .resolves.not.toThrow();
    });

    it('should handle very long package names', async () => {
      const longNameResults: AnalysisResult = {
        ...mockResults,
        missingPeerDeps: [
          {
            package: '@very-long-scope-name/extremely-long-package-name-that-might-break-layout',
            requiredBy: '@another-very-long-scope/another-extremely-long-package-name',
            requiredVersion: '^1.0.0-beta.123.experimental.feature.branch',
            currentVersion: null,
            severity: 'error',
            optional: false
          }
        ]
      };

      const filePath = '/test/longnames.html';
      
      await generator.generateHTML(longNameResults, filePath);

      const html = (fs.writeFile as jest.Mock).mock.calls[0][1];

      // Should include the full names
      expect(html).toContain('@very-long-scope-name/extremely-long-package-name');
    });
  });
});