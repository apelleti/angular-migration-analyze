import * as fs from 'fs';
import * as path from 'path';

import * as semver from 'semver';
import * as yaml from 'yaml';

import type {
  PackageInfo,
  NpmLockFile,
  PnpmLockFile,
  AnalysisResult,
  AnalyzerConfig,
  AnalysisSummary,
  AnalysisMetadata,
  AnalysisProgress,
} from '../types';
import { ParseError, ValidationError } from '../types';
import { NpmRegistryClient } from '../utils/NpmRegistryClient';

export abstract class BaseAnalyzer {
  protected packageJson: PackageInfo;
  protected lockFile: NpmLockFile | PnpmLockFile | null;
  protected projectRoot: string;
  protected npmClient: NpmRegistryClient;
  protected config: AnalyzerConfig;
  protected packageManager: 'npm' | 'pnpm' | 'yarn';
  protected progressCallback?: (progress: AnalysisProgress) => void;

  constructor(
    projectRoot: string = process.cwd(),
    config: AnalyzerConfig,
    progressCallback?: (progress: AnalysisProgress) => void
  ) {
    this.projectRoot = path.resolve(projectRoot);
    this.config = config;
    this.progressCallback = progressCallback;
    this.npmClient = new NpmRegistryClient(config);

    try {
      this.packageJson = this.loadPackageJson();
      this.lockFile = this.loadLockFile();
      this.packageManager = this.detectPackageManager();
    } catch (error) {
      throw new ValidationError(`Failed to initialize analyzer: ${(error as Error).message}`);
    }
  }

  private loadPackageJson(): PackageInfo {
    const packagePath = path.join(this.projectRoot, 'package.json');

    if (!this.fileExists(packagePath)) {
      throw new ParseError('package.json not found', packagePath);
    }

    try {
      const content = fs.readFileSync(packagePath, 'utf8');
      const parsed = JSON.parse(content);

      // Validate required fields
      if (!parsed.name || typeof parsed.name !== 'string') {
        throw new ValidationError('package.json must have a valid name field');
      }

      return parsed as PackageInfo;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ParseError(`Invalid JSON in package.json: ${error.message}`, packagePath);
      }
      throw error;
    }
  }

  private loadLockFile(): NpmLockFile | PnpmLockFile | null {
    const npmLockPath = path.join(this.projectRoot, 'package-lock.json');
    const pnpmLockPath = path.join(this.projectRoot, 'pnpm-lock.yaml');
    const yarnLockPath = path.join(this.projectRoot, 'yarn.lock');

    // Try pnpm first
    if (this.fileExists(pnpmLockPath)) {
      return this.loadPnpmLock(pnpmLockPath);
    }

    // Then npm
    if (this.fileExists(npmLockPath)) {
      return this.loadNpmLock(npmLockPath);
    }

    // Yarn lock exists but we don't parse it yet
    if (this.fileExists(yarnLockPath)) {
      console.warn('Yarn lock file detected but not fully supported yet');
      return null;
    }

    console.warn('No lock file found - analysis may be incomplete');
    return null;
  }

  private loadNpmLock(lockPath: string): NpmLockFile {
    try {
      const content = fs.readFileSync(lockPath, 'utf8');
      const parsed = JSON.parse(content);

      // Validate npm lock file structure
      if (!parsed.lockfileVersion) {
        throw new ValidationError('Invalid npm lock file: missing lockfileVersion');
      }

      return parsed as NpmLockFile;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ParseError(`Invalid JSON in package-lock.json: ${error.message}`, lockPath);
      }
      throw error;
    }
  }

  private loadPnpmLock(lockPath: string): PnpmLockFile {
    try {
      const content = fs.readFileSync(lockPath, 'utf8');
      const parsed = yaml.parse(content);

      // Validate pnpm lock file structure
      if (!parsed.lockfileVersion) {
        throw new ValidationError('Invalid pnpm lock file: missing lockfileVersion');
      }

      return parsed as PnpmLockFile;
    } catch (error) {
      throw new ParseError(`Failed to parse pnpm-lock.yaml: ${error.message}`, lockPath);
    }
  }

  private detectPackageManager(): 'npm' | 'pnpm' | 'yarn' {
    if (this.fileExists(path.join(this.projectRoot, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (this.fileExists(path.join(this.projectRoot, 'yarn.lock'))) {
      return 'yarn';
    }
    return 'npm';
  }

  protected getAllDependencies(): Record<string, string> {
    const allDeps = {
      ...this.packageJson.dependencies,
      ...(this.config.analysis.includeDevDependencies ? this.packageJson.devDependencies : {}),
    };

    // Filter excluded packages
    const filtered: Record<string, string> = {};
    for (const [name, version] of Object.entries(allDeps)) {
      if (!this.isPackageExcluded(name)) {
        filtered[name] = version;
      }
    }

    return filtered;
  }

  protected isPackageExcluded(packageName: string): boolean {
    return this.config.analysis.excludePackages.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(packageName);
      }
      return packageName === pattern;
    });
  }

  protected isAngularPackage(packageName: string): boolean {
    return (
      packageName.startsWith('@angular/') ||
      packageName === 'angular' ||
      packageName.startsWith('@ngrx/') ||
      packageName.startsWith('@angular-eslint/') ||
      packageName.startsWith('@angular-devkit/')
    );
  }

  protected fileExists(filePath: string): boolean {
    try {
      return fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  protected updateProgress(current: number, total: number, task: string): void {
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

  protected generateSummary(results: Partial<AnalysisResult>): AnalysisSummary {
    const criticalIssues =
      (results.missingPeerDeps?.filter(dep => !dep.optional) || []).length +
      (results.incompatibleVersions?.filter(iv => iv.severity === 'error') || []).length +
      (results.conflicts?.filter(c => c.severity === 'error') || []).length;

    const warnings =
      (results.missingPeerDeps?.filter(dep => dep.optional) || []).length +
      (results.incompatibleVersions?.filter(iv => iv.severity === 'warning') || []).length +
      (results.conflicts?.filter(c => c.severity === 'warning') || []).length;

    const totalIssues = criticalIssues + warnings;

    // Calculate health score (0-100)
    let healthScore = 100;
    healthScore -= criticalIssues * 15; // Critical issues impact more
    healthScore -= warnings * 5;
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      totalIssues,
      criticalIssues,
      warnings,
      angularPackagesCount: results.angularPackages?.length || 0,
      recommendationsCount: results.recommendations?.length || 0,
      healthScore,
    };
  }

  protected generateMetadata(): AnalysisMetadata {
    return {
      timestamp: new Date().toISOString(),
      duration: 0, // Will be set by the main analyzer
      nodeVersion: process.version,
      platform: process.platform,
      projectPath: this.projectRoot,
      analyzerVersion: '1.0.0', // Should come from package.json
      packageManager: this.packageManager,
    };
  }

  protected validateVersion(version: string): boolean {
    if (!version || typeof version !== 'string') return false;

    try {
      // Handle npm version ranges like ^1.0.0, ~1.0.0, >=1.0.0, etc.
      const cleaned = version.replace(/^[\^~>=<]/, '');
      return semver.valid(cleaned) !== null || semver.validRange(version) !== null;
    } catch {
      return false;
    }
  }

  protected cleanVersion(version: string): string | null {
    if (!version) return null;

    try {
      // Remove version range prefixes and try to get a clean version
      const coerced = semver.coerce(version);
      return coerced?.version || null;
    } catch {
      return null;
    }
  }

  abstract analyze(): Promise<Partial<AnalysisResult>>;
}
