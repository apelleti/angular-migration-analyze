import * as fs from 'fs';
import * as path from 'path';
import pLimit from 'p-limit';
import { BaseAnalyzer } from './analyzers/BaseAnalyzer';
import { PeerDependencyAnalyzer } from './analyzers/PeerDependencyAnalyzer';
import { VersionCompatibilityAnalyzer } from './analyzers/VersionCompatibilityAnalyzer';
import { AngularAnalyzer } from './analyzers/AngularAnalyzer';
import { SecurityAnalyzer } from './analyzers/SecurityAnalyzer';
import { PerformanceAnalyzer } from './analyzers/PerformanceAnalyzer';
import { ConfigurationAnalyzer } from './analyzers/ConfigurationAnalyzer';
import { ConfigurationManager } from './utils/ConfigurationManager';
import {
  AnalysisResult,
  AnalyzerConfig,
  AnalysisProgress,
  SecurityVulnerability,
  DeprecatedPackage,
  LicenseInfo,
  BundleAnalysis,
  DuplicatedDependency,
  OptimizationSuggestion,
  ConfigurationIssue,
  ModernizationSuggestion,
} from './types';

export class MigrationAnalyzer {
  private analyzers: BaseAnalyzer[];
  private config: AnalyzerConfig;
  private projectRoot: string;
  private progressCallback?: (progress: AnalysisProgress) => void;

  constructor(
    projectRoot?: string,
    config?: AnalyzerConfig,
    progressCallback?: (progress: AnalysisProgress) => void
  ) {
    this.projectRoot = projectRoot || process.cwd();
    this.config = config || ConfigurationManager.loadConfiguration(this.projectRoot);
    this.progressCallback = progressCallback;

    // Initialize analyzers with configuration
    this.analyzers = [
      new PeerDependencyAnalyzer(this.projectRoot, this.config, progressCallback),
      new VersionCompatibilityAnalyzer(this.projectRoot, this.config, progressCallback),
      new AngularAnalyzer(this.projectRoot, this.config, progressCallback),
      new SecurityAnalyzer(this.projectRoot, this.config, progressCallback),
      new PerformanceAnalyzer(this.projectRoot, this.config, progressCallback),
      new ConfigurationAnalyzer(this.projectRoot, this.config, progressCallback),
    ];
  }

  async analyze(): Promise<
    AnalysisResult & {
      vulnerabilities?: SecurityVulnerability[];
      deprecatedPackages?: DeprecatedPackage[];
      licenseIssues?: LicenseInfo[];
      bundleAnalysis?: BundleAnalysis;
      duplicatedDependencies?: DuplicatedDependency[];
      optimizationSuggestions?: OptimizationSuggestion[];
      configurationIssues?: ConfigurationIssue[];
      modernizationSuggestions?: ModernizationSuggestion[];
    }
  > {
    const startTime = Date.now();

    console.log("🚀 Démarrage de l'analyse complète...");

    try {
      // Update progress
      this.updateProgress(0, this.analyzers.length, 'Initialisation');

      // Create a limiter to control concurrency
      const limit = pLimit(3); // Run max 3 analyzers in parallel to avoid overloading

      // Run all analyzers in parallel with controlled concurrency
      const analysisPromises = this.analyzers.map((analyzer, index) =>
        limit(async () => {
          try {
            this.updateProgress(
              index,
              this.analyzers.length,
              `Analyse ${analyzer.constructor.name}`
            );
            const result = await analyzer.analyze();
            this.updateProgress(
              index + 1,
              this.analyzers.length,
              `Terminé ${analyzer.constructor.name}`
            );
            return result;
          } catch (error) {
            console.warn(`Analyzer ${analyzer.constructor.name} failed:`, error.message);
            return {};
          }
        })
      );

      const results = await Promise.all(analysisPromises);

      // Merge results
      const mergedResult = this.mergeResults(results);

      // Calculate execution time
      const duration = Date.now() - startTime;

      // Generate summary and metadata
      const summary = this.generateSummary(mergedResult);
      const metadata = this.generateMetadata(duration);

      const finalResult = {
        ...mergedResult,
        summary,
        metadata,
      };

      // Cache results if enabled
      if (this.config.cache.enabled) {
        await this.cacheResults(finalResult);
      }

      this.updateProgress(this.analyzers.length, this.analyzers.length, 'Analyse terminée');

      return finalResult;
    } catch (error) {
      console.error('Analysis failed:', error);
      throw error;
    }
  }

