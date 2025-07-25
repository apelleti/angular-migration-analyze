import * as fs from 'fs';
import * as path from 'path';
import { BaseAnalyzer } from './BaseAnalyzer';
import { AnalysisResult, ConfigurationIssue, ModernizationSuggestion } from '../types';

export class ConfigurationAnalyzer extends BaseAnalyzer {
  async analyze(): Promise<Partial<AnalysisResult> & {
    configurationIssues: ConfigurationIssue[];
    modernizationSuggestions: ModernizationSuggestion[];
  }> {
    console.log('⚙️ Analyse de configuration...');

    const configurationIssues: ConfigurationIssue[] = [];
    const modernizationSuggestions: ModernizationSuggestion[] = [];

    // Analyser angular.json
    await this.analyzeAngularConfig(configurationIssues, modernizationSuggestions);
    
    // Analyser tsconfig.json
    await this.analyzeTsConfig(configurationIssues, modernizationSuggestions);
    
    // Analyser package.json scripts
    await this.analyzePackageScripts(configurationIssues, modernizationSuggestions);

    return {
      configurationIssues,
      modernizationSuggestions,
      recommendations: [
        ...configurationIssues.map(issue => ({
          type: issue.severity,
          category: 'configuration' as const,
          message: issue.description,
          action: issue.solution,
          priority: issue.severity === 'error' ? 'high' : issue.severity === 'warning' ? 'medium' : 'low' as const
        })),
        ...modernizationSuggestions.map(sugg => ({
          type: 'info' as const,
          category: 'configuration' as const,
          message: sugg.description,
          action: sugg.action,
          command: sugg.command,
          priority: 'medium' as const
        }))
      ]
    };
  }

  private async analyzeAngularConfig(
    issues: ConfigurationIssue[],
    suggestions: ModernizationSuggestion[]
  ): Promise<void> {
    try {
      const angularJsonPath = path.join(this.projectRoot, 'angular.json');
      if (!fs.existsSync(angularJsonPath)) return;

      const angularConfig = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
      
      // Vérifier la version du schema
      if (angularConfig.$schema && angularConfig.$schema.includes('angular-devkit')) {
        const schemaVersion = angularConfig.$schema.match(/angular-devkit.*?(\d+)/)?.[1];
        if (schemaVersion && parseInt(schemaVersion) < 15) {
          suggestions.push({
            type: 'configuration',
            description: 'Schema angular.json obsolète',
            action: 'Mettre à jour le schema vers la dernière version',
            command: 'ng update @angular/cli'
          });
        }
      }

      // Analyser les projets
      for (const [projectName, project] of Object.entries(angularConfig.projects || {})) {
        const proj = project as any;
        
        // Vérifier les builders obsolètes
        if (proj.architect?.build?.builder === '@angular-devkit/build-angular:browser') {
          suggestions.push({
            type: 'build-optimization',
            description: `Projet ${projectName}: Builder obsolète détecté`,
            action: 'Migrer vers le nouveau builder application',
            command: `ng update @angular/cli --migrate-only --from=15`
          });
        }
        
        // Vérifier les optimisations de build
        const buildOptions = proj.architect?.build?.options;
        if (buildOptions && !buildOptions.optimization) {
          issues.push({
            type: 'configuration',
            severity: 'warning',
            description: `Projet ${projectName}: Optimizations désactivées`,
            solution: 'Activer les optimizations pour la production'
          });
        }
      }
      
    } catch (error) {
      console.warn('Erreur lors de l\'analyse de angular.json:', error.message);
    }
  }

  private async analyzeTsConfig(
    issues: ConfigurationIssue[],
    suggestions: ModernizationSuggestion[]
  ): Promise<void> {
    try {
      const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
      if (!fs.existsSync(tsconfigPath)) return;

      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      const compilerOptions = tsconfig.compilerOptions || {};
      
      // Vérifier la target
      if (compilerOptions.target && compilerOptions.target.toLowerCase() === 'es5') {
        suggestions.push({
          type: 'modernization',
          description: 'Target TypeScript obsolète (ES5)',
          action: 'Migrer vers ES2020 ou plus récent',
          command: 'Mettre à jour tsconfig.json: "target": "ES2020"'
        });
      }
      
      // Vérifier les options strictes
      if (!compilerOptions.strict) {
        issues.push({
          type: 'code-quality',
          severity: 'warning',
          description: 'Mode strict TypeScript désactivé',
          solution: 'Activer le mode strict pour une meilleure qualité de code'
        });
      }
      
      // Vérifier les imports
      if (!compilerOptions.moduleResolution || compilerOptions.moduleResolution !== 'node') {
        issues.push({
          type: 'configuration',
          severity: 'error',
          description: 'Résolution de modules incorrecte',
          solution: 'Configurer moduleResolution: "node"'
        });
      }
      
    } catch (error) {
      console.warn('Erreur lors de l\'analyse de tsconfig.json:', error.message);
    }
  }

  private async analyzePackageScripts(
    issues: ConfigurationIssue[],
    suggestions: ModernizationSuggestion[]
  ): Promise<void> {
    const scripts = this.packageJson.scripts || {};
    
    // Vérifier les scripts essentiels
    const essentialScripts = ['build', 'test', 'lint'];
    for (const script of essentialScripts) {
      if (!scripts[script]) {
        issues.push({
          type: 'configuration',
          severity: 'warning',
          description: `Script "${script}" manquant`,
          solution: `Ajouter le script ${script} dans package.json`
        });
      }
    }
    
    // Détecter les commandes obsolètes
    for (const [scriptName, command] of Object.entries(scripts)) {
      if (typeof command === 'string') {
        if (command.includes('protractor')) {
          suggestions.push({
            type: 'testing',
            description: `Script "${scriptName}" utilise Protractor (déprécié)`,
            action: 'Migrer vers Cypress ou Playwright',
            command: 'ng add @cypress/schematic'
          });
        }
        
        if (command.includes('tslint')) {
          suggestions.push({
            type: 'linting',
            description: `Script "${scriptName}" utilise TSLint (déprécié)`,
            action: 'Migrer vers ESLint',
            command: 'ng add @angular-eslint/schematics'
          });
        }
      }
    }
  }
}