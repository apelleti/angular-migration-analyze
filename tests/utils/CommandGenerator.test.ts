import { CommandGenerator } from '../../src/utils/CommandGenerator';
import { AnalysisResult } from '../../src/types';

describe('CommandGenerator', () => {
  let generator: CommandGenerator;

  beforeEach(() => {
    generator = new CommandGenerator();
  });

  describe('generateFixCommands', () => {
    it('should generate commands for missing peer dependencies', () => {
      const results: AnalysisResult & any = {
        missingPeerDeps: [
          {
            package: '@angular/animations',
            requiredBy: '@angular/core',
            requiredVersion: '^17.0.0',
            severity: 'error',
            optional: false
          },
          {
            package: 'tslib',
            requiredBy: '@angular/common',
            requiredVersion: '^2.3.0',
            severity: 'error',
            optional: false
          },
          {
            package: 'zone.js',
            requiredBy: '@angular/core',
            requiredVersion: '~0.14.0',
            severity: 'warning',
            optional: true
          }
        ],
        angularPackages: [],
        vulnerabilities: [],
        duplicatedDependencies: []
      };

      const commands = generator.generateFixCommands(results);

      expect(commands).toHaveLength(1);
      expect(commands[0]).toBe(
        'npm install --save-dev @angular/animations@"^17.0.0" tslib@"^2.3.0"'
      );
    });

    it('should generate Angular update commands', () => {
      const results: AnalysisResult & any = {
        missingPeerDeps: [],
        angularPackages: [
          {
            name: '@angular/core',
            currentVersion: '^15.0.0',
            targetVersion: '17.0.0'
          },
          {
            name: '@angular/common',
            currentVersion: '^15.0.0',
            targetVersion: '17.0.0'
          },
          {
            name: '@angular/cli',
            currentVersion: '^15.0.0',
            targetVersion: '17.0.0'
          }
        ],
        vulnerabilities: [],
        duplicatedDependencies: []
      };

      const commands = generator.generateFixCommands(results);

      expect(commands).toContainEqual(
        'ng update @angular/cli@17.0.0 @angular/core@17.0.0'
      );
    });

    it('should generate security fix commands', () => {
      const results: AnalysisResult & any = {
        missingPeerDeps: [],
        angularPackages: [],
        vulnerabilities: [
          {
            package: 'lodash',
            severity: 'critical',
            title: 'Prototype Pollution',
            fixAvailable: true
          },
          {
            package: 'axios',
            severity: 'high',
            title: 'SSRF',
            fixAvailable: true
          },
          {
            package: 'minimist',
            severity: 'low',
            title: 'ReDoS',
            fixAvailable: true
          }
        ],
        duplicatedDependencies: []
      };

      const commands = generator.generateFixCommands(results);

      expect(commands).toContainEqual('npm audit fix --force');
    });

    it('should generate dedupe command for duplicated dependencies', () => {
      const results: AnalysisResult & any = {
        missingPeerDeps: [],
        angularPackages: [],
        vulnerabilities: [],
        duplicatedDependencies: [
          {
            name: 'lodash',
            versions: ['4.17.21', '3.10.1'],
            estimatedSizeSaving: 500000
          }
        ]
      };

      const commands = generator.generateFixCommands(results);

      expect(commands).toContainEqual('npm dedupe');
    });

    it('should generate multiple commands in correct order', () => {
      const results: AnalysisResult & any = {
        missingPeerDeps: [
          {
            package: 'rxjs',
            requiredBy: '@angular/core',
            requiredVersion: '^7.8.0',
            severity: 'error',
            optional: false
          }
        ],
        angularPackages: [
          {
            name: '@angular/core',
            currentVersion: '^16.0.0',
            targetVersion: '17.0.0'
          }
        ],
        vulnerabilities: [
          { severity: 'critical', fixAvailable: true }
        ],
        duplicatedDependencies: [
          { name: 'tslib', versions: ['2.3.0', '2.4.0'] }
        ]
      };

      const commands = generator.generateFixCommands(results);

      expect(commands.length).toBeGreaterThan(1);
      // Peer deps should come first
      expect(commands[0]).toContain('npm install');
      // Then Angular updates
      expect(commands.find(cmd => cmd.includes('ng update'))).toBeDefined();
      // Then security fixes
      expect(commands.find(cmd => cmd.includes('audit fix'))).toBeDefined();
      // Finally dedupe
      expect(commands[commands.length - 1]).toBe('npm dedupe');
    });

    it('should handle empty results', () => {
      const results: AnalysisResult & any = {
        missingPeerDeps: [],
        angularPackages: [],
        vulnerabilities: [],
        duplicatedDependencies: []
      };

      const commands = generator.generateFixCommands(results);

      expect(commands).toHaveLength(0);
    });

    it('should handle errors gracefully', () => {
      const results: any = {
        missingPeerDeps: null, // Invalid data
        angularPackages: undefined
      };

      const commands = generator.generateFixCommands(results);

      expect(commands).toHaveLength(0);
    });
  });

  describe('getCommandDescription', () => {
    it('should return correct descriptions for known commands', () => {
      expect(generator.getCommandDescription('npm install --save-dev lodash'))
        .toBe('Installation des peer dependencies manquantes');
      
      expect(generator.getCommandDescription('ng update @angular/cli'))
        .toBe('Mise à jour d\'Angular CLI');
      
      expect(generator.getCommandDescription('npm audit fix'))
        .toBe('Correction des vulnérabilités de sécurité');
      
      expect(generator.getCommandDescription('npm dedupe'))
        .toBe('Déduplication des dépendances');
    });

    it('should return default description for unknown commands', () => {
      expect(generator.getCommandDescription('unknown command'))
        .toBe('Commande de maintenance');
    });
  });

  describe('getCommandCategory', () => {
    it('should categorize commands correctly', () => {
      expect(generator.getCommandCategory('npm audit fix')).toBe('security');
      expect(generator.getCommandCategory('ng update @angular/core')).toBe('angular');
      expect(generator.getCommandCategory('npm dedupe')).toBe('dependencies');
      expect(generator.getCommandCategory('npm install rxjs')).toBe('dependencies');
      expect(generator.getCommandCategory('npm run build')).toBe('optimization');
    });
  });

  describe('estimateCommandTime', () => {
    it('should estimate execution time for commands', () => {
      expect(generator.estimateCommandTime('npm install')).toBe('1-3 minutes');
      expect(generator.estimateCommandTime('ng update')).toBe('3-10 minutes');
      expect(generator.estimateCommandTime('npm audit fix')).toBe('2-5 minutes');
      expect(generator.estimateCommandTime('npm dedupe')).toBe('30 secondes');
      expect(generator.estimateCommandTime('npm run build')).toBe('1-5 minutes');
      expect(generator.estimateCommandTime('npm run test')).toBe('2-10 minutes');
      expect(generator.estimateCommandTime('unknown')).toBe('< 1 minute');
    });
  });

  describe('estimateDuration', () => {
    it('should calculate total duration for multiple commands', () => {
      const commands = [
        'npm install package',
        'ng update @angular/core',
        'npm audit fix'
      ];

      const duration = generator.estimateDuration(commands);
      expect(duration).toBe('12 minutes'); // 2 + 7 + 3
    });

    it('should format hours correctly', () => {
      const commands = Array(15).fill('ng update @angular/core'); // 15 * 7 = 105 minutes

      const duration = generator.estimateDuration(commands);
      expect(duration).toBe('1h 45min');
    });

    it('should handle empty command list', () => {
      const duration = generator.estimateDuration([]);
      expect(duration).toBe('0 minutes');
    });
  });

  describe('generateExecutableScript', () => {
    const mockResults: AnalysisResult = {
      missingPeerDeps: [],
      incompatibleVersions: [],
      conflicts: [],
      angularPackages: [],
      recommendations: [],
      migrationPath: [],
      summary: {
        healthScore: 85,
        totalIssues: 2,
        criticalIssues: 0,
        warnings: 2,
        angularPackagesCount: 5,
        recommendationsCount: 2
      },
      metadata: {
        analyzedAt: new Date().toISOString(),
        projectPath: '/test/project',
        packageManager: 'npm',
        nodeVersion: '18.0.0',
        duration: 1234
      }
    };

    it('should generate a complete bash script', () => {
      const commands = ['npm install lodash', 'npm dedupe'];
      const script = generator.generateExecutableScript(commands, mockResults);

      expect(script).toContain('#!/bin/bash');
      expect(script).toContain('set -e');
      expect(script).toContain('set -u');
      expect(script).toContain('npm install lodash');
      expect(script).toContain('npm dedupe');
      expect(script).toContain('npm run build'); // Validation
    });

    it('should include error handling for each command', () => {
      const commands = ['npm install'];
      const script = generator.generateExecutableScript(commands, mockResults);

      expect(script).toContain('if [ $? -eq 0 ]; then');
      expect(script).toContain('echo -e "${GREEN}✅');
      expect(script).toContain('echo -e "${RED}❌');
    });

    it('should include user confirmation prompt', () => {
      const commands = ['npm audit fix --force'];
      const script = generator.generateExecutableScript(commands, mockResults);

      expect(script).toContain('read -p "Continuer ? (y/N)"');
      expect(script).toContain('if [[ ! $REPLY =~ ^[Yy]$ ]]; then');
    });

    it('should create automatic backup', () => {
      const commands = ['ng update'];
      const script = generator.generateExecutableScript(commands, mockResults);

      expect(script).toContain('git add -A');
      expect(script).toContain('git commit -m "Backup avant correction dépendances"');
    });

    it('should include color definitions', () => {
      const commands = [];
      const script = generator.generateExecutableScript(commands, mockResults);

      expect(script).toContain('RED="\\033[31m"');
      expect(script).toContain('GREEN="\\033[32m"');
      expect(script).toContain('YELLOW="\\033[33m"');
      expect(script).toContain('BLUE="\\033[34m"');
      expect(script).toContain('NC="\\033[0m"');
    });
  });

  describe('generateMigrationScript', () => {
    const mockResults: AnalysisResult = {
      missingPeerDeps: [],
      incompatibleVersions: [],
      conflicts: [],
      angularPackages: [],
      recommendations: [],
      migrationPath: [
        {
          order: 1,
          from: '15',
          to: '16',
          description: 'Migration Angular 15 vers 16',
          commands: [
            'ng update @angular/core@16 @angular/cli@16',
            'npm install'
          ],
          validation: 'npm run build && npm run test',
          estimatedDuration: '30 minutes',
          breakingChanges: ['Ivy renderer required']
        },
        {
          order: 2,
          from: '16',
          to: '17',
          description: 'Migration Angular 16 vers 17',
          commands: [
            'ng update @angular/core@17 @angular/cli@17'
          ],
          validation: 'npm run build',
          estimatedDuration: '20 minutes'
        }
      ],
      summary: {
        healthScore: 70,
        totalIssues: 10,
        criticalIssues: 2,
        warnings: 8,
        angularPackagesCount: 12,
        recommendationsCount: 5
      },
      metadata: {
        analyzedAt: new Date().toISOString(),
        projectPath: '/test/project',
        packageManager: 'npm',
        nodeVersion: '18.0.0',
        duration: 2000
      }
    };

    it('should generate migration script with all steps', () => {
      const script = generator.generateMigrationScript(mockResults);

      expect(script).toContain('#!/bin/bash');
      expect(script).toContain('Migration Angular 15 vers 16');
      expect(script).toContain('Migration Angular 16 vers 17');
      expect(script).toContain('ng update @angular/core@16');
      expect(script).toContain('ng update @angular/core@17');
    });

    it('should include validation steps', () => {
      const script = generator.generateMigrationScript(mockResults);

      expect(script).toContain('npm run build && npm run test');
      expect(script).toContain('Validation: npm run build && npm run test');
    });

    it('should create backup branch', () => {
      const script = generator.generateMigrationScript(mockResults);

      expect(script).toContain('BACKUP_BRANCH="backup-before-migration-');
      expect(script).toContain('git checkout -b "$BACKUP_BRANCH"');
    });

    it('should handle empty migration path', () => {
      const resultsNoMigration = {
        ...mockResults,
        migrationPath: []
      };

      const script = generator.generateMigrationScript(resultsNoMigration);
      expect(script).toContain('#!/bin/bash');
      expect(script).not.toContain('ÉTAPE');
    });
  });

  describe('generatePrerequisites', () => {
    it('should generate basic prerequisites', () => {
      const results: AnalysisResult = {
        missingPeerDeps: [],
        incompatibleVersions: [],
        conflicts: [],
        angularPackages: [],
        recommendations: [],
        migrationPath: [],
        summary: {
          healthScore: 90,
          totalIssues: 0,
          criticalIssues: 0,
          warnings: 0,
          angularPackagesCount: 5,
          recommendationsCount: 0
        },
        metadata: {
          analyzedAt: new Date().toISOString(),
          projectPath: '/test/project',
          packageManager: 'npm',
          nodeVersion: '18.0.0',
          duration: 1000
        }
      };

      const prerequisites = generator.generatePrerequisites(results);

      expect(prerequisites).toContain('Créer un backup/commit de l\'état actuel');
      expect(prerequisites).toContain('S\'assurer que tous les tests passent');
      expect(prerequisites).toContain('Vérifier que la build fonctionne');
    });

    it('should add prerequisites for critical issues', () => {
      const results: AnalysisResult = {
        missingPeerDeps: [
          { package: 'rxjs', optional: false, severity: 'error', requiredBy: '@angular/core', requiredVersion: '^7.0.0' }
        ],
        incompatibleVersions: [],
        conflicts: [],
        angularPackages: [],
        recommendations: [],
        migrationPath: [],
        summary: {
          healthScore: 60,
          totalIssues: 5,
          criticalIssues: 3,
          warnings: 2,
          angularPackagesCount: 5,
          recommendationsCount: 2
        },
        metadata: {
          analyzedAt: new Date().toISOString(),
          projectPath: '/test/project',
          packageManager: 'npm',
          nodeVersion: '18.0.0',
          duration: 1500
        }
      };

      const prerequisites = generator.generatePrerequisites(results);

      expect(prerequisites).toContain('Corriger les problèmes critiques identifiés');
      expect(prerequisites).toContain('Installer les peer dependencies manquantes');
    });
  });

  describe('generatePostMigrationSteps', () => {
    it('should generate standard post-migration steps', () => {
      const results: AnalysisResult = {} as any;
      const steps = generator.generatePostMigrationSteps(results);

      expect(steps).toContain('Exécuter npm run build pour vérifier la compilation');
      expect(steps).toContain('Lancer npm run test pour valider les tests');
      expect(steps).toContain('Tester l\'application manuellement');
      expect(steps).toContain('Vérifier les breaking changes dans les guides Angular');
      expect(steps).toContain('Mettre à jour la documentation du projet');
      expect(steps).toContain('Créer un commit de la migration réussie');
    });
  });
});