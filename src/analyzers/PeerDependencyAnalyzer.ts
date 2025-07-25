import * as semver from 'semver';

import type { AnalysisResult, MissingPeerDep } from '../types';

import { BaseAnalyzer } from './BaseAnalyzer';

export class PeerDependencyAnalyzer extends BaseAnalyzer {
  async analyze(): Promise<Partial<AnalysisResult>> {
    const missingPeerDeps: MissingPeerDep[] = [];
    const allDeps = this.getAllDependencies();

    console.log('🔍 Analyse des peer dependencies via npm registry...');

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
          // Résoudre la version spécifique installée
          const versionInfo = await this.npmClient.getPackageVersion(depName, depVersion);
          if (!versionInfo?.peerDependencies) return [];

          const peerDeps: MissingPeerDep[] = [];

          // Analyser chaque peer dependency
          for (const [peerName, peerVersion] of Object.entries(versionInfo.peerDependencies)) {
            const isOptional = versionInfo.peerDependenciesMeta?.[peerName]?.optional || false;

            // Vérifier si la peer dependency est satisfaite
            if (!this.isPeerDependencySatisfied(peerName, peerVersion, allDeps)) {
              peerDeps.push({
                package: peerName,
                requiredBy: depName,
                requiredVersion: peerVersion,
                optional: isOptional,
                severity: isOptional ? 'warning' : 'error',
              });
            }
          }

          return peerDeps;
        } catch (error) {
          console.warn(`Erreur lors de l'analyse de ${depName}:`, error.message);
          return [];
        }
      })
    );

    // Wait for all analyses to complete and flatten results
    const results = await Promise.all(analysisPromises);
    results.forEach(deps => missingPeerDeps.push(...deps));

    return { missingPeerDeps };
  }

  private isPeerDependencySatisfied(
    peerName: string,
    requiredVersion: string,
    installedDeps: Record<string, string>
  ): boolean {
    const installedVersion = installedDeps[peerName];
    if (!installedVersion) return false;

    try {
      // Nettoyer la version installée (enlever ^, ~, etc.)
      const cleanInstalledVersion = semver.coerce(installedVersion)?.version;
      if (!cleanInstalledVersion) return false;

      return semver.satisfies(cleanInstalledVersion, requiredVersion);
    } catch (error) {
      return false;
    }
  }
}
