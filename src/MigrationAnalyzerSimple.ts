import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as semver from 'semver';
import { BreakingChangeDownloader } from './services/BreakingChangeDownloader.js';
import { ASTPatternScanner } from './scanners/ASTPatternScanner.js';
import { PeerDependencyAnalyzer } from './analyzers/PeerDependencyAnalyzer.js';
import { CacheManager } from './utils/SimpleCacheManager.js';
import { 
  MigrationConfig, 
  AnalysisReport, 
  DeprecatedPattern,
  MigrationPlan,
  ValidationResult,
  BreakingChange
} from './types/index.js';

export class MigrationAnalyzer {
  private config: MigrationConfig;
  private cache: CacheManager;
  private breakingChangeDownloader: BreakingChangeDownloader;
  private patternScanner: ASTPatternScanner | null = null;
  private peerDepAnalyzer: PeerDependencyAnalyzer;
  
  public fromVersion: string = '';
  public toVersion: string = '';
  public breakingChanges: BreakingChange[] = [];
  
  constructor(config: MigrationConfig) {
    this.config = config;
    this.cache = new CacheManager();
    this.breakingChangeDownloader = new BreakingChangeDownloader(this.cache);
    
    // Create analyzer config from migration config
    const analyzerConfig = {
      registry: 'https://registry.npmjs.org',
      timeout: 10000,
      retries: 3,
      maxConcurrentRequests: 10,
      network: {
        strictSSL: true,
        timeout: 30000
      },
      cache: {
        enabled: true,
        ttl: 300000,
        maxSize: 100,
        persistToDisk: true,
        diskCachePath: './.migration-cache'
      },
      analysis: {
        includeDevDependencies: true,
        checkVulnerabilities: false,
        skipOptionalPeerDeps: false,
        excludePackages: [],
        offlineMode: false
      }
    };
    
    this.peerDepAnalyzer = new PeerDependencyAnalyzer(
      this.config.projectPath, 
      analyzerConfig
    );
  }
  
  async detectAngularVersion(): Promise<string> {
    const packageJsonPath = join(this.config.projectPath, 'package.json');
    
    if (!existsSync(packageJsonPath)) {
      throw new Error('No package.json found in project path');
    }
    
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const angularCore = packageJson.dependencies?.['@angular/core'] || 
                       packageJson.devDependencies?.['@angular/core'];
    
    if (!angularCore) {
      throw new Error('No @angular/core dependency found');
    }
    
    // Extract version number using semver for safety
    const coercedVersion = semver.coerce(angularCore);
    if (!coercedVersion) {
      throw new Error(`Invalid Angular version format: ${angularCore}`);
    }
    
    const majorVersion = String(coercedVersion.major);
    this.fromVersion = this.config.fromVersion || majorVersion;
    this.toVersion = this.config.toVersion || String(coercedVersion.major + 1);
    
    return majorVersion;
  }
  
  async fetchBreakingChanges(): Promise<void> {
    this.breakingChanges = await this.breakingChangeDownloader.download(
      this.fromVersion,
      this.toVersion
    );
  }
  
  async analyzeDependencies(): Promise<any> {
    const packageJsonPath = join(this.config.projectPath, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    const incompatibleDeps: any[] = [];
    const deprecatedDeps: any[] = [];
    
    // Check known problematic packages
    const problematicPackages: Record<string, any> = {
      '@angular/flex-layout': { status: 'deprecated', alternative: '@angular/cdk/layout' },
      '@angular/http': { status: 'removed', alternative: '@angular/common/http' },
      'ngx-bootstrap': { maxAngular: 16, alternative: 'ng-bootstrap' }
    };
    
    for (const [pkg, info] of Object.entries(problematicPackages)) {
      if (packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]) {
        if (info.status === 'deprecated' || info.status === 'removed') {
          deprecatedDeps.push({ package: pkg, ...info });
        } else if (info.maxAngular && parseInt(this.toVersion) > info.maxAngular) {
          incompatibleDeps.push({ package: pkg, ...info });
        }
      }
    }
    
    return {
      incompatible: incompatibleDeps,
      deprecated: deprecatedDeps,
      total: Object.keys({...packageJson.dependencies, ...packageJson.devDependencies}).length
    };
  }
  
