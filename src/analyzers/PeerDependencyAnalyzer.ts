import * as semver from 'semver';

import type { AnalysisResult, MissingPeerDep } from '../types/index.js';

import { BaseAnalyzer } from './BaseAnalyzer.js';

export class PeerDependencyAnalyzer extends BaseAnalyzer {
  async analyze(): Promise<Partial<AnalysisResult>> {
    const missingPeerDeps: MissingPeerDep[] = [];
    const allDeps = this.getAllDependencies();

    // Récupérer les infos de tous les packages en parallèle
    const packageInfos = await this.npmClient.getBulkPackageInfo(Object.keys(allDeps));

    // Process all packages in parallel with limited concurrency
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(5);

    const analysisPromises = Object.entries(allDeps).map(([depName, depVersion]) =>
      limit(async () => {
        const packageInfo = packageInfos[depName];
        if (!packageInfo) return [];

        try {
          // Essayer d'abord les peer dependencies du package-lock.json
          let lockFilePeerDeps = this.getPeerDependenciesFromLockFile(depName);
          
          // Si pas trouvé dans le lock file, fallback vers l'API npm
          if (!lockFilePeerDeps || Object.keys(lockFilePeerDeps).length === 0) {
            const installedVersion = this.getInstalledVersion(depName) || depVersion;
            const cleanVersion = this.cleanVersion(installedVersion);
            
            if (!cleanVersion) return [];

            const versionInfo = packageInfo.versions[cleanVersion];
            if (!versionInfo?.peerDependencies) return [];
            
            lockFilePeerDeps = versionInfo.peerDependencies;
          }

          // Si toujours pas de peer dependencies, rien à analyser
          if (!lockFilePeerDeps || Object.keys(lockFilePeerDeps).length === 0) {
            return [];
          }

          const peerDeps: MissingPeerDep[] = [];

          // Analyser chaque peer dependency
          for (const [peerName, peerVersion] of Object.entries(lockFilePeerDeps)) {
            // Only check Angular-related dependencies and critical build tools
            if (!this.isRelevantForMigration(peerName)) {
              continue;
            }
            
            // Vérifier si la peer dependency est satisfaite
            if (!this.isPeerDependencySatisfied(peerName, peerVersion, allDeps)) {
              peerDeps.push({
                package: peerName,
                requiredBy: depName,
                requiredVersion: peerVersion,
                severity: 'error',
              });
            }
          }

          return peerDeps;
        } catch (error) {
          console.warn(`Erreur lors de l'analyse de ${depName}: ${error.message}`);
          return [];
        }
      })
    );

    // Wait for all analyses to complete and flatten results
    const results = await Promise.all(analysisPromises);
    results.forEach(deps => missingPeerDeps.push(...deps));

    return { missingPeerDeps };
  }

  private getPeerDependenciesFromLockFile(packageName: string): Record<string, string> | null {
    if (!this.lockFile) return null;

    // Pour npm (lockfileVersion 2+)
    if ('packages' in this.lockFile && this.lockFile.packages) {
      const nodeModulesKey = `node_modules/${packageName}`;
      const packageInfo = this.lockFile.packages[nodeModulesKey];
      
      if (packageInfo && 'peerDependencies' in packageInfo && packageInfo.peerDependencies) {
        return packageInfo.peerDependencies;
      }
    }

    // Pour npm ancien format (lockfileVersion 1)
    if ('dependencies' in this.lockFile && this.lockFile.dependencies) {
      const dep = this.lockFile.dependencies[packageName];
      if (dep && dep.peerDependencies) {
        return dep.peerDependencies;
      }
    }

    return null;
  }

  private isPeerDependencySatisfied(
    peerName: string,
    requiredVersion: string,
    installedDeps: Record<string, string>
  ): boolean {
    // Utiliser la version réellement installée depuis le lock file
    const declaredVersion = installedDeps[peerName];
    
    if (!declaredVersion) {
      return false;
    }
    
    const installedVersion = this.getInstalledVersion(peerName) || declaredVersion;

    try {
      // Nettoyer la version installée (enlever ^, ~, etc.)
      const cleanInstalledVersion = semver.coerce(installedVersion)?.version;
      
      if (!cleanInstalledVersion) {
        return false;
      }

      return semver.satisfies(cleanInstalledVersion, requiredVersion);
    } catch (error) {
      return false;
    }
  }
  
  private isRelevantForMigration(packageName: string): boolean {
    // Angular packages
    if (packageName.startsWith('@angular/')) {
      return true;
    }
    
    // Critical runtime dependencies for Angular
    const criticalDependencies = [
      'zone.js',
      'rxjs',
      'tslib',
      'typescript'
    ];
    
    if (criticalDependencies.includes(packageName)) {
      return true;
    }
    
    // Ignore test runners, build tools, and other dev dependencies
    const ignoredPackages = [
      'jest',
      'jest-environment-jsdom',
      'protractor',
      'karma',
      'jasmine',
      'ng-packagr',
      'browser-sync',
      '@web/test-runner',
      'tailwindcss',
      'postcss',
      'autoprefixer',
      'webpack',
      'rollup',
      'vite',
      'eslint',
      'prettier',
      'husky',
      'lint-staged'
    ];
    
    return !ignoredPackages.includes(packageName);
  }
}