  async analyzeWithCache(useCache: boolean = true): Promise<any> {
    if (useCache && this.config.cache.enabled) {
      const cacheFile = path.join(this.projectRoot, '.migration-cache.json');

      try {
        if (fs.existsSync(cacheFile)) {
          const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
          const cacheAge = Date.now() - cache.timestamp;

          // Cache valid for the configured TTL
          if (cacheAge < this.config.cache.ttl) {
            console.log('📄 Utilisation du cache existant...');
            return cache.data;
          }
        }
      } catch (error) {
        console.warn('Failed to read cache, performing fresh analysis');
      }
    }

    const results = await this.analyze();

    return results;
  }

  private mergeResults(results: Array<Partial<AnalysisResult>>): any {
    const merged: any = {
      missingPeerDeps: [],
      incompatibleVersions: [],
      conflicts: [],
      angularPackages: [],
      recommendations: [],
      migrationPath: [],
      vulnerabilities: [],
      deprecatedPackages: [],
      licenseIssues: [],
      duplicatedDependencies: [],
      optimizationSuggestions: [],
      configurationIssues: [],
      modernizationSuggestions: [],
    };

    for (const result of results) {
      // Standard fields
      if (result.missingPeerDeps) merged.missingPeerDeps.push(...result.missingPeerDeps);
      if (result.incompatibleVersions)
        merged.incompatibleVersions.push(...result.incompatibleVersions);
      if (result.conflicts) merged.conflicts.push(...result.conflicts);
      if (result.angularPackages) merged.angularPackages.push(...result.angularPackages);
      if (result.recommendations) merged.recommendations.push(...result.recommendations);
      if (result.migrationPath) merged.migrationPath.push(...result.migrationPath);

      // Extended fields from specialized analyzers
      if ((result as any).vulnerabilities)
        merged.vulnerabilities.push(...(result as any).vulnerabilities);
      if ((result as any).deprecatedPackages)
        merged.deprecatedPackages.push(...(result as any).deprecatedPackages);
      if ((result as any).licenseIssues)
        merged.licenseIssues.push(...(result as any).licenseIssues);
      if ((result as any).duplicatedDependencies)
        merged.duplicatedDependencies.push(...(result as any).duplicatedDependencies);
      if ((result as any).optimizationSuggestions)
        merged.optimizationSuggestions.push(...(result as any).optimizationSuggestions);
      if ((result as any).configurationIssues)
        merged.configurationIssues.push(...(result as any).configurationIssues);
      if ((result as any).modernizationSuggestions)
        merged.modernizationSuggestions.push(...(result as any).modernizationSuggestions);

      // Handle single-value fields
      if ((result as any).bundleAnalysis && !merged.bundleAnalysis) {
        merged.bundleAnalysis = (result as any).bundleAnalysis;
      }
    }

    // Deduplicate recommendations
    merged.recommendations = this.deduplicateRecommendations(merged.recommendations);

    // Sort migration steps by order
    merged.migrationPath.sort((a: any, b: any) => a.order - b.order);

    return merged;
  }