  async scanPatterns(): Promise<DeprecatedPattern[]> {
    const tsconfigPath = join(this.config.projectPath, 'tsconfig.json');
    
    if (!existsSync(tsconfigPath)) {
      // Return empty array if no tsconfig
      console.warn('No tsconfig.json found - skipping AST pattern scan');
      return [];
    }
    
    try {
      this.patternScanner = new ASTPatternScanner(tsconfigPath);
      return this.patternScanner.scan();
    } catch (error) {
      console.warn('Failed to scan patterns:', error.message);
      return [];
    }
  }
  
  async analyzePeerDependencies(): Promise<any> {
    try {
      const result = await this.peerDepAnalyzer.analyze();
      
      // Transform to our expected format
      const conflicts = result.missingPeerDeps?.map(dep => {
        // Get the actual installed version
        const installedVersion = this.peerDepAnalyzer.getInstalledVersion(dep.package);
        const allDeps = this.peerDepAnalyzer.getAllDependencies();
        const declaredVersion = allDeps[dep.package];
        
        const actualInstalled = installedVersion || declaredVersion || 'not installed';
        
        return {
          package: dep.package,
          required: dep.requiredVersion,
          installed: actualInstalled,
          resolution: actualInstalled === 'not installed' 
            ? `npm install ${dep.package}@${dep.requiredVersion}`
            : `Update ${dep.package} from ${actualInstalled} to ${dep.requiredVersion}`
        };
      }) || [];
      
      // Add incompatible versions as conflicts
      result.incompatibleVersions?.forEach(inc => {
        conflicts.push({
          package: inc.package,
          required: inc.requiredVersion,
          installed: inc.currentVersion,
          resolution: `Update to ${inc.requiredVersion}`
        });
      });
      
      return { conflicts };
    } catch (error) {
      console.warn('Failed to analyze peer dependencies:', error.message);
      return { conflicts: [] };
    }
  }
  
  estimateEffort(patterns: DeprecatedPattern[], peerDeps: any): string {
    const autoFixableCount = patterns.filter(p => p.autoFixable).length;
    const manualFixCount = patterns.length - autoFixableCount;
    const peerDepConflicts = peerDeps.conflicts?.length || 0;
    
    // Simple estimation algorithm
    const hoursEstimate = 
      (autoFixableCount * 0.1) + // 6 minutes per auto-fixable
      (manualFixCount * 0.5) +    // 30 minutes per manual fix
      (peerDepConflicts * 2);     // 2 hours per peer dep conflict
    
    if (hoursEstimate < 8) return `${Math.ceil(hoursEstimate)} hours`;
    const days = Math.ceil(hoursEstimate / 8);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  
  generateMigrationPlan(): MigrationPlan {
    return {
      phases: [
        {
          name: 'Preparation',
          tasks: [
            'Backup project (git checkout -b migration-backup)',
            'Update TypeScript to compatible version',
            'Resolve peer dependency conflicts'
          ],
          duration: '2-4 hours'
        },
        {
          name: 'Migration',
          tasks: [
            `Run: ng update @angular/core@${this.toVersion} @angular/cli@${this.toVersion}`,
            'Apply automatic fixes: ngma fix --auto-safe',
            'Fix remaining issues manually'
          ],
          duration: '4-8 hours'
        },
        {
          name: 'Validation',
          tasks: [
            'Run tests: npm test',
            'Build application: npm run build',
            'Verify functionality manually',
            'Run: ngma validate'
          ],
          duration: '2-3 hours'
        }
      ],
      totalEstimate: '1-2 days'
    };
  }
  
  async saveReport(report: AnalysisReport, filename: string): Promise<void> {
    const dir = join(this.config.projectPath, '.ngma');
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(
      join(dir, filename),
      JSON.stringify(report, null, 2)
    );
  }
  
  async exportMigrationPlan(plan: MigrationPlan, filename: string): Promise<void> {
    const dir = join(this.config.projectPath, '.ngma');
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    const markdown = this.formatMigrationPlanAsMarkdown(plan);
    writeFileSync(join(dir, filename), markdown);
  }
  
  async exportMigrationSummary(report: AnalysisReport, filename: string): Promise<void> {
    const dir = join(this.config.projectPath, '.ngma');
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    const markdown = this.formatMigrationSummaryAsMarkdown(report);
    writeFileSync(join(dir, filename), markdown);
  }
  
  private formatMigrationPlanAsMarkdown(plan: MigrationPlan): string {
    let markdown = `# Angular Migration Plan\n\n`;
    markdown += `**Total Estimated Time:** ${plan.totalEstimate}\n\n`;
    
    plan.phases.forEach((phase, index) => {
      markdown += `## Phase ${index + 1}: ${phase.name}\n\n`;
      markdown += `**Duration:** ${phase.duration}\n\n`;
      markdown += `### Tasks:\n\n`;
      
      phase.tasks.forEach(task => {
        markdown += `- [ ] ${task}\n`;
      });
      
      markdown += `\n`;
    });
    
    return markdown;
  }
  
  private formatMigrationSummaryAsMarkdown(report: AnalysisReport): string {
    let markdown = `# Angular Migration Summary\n\n`;
    markdown += `**Project:** ${report.projectPath}\n`;
    markdown += `**Migration:** Angular ${report.fromVersion} → ${report.toVersion}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `- **Files Impacted:** ${report.summary.filesImpacted}\n`;
    markdown += `- **Breaking Changes:** ${report.summary.breakingChanges}\n`;
    markdown += `- **Peer Dependency Conflicts:** ${report.summary.peerDepConflicts}\n`;
    markdown += `- **Estimated Effort:** ${report.summary.estimatedEffort}\n\n`;
    
    if (report.patterns.length > 0) {
      markdown += `## Deprecated Patterns Found\n\n`;
      report.patterns.forEach((pattern, index) => {
        markdown += `### ${index + 1}. ${pattern.type}\n\n`;
        markdown += `**File:** \`${pattern.file}\`\n`;
        markdown += `**Line:** ${pattern.line}\n`;
        markdown += `**Description:** ${pattern.description}\n`;
        markdown += `**Auto-fixable:** ${pattern.autoFixable ? '✅ Yes' : '❌ No'}\n\n`;
      });
    }
    
    if (report.peerDependencies.conflicts.length > 0) {
      markdown += `## Peer Dependency Conflicts\n\n`;
      report.peerDependencies.conflicts.forEach((conflict, index) => {
        markdown += `### ${index + 1}. ${conflict.package}\n\n`;
        markdown += `**Required:** ${conflict.required}\n`;
        markdown += `**Installed:** ${conflict.installed}\n`;
        markdown += `**Impact:** ${conflict.impact}\n\n`;
      });
    }
    
    return markdown;
  }
  
