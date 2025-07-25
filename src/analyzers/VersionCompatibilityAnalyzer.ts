import * as semver from 'semver';
import { BaseAnalyzer } from './BaseAnalyzer';
import { AnalysisResult, IncompatibleVersion, DependencyConflict } from '../types';
import { NpmPackageInfo } from '../utils/NpmRegistryClient';

export class VersionCompatibilityAnalyzer extends BaseAnalyzer {
  async analyze(): Promise<Partial<AnalysisResult>> {
    const incompatibleVersions: IncompatibleVersion[] = [];
    const conflicts: DependencyConflict[] = [];
    
    console.log('🔍 Analyse des compatibilités de versions via npm registry...');
    
    const allDeps = this.getAllDependencies();
    const packageInfos = await this.npmClient.getBulkPackageInfo(Object.keys(allDeps));
    
    // Créer une map des exigences de versions
    const versionRequirements = new Map<string, Array<{
      version: string;
      requiredBy: string;
      source: 'direct' | 'dependency' | 'peerDependency';
    }>>();

    // Analyser les dépendances directes
    for (const [depName, depVersion] of Object.entries(allDeps)) {
      versionRequirements.set(depName, [{
        version: depVersion,
        requiredBy: 'package.json',
        source: 'direct'
      }]);

      await this.collectTransitiveDependencies(depName, depVersion, versionRequirements);
    }

    // Identifier les conflits
    for (const [packageName, requirements] of versionRequirements.entries()) {
      if (requirements.length <= 1) continue;

      const resolvedVersions = new Set<string>();
      const versionGroups = new Map<string, string[]>();

      for (const req of requirements) {
        try {
          const packageInfo = await this.npmClient.getPackageInfo(packageName);
          if (!packageInfo) continue;

          const resolved = this.resolveVersionRange(req.version, packageInfo);
          if (resolved) {
            resolvedVersions.add(resolved);
            
            if (!versionGroups.has(resolved)) {
              versionGroups.set(resolved, []);
            }
            versionGroups.get(resolved)!.push(req.requiredBy);
          }
        } catch (error) {
          console.warn(`Erreur lors de la résolution de ${packageName}@${req.version}`);
        }
      }

      // Si plusieurs versions résolues, il y a conflit
      if (resolvedVersions.size > 1) {
        conflicts.push({
          package: packageName,
          versions: Array.from(versionGroups.entries()).map(([version, requiredBy]) => ({
            version,
            requiredBy
          })),
          severity: 'warning'
        });
      }
    }

    return { incompatibleVersions, conflicts };
  }

  private async collectTransitiveDependencies(
    packageName: string,
    version: string,
    versionRequirements: Map<string, Array<{version: string; requiredBy: string; source: string}>>
  ): Promise<void> {
    try {
      const versionInfo = await this.npmClient.getPackageVersion(packageName, version);
      if (!versionInfo) return;

      // Collecter les dépendances
      if (versionInfo.dependencies) {
        for (const [depName, depVersion] of Object.entries(versionInfo.dependencies)) {
          if (!versionRequirements.has(depName)) {
            versionRequirements.set(depName, []);
          }
          
          versionRequirements.get(depName)!.push({
            version: depVersion,
            requiredBy: packageName,
            source: 'dependency'
          });
        }
      }

      // Collecter les peer dependencies
      if (versionInfo.peerDependencies) {
        for (const [peerName, peerVersion] of Object.entries(versionInfo.peerDependencies)) {
          if (!versionRequirements.has(peerName)) {
            versionRequirements.set(peerName, []);
          }
          
          versionRequirements.get(peerName)!.push({
            version: peerVersion,
            requiredBy: packageName,
            source: 'peerDependency'
          });
        }
      }
    } catch (error) {
      console.warn(`Impossible d'analyser les dépendances transitives de ${packageName}@${version}`);
    }
  }

  private resolveVersionRange(range: string, packageInfo: NpmPackageInfo): string | null {
    const versions = Object.keys(packageInfo.versions).sort((a, b) => semver.rcompare(a, b));
    
    try {
      return versions.find(v => semver.satisfies(v, range)) || null;
    } catch (error) {
      return null;
    }
  }
}