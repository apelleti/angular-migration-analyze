import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import {
  AnalysisReport,
  DeprecatedPattern,
  Suggestion,
  SuggestionCategory,
  SuggestionPriority,
  SuggestionsReport
} from '../types/index.js';

export class SuggestionEngine {
  private report: AnalysisReport;
  
  constructor(report: AnalysisReport) {
    this.report = report;
  }
  
  async generateSuggestions(): Promise<SuggestionsReport> {
    const suggestions: Suggestion[] = [];
    
    // Focus on actionable suggestions that complement the migration plan
    
    // 1. Critical pre-migration issues
    if (this.report.peerDependencies) {
      suggestions.push(...this.generateCriticalPreMigrationSuggestions());
    }
    
    // 2. Pattern-specific code fixes (not covered in migration plan)
    if (this.report.patterns && this.report.patterns.length > 0) {
      suggestions.push(...this.generateDetailedPatternSuggestions(this.report.patterns));
    }
    
    // 3. Breaking changes that need manual intervention
    if (this.report.breakingChanges) {
      suggestions.push(...this.generateBreakingChangeSuggestions());
    }
    
    // 4. Post-migration optimizations
    suggestions.push(...this.generatePostMigrationSuggestions());
    
    // 5. Generate migration script
    await this.generateMigrationScript(suggestions);
    
    // Sort by priority and category
    suggestions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.category.localeCompare(b.category);
    });
    
    return {
      projectPath: this.report.projectPath,
      fromVersion: this.report.fromVersion,
      toVersion: this.report.toVersion,
      suggestions,
      totalSuggestions: suggestions.length,
      byCriteria: this.categorizeSuggestions(suggestions),
      estimatedEffort: this.calculateEffort(suggestions)
    };
  }
  
  private generateCriticalPreMigrationSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Only add suggestions for issues that MUST be fixed before migration
    if (this.report.peerDependencies?.conflicts?.length > 0) {
      const incompatiblePackages = this.report.peerDependencies.conflicts.filter(c => 
        c.resolution?.includes('is incompatible')
      );
      
      if (incompatiblePackages.length > 0) {
        // Already covered by the incompatible packages suggestion
        // Don't create duplicate suggestions
      }
      
      // Only create pre-migration fix if there are fixable conflicts
      const fixableConflicts = this.report.peerDependencies.conflicts.filter(c => 
        !c.resolution?.includes('is incompatible') && 
        (c.package === 'zone.js' || c.package === 'typescript' || c.package === 'rxjs')
      );
      
      if (fixableConflicts.length > 0) {
        const preMigrationFixes: string[] = [];
        
        fixableConflicts.forEach(conflict => {
          if (conflict.package === 'zone.js') {
            preMigrationFixes.push(`npm install zone.js@${this.getZoneJsVersion(this.report.toVersion)} --save`);
          } else if (conflict.package === 'typescript') {
            preMigrationFixes.push(`npm install typescript@${this.getTypeScriptVersion(this.report.toVersion)} --save-dev`);
          } else if (conflict.package === 'rxjs') {
            const rxjsVersion = Number(this.report.toVersion) >= 18 ? '^7.8.0' : '^7.5.0';
            preMigrationFixes.push(`npm install rxjs@${rxjsVersion} --save`);
          }
        });
        
        if (preMigrationFixes.length > 0) {
          suggestions.push({
            id: 'pre-migration-dependencies',
            category: 'dependency',
            priority: 'critical',
            title: 'Update critical dependencies before migration',
            description: 'These dependencies must be updated for a clean Angular migration',
            recommendation: 'Run these commands before ng update',
            effort: 'low',
            code: {
              before: '# Outdated dependency versions',
              after: preMigrationFixes.join('\n'),
              files: ['Terminal commands']
            },
            additionalSteps: [
              '1. Run the commands above',
              '2. Verify installation with: npm ls',
              '3. Proceed with Angular migration'
            ]
          });
        }
      }
    }
    
    return suggestions;
  }
  
  private generateDetailedPatternSuggestions(patterns: DeprecatedPattern[]): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    const groupedPatterns = this.groupPatternsByType(patterns);
    
    for (const [patternType, instances] of Object.entries(groupedPatterns)) {
      const suggestion = this.createDetailedPatternSuggestion(patternType, instances);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }
    
    return suggestions;
  }
  
  private generateDependencySuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    if (this.report.dependencies?.incompatible) {
      for (const pkg of this.report.dependencies.incompatible) {
        const recommendation = pkg.alternative 
          ? `Replace with ${pkg.alternative}`
          : `Remove this package or find an alternative compatible with Angular ${this.report.toVersion}`;
          
        suggestions.push({
          id: `dep-${pkg.package}`,
          category: 'dependency',
          priority: 'high',
          title: `Replace ${pkg.package}`,
          description: pkg.reason,
          recommendation: recommendation,
          effort: 'high',
          additionalSteps: pkg.alternative ? [
            `Install ${pkg.alternative} as a replacement`,
            `Update imports from ${pkg.package} to ${pkg.alternative}`,
            `Test functionality with the new package`
          ] : [
            `Check if this package is still needed`,
            `Look for alternatives compatible with Angular ${this.report.toVersion}`,
            `Remove if no longer required`
          ],
          documentation: pkg.alternative 
            ? this.getPackageDocUrl(pkg.alternative)
            : this.getPackageDocUrl(pkg.package)
        });
      }
    }
    
    return suggestions;
  }
  
  private generatePeerDepSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    if (this.report.peerDependencies?.conflicts?.length > 0) {
      // Analyze conflicts to determine best strategy
      const conflicts = this.report.peerDependencies.conflicts;
      const hasComplexConflicts = conflicts.some(c => c.severity === 'error');
      
      // Generate pre-migration fix commands
      const preMigrationFixes: string[] = [];
      
      // Filter out conflicts that are caused by incompatible packages
      const fixableConflicts = conflicts.filter(c => {
        // Skip Angular packages that are already at the correct version but have incompatible dependents
        if (c.package.startsWith('@angular/') && c.resolution?.includes('is incompatible')) {
          return false;
        }
        return true;
      });
      
      // Group conflicts by type
      const typeScriptConflict = fixableConflicts.find(c => c.package === 'typescript');
      const rxjsConflict = fixableConflicts.find(c => c.package === 'rxjs');
      const zoneJsConflict = fixableConflicts.find(c => c.package === 'zone.js');
      const ngrxConflicts = fixableConflicts.filter(c => c.package.startsWith('@ngrx/'));
      
      // Generate specific fix commands
      if (typeScriptConflict) {
        const tsVersion = this.getTypeScriptVersion(this.report.toVersion);
        preMigrationFixes.push(`npm install typescript@${tsVersion} --save-dev`);
      }
      
      if (rxjsConflict) {
        const rxjsVersion = Number(this.report.toVersion) >= 18 ? '^7.8.0' : '^7.5.0';
        preMigrationFixes.push(`npm install rxjs@${rxjsVersion} --save`);
      }
      
      if (zoneJsConflict) {
        const zoneVersion = this.getZoneJsVersion(this.report.toVersion);
        preMigrationFixes.push(`npm install zone.js@${zoneVersion} --save`);
      }
      
      if (ngrxConflicts.length > 0) {
        preMigrationFixes.push(`# Update NgRx packages to current Angular version first`);
        ngrxConflicts.forEach(c => {
          preMigrationFixes.push(`npm install ${c.package}@${this.report.fromVersion} --save`);
        });
      }
      
      // Check for incompatible packages that need to be removed or replaced
      const incompatiblePackages = conflicts.filter(c => 
        c.package.startsWith('@angular/') && c.resolution?.includes('is incompatible')
      );
      
      if (incompatiblePackages.length > 0) {
        // Find the packages causing the incompatibility
        const problematicPackages = new Set<string>();
        incompatiblePackages.forEach(c => {
          const match = c.resolution?.match(/(\S+) is incompatible/);
          if (match) {
            problematicPackages.add(match[1]);
          }
        });
        
        if (problematicPackages.size > 0) {
          suggestions.push({
            id: 'incompatible-packages',
            category: 'dependency',
            priority: 'critical',
            title: 'Remove or update incompatible packages',
            description: `The following packages are incompatible with Angular ${this.report.fromVersion}: ${Array.from(problematicPackages).join(', ')}`,
            recommendation: 'These packages require an older version of Angular and must be updated or removed before migration',
            effort: 'high',
            additionalSteps: Array.from(problematicPackages).map(pkg => {
              if (pkg === '@angular/flex-layout') {
                return `Replace ${pkg} with @angular/cdk/layout (see migration guide: https://github.com/angular/flex-layout/wiki/Using-Angular-CDK-Layout)`;
              }
              return `Check for updates to ${pkg} that support Angular ${this.report.fromVersion}, or remove if no longer needed`;
            })
          });
        }
      }
      
      // Create pre-migration fix suggestion
      if (preMigrationFixes.length > 0) {
        suggestions.push({
          id: 'pre-migration-fixes',
          category: 'dependency',
          priority: 'critical',
          title: 'Fix dependencies BEFORE migration to avoid --force',
          description: 'Resolve these dependencies first for a clean migration',
          recommendation: 'Run these commands before ng update to avoid conflicts',
          effort: 'medium',
          code: {
            before: '# Current conflicting versions',
            after: preMigrationFixes.join('\n'),
            files: ['Terminal commands']
          },
          additionalSteps: [
            '1. Run the fix commands above',
            '2. Run: rm -rf node_modules package-lock.json',
            '3. Run: npm install',
            '4. Verify no errors, then proceed with migration',
            '5. Run: ng update @angular/core@' + this.report.toVersion + ' @angular/cli@' + this.report.toVersion
          ]
        });
      }
      
      // Fallback suggestion if fixes don't resolve everything
      if (hasComplexConflicts) {
        suggestions.push({
          id: 'peer-deps-legacy',
          category: 'dependency',
          priority: 'high',
          title: 'Alternative: Use --legacy-peer-deps if fixes don\'t work',
          description: 'If pre-migration fixes don\'t resolve all conflicts',
          recommendation: 'Use npm install --legacy-peer-deps as last resort',
          effort: 'high',
          code: {
            before: 'ng update @angular/core@' + this.report.toVersion,
            after: 'ng update @angular/core@' + this.report.toVersion + ' @angular/cli@' + this.report.toVersion + ' --force',
            files: ['Migration commands']
          },
          additionalSteps: [
            '1. Run: npm install --legacy-peer-deps',
            '2. Complete Angular migration with --force flag',
            '3. Test application functionality',
            '4. Gradually resolve peer dependency conflicts post-migration',
            '5. Remove --legacy-peer-deps and --force once conflicts are resolved'
          ]
        });
      }
      
      // Don't generate individual suggestions for conflicts already covered above
      // or for Angular packages that need incompatible package updates
    }
    
    return suggestions;
  }
  
  private generateBreakingChangeSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    if (this.report.breakingChanges) {
      for (const change of this.report.breakingChanges) {
        if (change.automated) continue; // Skip automated fixes
        
        suggestions.push({
          id: `breaking-${change.id}`,
          category: 'breaking-change',
          priority: change.impact === 'high' ? 'critical' : 'high',
          title: change.title,
          description: change.description,
          recommendation: change.migration,
          effort: change.effort || 'medium',
          documentation: change.documentation
        });
      }
    }
    
    return suggestions;
  }
  
  private generatePostMigrationSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Suggest new Angular features
    if (Number(this.report.toVersion) >= 18) {
      suggestions.push({
        id: 'angular-18-features',
        category: 'code-pattern',
        priority: 'low',
        title: 'Adopt Angular 18 new features',
        description: 'Take advantage of new features in Angular 18',
        recommendation: 'Consider adopting these new features after migration',
        effort: 'medium',
        additionalSteps: [
          'Use new control flow syntax (@if, @for, @switch) instead of *ngIf, *ngFor',
          'Consider zoneless change detection for better performance',
          'Explore deferred loading with @defer blocks',
          'Use inject() function instead of constructor injection where appropriate'
        ],
        documentation: 'https://angular.io/guide/update-to-version-18'
      });
    }
    
    return suggestions;
  }
  
  private createDetailedPatternSuggestion(patternType: string, instances: DeprecatedPattern[]): Suggestion | null {
    // Only create suggestions for patterns that need manual intervention
    // Auto-fixable patterns are handled by the migration tool
    if (instances[0].autoFixable) {
      return null;
    }
    
    const files = instances.map(i => i.file).filter((v, i, a) => a.indexOf(v) === i);
    
    const patternDetails = this.getPatternDetails(patternType);
    if (!patternDetails) return null;
    
    return {
      id: `pattern-${patternType}`,
      category: 'code-pattern',
      priority: instances[0].severity === 'error' ? 'high' : 'medium',
      title: patternDetails.title,
      description: `Found ${instances.length} occurrences in ${files.length} file(s)`,
      recommendation: patternDetails.recommendation,
      effort: patternDetails.effort || 'medium',
      code: patternDetails.code,
      occurrences: instances.length,
      additionalSteps: patternDetails.steps,
      documentation: patternDetails.documentation
    };
  }
  
  private getPatternDetails(patternType: string): any {
    const details: Record<string, any> = {
      'custom-webpack-config': {
        title: 'Migrate from custom webpack config',
        recommendation: 'Use Angular CLI builders or esbuild instead of custom webpack',
        effort: 'high',
        steps: [
          'Review custom webpack configurations',
          'Check if Angular CLI now supports your use case natively',
          'Consider migrating to esbuild for better performance',
          'Use @angular-builders/custom-webpack if custom config is still needed'
        ],
        documentation: 'https://angular.io/guide/esbuild'
      },
      'deep-imports': {
        title: 'Remove deep imports',
        recommendation: 'Import from package entry points instead of deep paths',
        effort: 'medium',
        code: {
          before: "import { Something } from '@angular/core/src/internal';",
          after: "import { Something } from '@angular/core';"
        },
        steps: [
          'Identify all deep imports in your codebase',
          'Find the correct public API exports',
          'Update imports to use public APIs only'
        ]
      }
    };
    
    return details[patternType];
  }
  
  private createPatternSuggestion(patternType: string, instances: DeprecatedPattern[]): Suggestion | null {
    const patternConfigs: Record<string, any> = {
      'viewchild-static': {
        title: 'Update ViewChild static flag',
        description: `Found ${instances.length} ViewChild decorators with deprecated static flag`,
        recommendation: 'Remove static: false from ViewChild decorators (it\'s now the default)',
        effort: 'low',
        code: {
          before: '@ViewChild(\'template\', { static: false })',
          after: '@ViewChild(\'template\')'
        }
      },
      'module-with-providers-generic': {
        title: 'Add generic type to ModuleWithProviders',
        description: `Found ${instances.length} ModuleWithProviders without generic type`,
        recommendation: 'Add generic type parameter to ModuleWithProviders',
        effort: 'low',
        code: {
          before: 'static forRoot(): ModuleWithProviders {',
          after: 'static forRoot(): ModuleWithProviders<YourModule> {'
        }
      },
      'deprecated-rxjs-operators': {
        title: 'Update deprecated RxJS operators',
        description: `Found ${instances.length} deprecated RxJS operator imports`,
        recommendation: 'Import operators from \'rxjs/operators\' instead',
        effort: 'medium',
        code: {
          before: 'import { map } from \'rxjs/internal/operators\';',
          after: 'import { map } from \'rxjs/operators\';'
        }
      },
      'control-flow-directive': {
        title: 'Migrate to new control flow syntax',
        description: `Found ${instances.length} structural directives that can use new syntax`,
        recommendation: 'Consider migrating to @if/@for/@switch syntax (Angular 17+)',
        effort: 'medium',
        code: {
          before: '*ngIf="condition"',
          after: '@if (condition) {'
        }
      }
    };
    
    const config = patternConfigs[patternType];
    if (!config) return null;
    
    const affectedFiles = [...new Set(instances.map(i => i.file))];
    
    return {
      id: `pattern-${patternType}`,
      category: 'code-pattern',
      priority: instances.some(i => i.severity === 'error') ? 'high' : 'medium',
      title: config.title,
      description: config.description,
      recommendation: config.recommendation,
      effort: config.effort,
      code: {
        ...config.code,
        files: affectedFiles
      },
      occurrences: instances.length
    };
  }
  
  private groupPatternsByType(patterns: DeprecatedPattern[]): Record<string, DeprecatedPattern[]> {
    return patterns.reduce((acc, pattern) => {
      if (!acc[pattern.type]) {
        acc[pattern.type] = [];
      }
      acc[pattern.type].push(pattern);
      return acc;
    }, {} as Record<string, DeprecatedPattern[]>);
  }
  
  private categorizeSuggestions(suggestions: Suggestion[]): Record<string, number> {
    const categories: Record<string, number> = {};
    
    for (const suggestion of suggestions) {
      categories[suggestion.category] = (categories[suggestion.category] || 0) + 1;
    }
    
    return categories;
  }
  
  private calculateEffort(suggestions: Suggestion[]): string {
    const effortPoints: Record<string, number> = {
      low: 1,
      medium: 3,
      high: 8,
      'very-high': 16
    };
    
    const totalPoints = suggestions.reduce((sum, s) => {
      return sum + (effortPoints[s.effort] || 3);
    }, 0);
    
    if (totalPoints < 10) return '1-2 hours';
    if (totalPoints < 30) return '0.5-1 day';
    if (totalPoints < 60) return '1-2 days';
    if (totalPoints < 120) return '3-5 days';
    return '1+ week';
  }
  
  private getPackageDocUrl(packageName: string): string {
    const docUrls: Record<string, string> = {
      '@angular/flex-layout': 'https://github.com/angular/flex-layout/wiki/fxLayout-API',
      '@ngrx/store': 'https://ngrx.io/guide/migration/v16',
      'ngx-bootstrap': 'https://valor-software.com/ngx-bootstrap/#/documentation',
      '@angular/material': 'https://material.angular.io/guide/migration'
    };
    
    return docUrls[packageName] || `https://www.npmjs.com/package/${packageName}`;
  }
  
  displayConsole(report: SuggestionsReport): void {
    console.log(chalk.blue('\n📋 Migration Suggestions Report'));
    console.log('='.repeat(50));
    
    console.log(chalk.yellow(`\nMigration: Angular ${report.fromVersion} → ${report.toVersion}`));
    console.log(`Total suggestions: ${report.totalSuggestions}`);
    console.log(`Estimated effort: ${report.estimatedEffort}`);
    
    // Group by priority
    const byPriority = report.suggestions.reduce((acc, s) => {
      if (!acc[s.priority]) acc[s.priority] = [];
      acc[s.priority].push(s);
      return acc;
    }, {} as Record<string, Suggestion[]>);
    
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    const priorityColors = {
      critical: chalk.red,
      high: chalk.yellow,
      medium: chalk.blue,
      low: chalk.gray
    };
    
    for (const priority of priorityOrder) {
      const suggestions = byPriority[priority];
      if (!suggestions?.length) continue;
      
      console.log(`\n${priorityColors[priority](`[${priority.toUpperCase()}] ${suggestions.length} suggestions:`)}`);
      
      for (const suggestion of suggestions) {
        console.log(`\n  📌 ${chalk.bold(suggestion.title)}`);
        console.log(`     ${suggestion.description}`);
        console.log(`     ${chalk.green('→')} ${suggestion.recommendation}`);
        
        if (suggestion.code) {
          console.log(`     ${chalk.gray('Before:')} ${suggestion.code.before}`);
          console.log(`     ${chalk.gray('After:')}  ${suggestion.code.after}`);
          if (suggestion.code.files.length <= 3) {
            console.log(`     ${chalk.gray('Files:')}  ${suggestion.code.files.join(', ')}`);
          } else {
            console.log(`     ${chalk.gray('Files:')}  ${suggestion.code.files.length} files affected`);
          }
        }
        
        if (suggestion.additionalSteps) {
          console.log(`     ${chalk.cyan('Steps:')}`);
          suggestion.additionalSteps.forEach(step => {
            console.log(`       ${step}`);
          });
        }
        
        if (suggestion.documentation) {
          console.log(`     ${chalk.gray('Docs:')} ${suggestion.documentation}`);
        }
      }
    }
  }
  
  toMarkdown(report: SuggestionsReport): string {
    let markdown = `# Angular Migration Suggestions\n\n`;
    markdown += `**Migration:** Angular ${report.fromVersion} → ${report.toVersion}\n\n`;
    markdown += `**Total suggestions:** ${report.totalSuggestions}\n\n`;
    markdown += `**Estimated effort:** ${report.estimatedEffort}\n\n`;
    
    // Table of contents
    markdown += `## Table of Contents\n\n`;
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    for (const priority of priorityOrder) {
      const count = report.suggestions.filter(s => s.priority === priority).length;
      if (count > 0) {
        markdown += `- [${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority (${count})](#${priority}-priority)\n`;
      }
    }
    markdown += '\n';
    
    // Group by priority
    const byPriority = report.suggestions.reduce((acc, s) => {
      if (!acc[s.priority]) acc[s.priority] = [];
      acc[s.priority].push(s);
      return acc;
    }, {} as Record<string, Suggestion[]>);
    
    for (const priority of priorityOrder) {
      const suggestions = byPriority[priority];
      if (!suggestions?.length) continue;
      
      markdown += `## ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority\n\n`;
      
      for (const suggestion of suggestions) {
        markdown += `### ${suggestion.title}\n\n`;
        markdown += `**Description:** ${suggestion.description}\n\n`;
        markdown += `**Recommendation:** ${suggestion.recommendation}\n\n`;
        markdown += `**Effort:** ${suggestion.effort}\n\n`;
        
        if (suggestion.code) {
          markdown += `**Code changes:**\n\n`;
          markdown += '```typescript\n';
          markdown += `// Before\n${suggestion.code.before}\n\n`;
          markdown += `// After\n${suggestion.code.after}\n`;
          markdown += '```\n\n';
          
          markdown += `**Affected files:** ${suggestion.code.files.join(', ')}\n\n`;
        }
        
        if (suggestion.additionalSteps) {
          markdown += `**Steps:**\n\n`;
          suggestion.additionalSteps.forEach(step => {
            markdown += `${step}\n`;
          });
          markdown += '\n';
        }
        
        if (suggestion.documentation) {
          markdown += `**Documentation:** [${suggestion.documentation}](${suggestion.documentation})\n\n`;
        }
        
        markdown += '---\n\n';
      }
    }
    
    return markdown;
  }
  
  async saveSuggestions(report: SuggestionsReport, filename: string, format: string): Promise<void> {
    const outputDir = join(this.report.projectPath, '.ngma');
    
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    const filepath = join(outputDir, filename);
    let content: string;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(report, null, 2);
        break;
      case 'markdown':
        content = this.toMarkdown(report);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    writeFileSync(filepath, content, 'utf-8');
  }
  
  private getTypeScriptVersion(angularVersion: string): string {
    const version = Number(angularVersion);
    switch (version) {
      case 17: return '~5.2.0';
      case 18: return '~5.4.0';
      case 19: return '~5.5.0';
      default: return '~5.4.0';
    }
  }
  
  private getZoneJsVersion(angularVersion: string): string {
    const version = Number(angularVersion);
    switch (version) {
      case 17: return '~0.13.0';
      case 18: return '~0.14.0';
      case 19: return '~0.15.0';
      default: return '~0.14.0';
    }
  }
  
  private async generateMigrationScript(suggestions: Suggestion[]): Promise<void> {
    const outputDir = join(this.report.projectPath, '.ngma');
    
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Find pre-migration fix suggestion
    const preMigrationFix = suggestions.find(s => s.id === 'pre-migration-fixes');
    const incompatiblePackages = this.report.dependencies?.incompatible || [];
    const hasIncompatiblePackages = incompatiblePackages.length > 0;
    
    let script = `#!/bin/bash
# Auto-generated Angular Migration Script
# Generated by ng-migration-analyzer
# Migration: Angular ${this.report.fromVersion} → ${this.report.toVersion}

set -e

echo "=== Angular Migration Script ==="
echo "Migration: Angular ${this.report.fromVersion} → ${this.report.toVersion}"
echo ""

`;

    // Check for incompatible packages first and exit if found
    if (hasIncompatiblePackages) {
      script += `# ⚠️  ERROR: Incompatible packages detected!
# The following packages are incompatible with Angular ${this.report.fromVersion} and must be resolved:
`;
      
      for (const pkg of incompatiblePackages) {
        script += `# - ${pkg.package} (${pkg.currentVersion}) - ${pkg.reason}
`;
        if (pkg.alternative) {
          script += `#   Alternative: ${pkg.alternative}
`;
        }
      }
      
      script += `
echo "❌ ERROR: Incompatible packages detected!"
echo ""
echo "The following packages must be removed or replaced before migration:"
`;
      
      for (const pkg of incompatiblePackages) {
        script += `echo "  - ${pkg.package}: ${pkg.reason}"
`;
        if (pkg.alternative) {
          script += `echo "    → Suggested alternative: ${pkg.alternative}"
`;
        }
      }
      
      script += `echo ""
echo "Please resolve these incompatible packages before running the migration."
exit 1
`;
      
      // Write script and return early
      const scriptPath = join(outputDir, 'migration.sh');
      writeFileSync(scriptPath, script, { mode: 0o755 });
      console.log(chalk.gray(`Migration script generated: ${scriptPath}`));
      return;
    }
    
    // Add pre-migration fixes if available
    if (preMigrationFix && preMigrationFix.code) {
      script += `# Step 1: Pre-migration dependency fixes
echo "Fixing dependencies before migration..."
${preMigrationFix.code.after}

echo "Cleaning and reinstalling..."
rm -rf node_modules package-lock.json
npm install

`;
    }

    // Add main migration commands without --force
    script += `# Step 2: Update Angular CLI
echo "Updating Angular CLI..."
npm install -g @angular/cli@${this.report.toVersion}

# Step 3: Run Angular migration
echo "Running Angular migration..."
ng update @angular/core@${this.report.toVersion} @angular/cli@${this.report.toVersion} --allow-dirty
`;

    // Add additional Angular packages
    script += `
# Step 4: Update additional Angular packages
echo "Updating additional Angular packages..."
ANGULAR_PACKAGES=$(grep -o '"@angular/[^"]*"' package.json | grep -v '@angular/core\\|@angular/cli' | cut -d'"' -f2 | sort -u)
for pkg in $ANGULAR_PACKAGES; do
    echo "Updating $pkg..."
    ng update \${pkg}@${this.report.toVersion} --allow-dirty || true
done

# Step 5: Clean install
echo "Running clean install..."
rm -rf node_modules package-lock.json
npm install

# Step 6: Build project
echo "Building project..."
npm run build

echo ""
echo "=== Migration Complete ==="
echo "Review the changes and test your application"
echo "See .ngma/suggestions.md for additional manual fixes"
`;

    // Write script
    const scriptPath = join(outputDir, 'migration.sh');
    writeFileSync(scriptPath, script, { mode: 0o755 });
    
    console.log(chalk.gray(`Migration script generated: ${scriptPath}`));
  }
}