  // Validation methods
  async checkDeprecatedAPIs(): Promise<ValidationResult> {
    const patterns = await this.scanPatterns();
    const deprecatedAPIs = patterns.filter(p => 
      p.type.includes('deprecated') || p.type.includes('removed')
    );
    
    return {
      passed: deprecatedAPIs.length === 0,
      issues: deprecatedAPIs.map(p => `${p.type} in ${p.file}:${p.line}`)
    };
  }
  
  async validatePeerDependencies(): Promise<ValidationResult> {
    const peerDeps = await this.analyzePeerDependencies();
    return {
      passed: peerDeps.conflicts.length === 0,
      issues: peerDeps.conflicts.map((c: any) => 
        `${c.package}: requires ${c.required} but found ${c.installed}`
      )
    };
  }
  
  async validateTypeScriptConfig(): Promise<ValidationResult> {
    const tsconfigPath = join(this.config.projectPath, 'tsconfig.json');
    
    if (!existsSync(tsconfigPath)) {
      return {
        passed: false,
        issues: ['No tsconfig.json found']
      };
    }
    
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    
    const issues: string[] = [];
    
    // Check strict mode
    if (!tsconfig.compilerOptions?.strict) {
      issues.push('Strict mode is recommended for Angular applications');
    }
    
    // Check target
    const target = tsconfig.compilerOptions?.target?.toLowerCase();
    if (target && ['es5', 'es2015'].includes(target)) {
      issues.push(`Target ${target} is outdated, use ES2022 or later`);
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
  
  async checkLegacyPatterns(): Promise<ValidationResult> {
    const patterns = await this.scanPatterns();
    const legacyPatterns = patterns.filter(p => p.type.includes('legacy'));
    
    return {
      passed: legacyPatterns.length === 0,
      issues: legacyPatterns.map(p => `Legacy pattern: ${p.type}`)
    };
  }
}