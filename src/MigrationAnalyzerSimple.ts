import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import * as semver from 'semver';
import { BreakingChangeDownloader } from './services/BreakingChangeDownloader.js';
import { ASTPatternScanner } from './scanners/ASTPatternScanner.js';
import { PeerDependencyAnalyzer } from './analyzers/PeerDependencyAnalyzer.js';
import { CacheManager } from './utils/SimpleCacheManager.js';
import { 
  MigrationConfig, 
  AnalysisReport, 
  DeprecatedPattern,
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
    // Always use n+1 as target version
    this.toVersion = String(Number(this.fromVersion) + 1);
    
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
      '@angular/flex-layout': { 
        status: 'deprecated', 
        alternative: '@angular/cdk/layout',
        maxAngular: 15,
        reason: 'Only supports Angular up to version 15'
      },
      '@angular/http': { 
        status: 'removed', 
        alternative: '@angular/common/http',
        reason: 'Package has been removed in favor of @angular/common/http'
      },
      'ngx-bootstrap': { 
        maxAngular: 16, 
        alternative: 'ng-bootstrap',
        reason: 'May not be compatible with latest Angular version'
      }
    };
    
    for (const [pkg, info] of Object.entries(problematicPackages)) {
      if (packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]) {
        const currentVersion = packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg];
        
        // Check if package is incompatible with target Angular version
        if (info.maxAngular && parseInt(this.fromVersion) > info.maxAngular) {
          incompatibleDeps.push({ 
            package: pkg, 
            currentVersion,
            maxSupportedAngular: info.maxAngular,
            reason: info.reason,
            alternative: info.alternative
          });
        }
        
        // Also add to deprecated if marked as such
        if (info.status === 'deprecated' || info.status === 'removed') {
          deprecatedDeps.push({ 
            package: pkg, 
            status: info.status,
            alternative: info.alternative 
          });
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
      this.patternScanner = new ASTPatternScanner(tsconfigPath, this.fromVersion, this.toVersion);
      await this.patternScanner.loadPatternConfigs(this.fromVersion, this.toVersion);
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
        
        // Determine appropriate resolution
        let resolution: string;
        if (actualInstalled === 'not installed') {
          resolution = `npm install ${dep.package}@${dep.requiredVersion}`;
        } else if (dep.package.startsWith('@angular/') && dep.requiredBy) {
          // For Angular packages, suggest updating the package that requires the older version
          const installedMajor = semver.major(actualInstalled);
          const requiredRange = dep.requiredVersion;
          const requiredMajor = semver.coerce(requiredRange)?.major;
          
          if (installedMajor && requiredMajor && installedMajor > requiredMajor) {
            // The installed version is newer than what's required - suggest updating the dependent package
            resolution = `${dep.requiredBy} is incompatible (requires Angular ${requiredMajor} but you have Angular ${installedMajor}). Consider updating ${dep.requiredBy} to a version compatible with Angular ${installedMajor} or remove it`;
          } else {
            // The installed version is older - suggest updating to match requirement
            resolution = `Update ${dep.package} from ${actualInstalled} to ${dep.requiredVersion}`;
          }
        } else {
          // For non-Angular packages, default behavior
          resolution = `Update ${dep.package} from ${actualInstalled} to ${dep.requiredVersion}`;
        }
        
        return {
          package: dep.package,
          required: dep.requiredVersion,
          installed: actualInstalled,
          resolution
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
  
  async exportMigrationSummary(report: AnalysisReport, filename: string): Promise<void> {
    const dir = join(this.config.projectPath, '.ngma');
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    const markdown = this.formatMigrationSummaryAsMarkdown(report);
    writeFileSync(join(dir, filename), markdown);
  }
  
  private formatMigrationSummaryAsMarkdown(report: AnalysisReport): string {
    let markdown = `# Angular Migration Summary\n\n`;
    // Use basename for consistency with console output
    const projectName = report.projectPath === '.' || report.projectPath === './' 
      ? basename(process.cwd())
      : basename(report.projectPath);
    markdown += `**Project:** ${projectName}\n`;
    markdown += `**Migration:** Angular ${report.fromVersion} → ${report.toVersion}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `- **Files Impacted:** ${report.summary.filesImpacted}\n`;
    markdown += `- **Breaking Changes:** ${report.summary.breakingChanges}\n`;
    markdown += `- **Peer Dependency Conflicts:** ${report.summary.peerDepConflicts}\n\n`;
    
    if (report.patterns.length > 0) {
      markdown += `## Deprecated Patterns Found\n\n`;
      
      // Group patterns by type for consistency with console output
      const groupedPatterns: Record<string, typeof report.patterns> = {};
      report.patterns.forEach(pattern => {
        if (!groupedPatterns[pattern.type]) {
          groupedPatterns[pattern.type] = [];
        }
        groupedPatterns[pattern.type].push(pattern);
      });
      
      Object.entries(groupedPatterns).forEach(([type, patterns]) => {
        markdown += `### ⚠️ ${type}\n\n`;
        markdown += `**Occurrences:** ${patterns.length}\n`;
        markdown += `**Description:** ${patterns[0].description}\n\n`;
        markdown += `**Locations:**\n`;
        patterns.forEach(pattern => {
          // Make file paths relative and consistent with console
          const relativePath = pattern.file.startsWith('/') 
            ? pattern.file.replace(process.cwd() + '/', '')
            : pattern.file;
          markdown += `- \`${relativePath}:${pattern.line}\`\n`;
        });
        markdown += `\n`;
      });
    }
    
    if (report.peerDependencies.conflicts.length > 0) {
      markdown += `## Peer Dependency Conflicts\n\n`;
      
      // Separate incompatible packages from other conflicts
      const incompatiblePackages = report.peerDependencies.conflicts.filter(c => 
        c.resolution?.includes('is incompatible')
      );
      const otherConflicts = report.peerDependencies.conflicts.filter(c => 
        !c.resolution?.includes('is incompatible')
      );
      
      if (incompatiblePackages.length > 0) {
        markdown += `### ⚠️ Incompatible Packages\n\n`;
        markdown += `The following packages are incompatible with your current Angular version and must be addressed before migration:\n\n`;
        
        // Group by the package causing the incompatibility
        const packageGroups = new Map<string, typeof incompatiblePackages>();
        incompatiblePackages.forEach(conflict => {
          const match = conflict.resolution?.match(/(\S+) is incompatible/);
          if (match) {
            const pkg = match[1];
            if (!packageGroups.has(pkg)) {
              packageGroups.set(pkg, []);
            }
            packageGroups.get(pkg)!.push(conflict);
          }
        });
        
        packageGroups.forEach((conflicts, pkg) => {
          markdown += `#### ${pkg}\n\n`;
          markdown += `This package requires Angular ${conflicts[0].required.replace('^', '')} but your project uses Angular ${report.fromVersion}.\n\n`;
          
          if (pkg === '@angular/flex-layout') {
            markdown += `**Recommended Action:** Replace with @angular/cdk/layout\n`;
            markdown += `- [Migration Guide](https://github.com/angular/flex-layout/wiki/Using-Angular-CDK-Layout)\n`;
          } else {
            markdown += `**Recommended Actions:**\n`;
            markdown += `- Check if a newer version supports Angular ${report.fromVersion}\n`;
            markdown += `- Remove the package if no longer needed\n`;
            markdown += `- Find an alternative package\n`;
          }
          markdown += `\n`;
        });
      }
      
      if (otherConflicts.length > 0) {
        markdown += `### Other Dependency Conflicts\n\n`;
        otherConflicts.forEach((conflict, index) => {
          markdown += `#### ${index + 1}. ${conflict.package}\n\n`;
          markdown += `**Required:** ${conflict.required}\n`;
          markdown += `**Installed:** ${conflict.installed}\n`;
          markdown += `**Resolution:** ${conflict.resolution}\n\n`;
        });
      }
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