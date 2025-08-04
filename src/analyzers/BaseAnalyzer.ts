import * as fs from 'fs';
import * as path from 'path';

import * as semver from 'semver';

import type {
  PackageInfo,
  NpmLockFile,
  AnalysisResult,
  AnalyzerConfig,
} from '../types/index.js';
import { ParseError, ValidationError } from '../types/index.js';
import { NpmRegistryClient } from '../utils/NpmRegistryClient.js';

export abstract class BaseAnalyzer {
  protected packageJson: PackageInfo;
  protected lockFile: NpmLockFile | null;
  protected projectRoot: string;
  protected npmClient: NpmRegistryClient;
  protected config: AnalyzerConfig;
  protected packageManager: 'npm' | 'pnpm' | 'yarn';
  protected progressCallback?: (progress: any) => void;

  constructor(
    projectRoot: string = process.cwd(),
    config: AnalyzerConfig,
    progressCallback?: (progress: any) => void,
    npmClient?: NpmRegistryClient
  ) {
    this.projectRoot = path.resolve(projectRoot);
    this.config = config;
    this.progressCallback = progressCallback;
    this.npmClient = npmClient || new NpmRegistryClient(config);

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
      throw new ParseError('package.json not found');
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
        throw new ParseError(`Invalid JSON in package.json: ${error.message}`);
      }
      throw error;
    }
  }

  private loadLockFile(): NpmLockFile | null {
    const npmLockPath = path.join(this.projectRoot, 'package-lock.json');
    const yarnLockPath = path.join(this.projectRoot, 'yarn.lock');
    const pnpmLockPath = path.join(this.projectRoot, 'pnpm-lock.yaml');

    // Try npm
    if (this.fileExists(npmLockPath)) {
      return this.loadNpmLock(npmLockPath);
    }

    // Yarn or pnpm lock exists but not supported
    if (this.fileExists(yarnLockPath)) {
      console.warn('Yarn lock file detected but not supported');
      return null;
    }

    if (this.fileExists(pnpmLockPath)) {
      console.warn('Pnpm lock file detected but not supported');
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
        throw new ParseError(`Invalid JSON in package-lock.json: ${error.message}`);
      }
      throw error;
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

  public getAllDependencies(): Record<string, string> {
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

  /**
   * Obtient la version réellement installée d'un package depuis le lock file
   * @param packageName Nom du package
   * @returns Version installée ou null si non trouvée
   */
  public getInstalledVersion(packageName: string): string | null {
    if (!this.lockFile) {
      // Pas de lock file, on utilise la version du package.json
      return this.getAllDependencies()[packageName] || null;
    }

    // Pour npm (lockfileVersion 2+)
    if ('packages' in this.lockFile && this.lockFile.packages) {
      // D'abord chercher dans node_modules/packageName
      const nodeModulesKey = `node_modules/${packageName}`;
      const packageInfo = this.lockFile.packages[nodeModulesKey];
      
      if (packageInfo && 'version' in packageInfo && packageInfo.version) {
        return packageInfo.version;
      }
      
      // Sinon chercher avec le préfixe vide (root dependencies)
      if (this.lockFile.packages[''] && this.lockFile.packages[''].dependencies) {
        const rootDeps = this.lockFile.packages[''].dependencies;
        
        if (rootDeps[packageName]) {
          // Chercher la version résolue avec gestion des packages scoped
          const searchPattern = packageName.startsWith('@') 
            ? packageName // Pour @angular/core, chercher exactement @angular/core
            : `/${packageName}`; // Pour les packages normaux
          
          for (const [key, value] of Object.entries(this.lockFile.packages)) {
            const matches = packageName.startsWith('@') 
              ? key === `node_modules/${packageName}` // Correspondance exacte pour scoped packages
              : key.endsWith(searchPattern); // Correspondance suffixe pour packages normaux
              
            if (matches && 'version' in value && value.version) {
              return value.version;
            }
          }
        }
      }
    }

    // Pour npm ancien format (lockfileVersion 1)
    if ('dependencies' in this.lockFile && this.lockFile.dependencies) {
      const dep = this.lockFile.dependencies[packageName];
      if (dep && dep.version) {
        return dep.version;
      }
    }

    // Fallback sur package.json
    return this.getAllDependencies()[packageName] || null;
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

    const progress = {
      total,
      completed: current,
      currentTask: task,
      percentage: Math.round((current / total) * 100),
      startTime: Date.now(),
    };

    this.progressCallback(progress);
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