  private deduplicateRecommendations(recommendations: any[]): any[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      const key = `${rec.message}-${rec.package || ''}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private generateSummary(results: any): any {
    const criticalIssues =
      (results.missingPeerDeps?.filter((dep: any) => dep.severity === 'error') || []).length +
      (results.incompatibleVersions?.filter((iv: any) => iv.severity === 'error') || []).length +
      (results.conflicts?.filter((c: any) => c.severity === 'error') || []).length +
      (
        results.vulnerabilities?.filter(
          (v: any) => v.severity === 'critical' || v.severity === 'high'
        ) || []
      ).length;

    const warnings =
      (results.missingPeerDeps?.filter((dep: any) => dep.severity === 'warning') || []).length +
      (results.incompatibleVersions?.filter((iv: any) => iv.severity === 'warning') || []).length +
      (results.conflicts?.filter((c: any) => c.severity === 'warning') || []).length +
      (
        results.vulnerabilities?.filter(
          (v: any) => v.severity === 'moderate' || v.severity === 'low'
        ) || []
      ).length +
      (results.configurationIssues?.filter((ci: any) => ci.severity === 'warning') || []).length;

    const totalIssues = criticalIssues + warnings;

    // Calculate health score (0-100)
    let healthScore = 100;
    healthScore -= criticalIssues * 15; // Critical issues impact more
    healthScore -= warnings * 3;
    healthScore -= (results.deprecatedPackages?.length || 0) * 2;
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      totalIssues,
      criticalIssues,
      warnings,
      angularPackagesCount: results.angularPackages?.length || 0,
      recommendationsCount: results.recommendations?.length || 0,
      healthScore,
      securityIssues: results.vulnerabilities?.length || 0,
      performanceIssues:
        results.optimizationSuggestions?.filter((s: any) => s.impact === 'high').length || 0,
      configurationIssues: results.configurationIssues?.length || 0,
    };
  }

  private generateMetadata(duration: number): any {
    return {
      timestamp: new Date().toISOString(),
      duration,
      nodeVersion: process.version,
      platform: process.platform,
      projectPath: this.projectRoot,
      analyzerVersion: '1.0.0',
      packageManager: this.detectPackageManager(),
      configUsed: {
        registry: this.config.registry,
        cacheEnabled: this.config.cache.enabled,
        includeDevDeps: this.config.analysis.includeDevDependencies,
        excludedPackages: this.config.analysis.excludePackages.length,
      },
    };
  }

  private detectPackageManager(): 'npm' | 'pnpm' | 'yarn' {
    const checks = [
      { file: 'pnpm-lock.yaml', manager: 'pnpm' as const },
      { file: 'yarn.lock', manager: 'yarn' as const },
      { file: 'package-lock.json', manager: 'npm' as const },
    ];

    for (const check of checks) {
      if (fs.existsSync(path.join(this.projectRoot, check.file))) {
        return check.manager;
      }
    }

    return 'npm';
  }

  private async cacheResults(results: any): Promise<void> {
    try {
      const cacheFile = path.join(this.projectRoot, '.migration-cache.json');
      const cacheData = {
        timestamp: Date.now(),
        data: results,
        version: '1.0.0',
      };

      await fs.promises.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
      console.log('💾 Résultats mis en cache');
    } catch (error) {
      console.warn('Failed to cache results:', error.message);
    }
  }

  private updateProgress(current: number, total: number, task: string): void {
    if (!this.progressCallback) return;

    const progress: AnalysisProgress = {
      total,
      completed: current,
      currentTask: task,
      percentage: Math.round((current / total) * 100),
      startTime: Date.now(),
    };

    this.progressCallback(progress);
  }

  // Public method to clear cache
  async clearCache(): Promise<void> {
    const cacheFile = path.join(this.projectRoot, '.migration-cache.json');
    try {
      if (fs.existsSync(cacheFile)) {
        await fs.promises.unlink(cacheFile);
        console.log('🗑️ Cache supprimé');
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error.message);
    }
  }

  // Get cache information
  getCacheInfo(): { exists: boolean; age?: number; size?: number } {
    const cacheFile = path.join(this.projectRoot, '.migration-cache.json');

    try {
      if (fs.existsSync(cacheFile)) {
        const stats = fs.statSync(cacheFile);
        return {
          exists: true,
          age: Date.now() - stats.mtime.getTime(),
          size: stats.size,
        };
      }
    } catch (error) {
      // Cache file exists but can't be read
    }

    return { exists: false };
  }
}
