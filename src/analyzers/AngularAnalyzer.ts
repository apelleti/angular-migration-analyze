import * as semver from 'semver';

import type { AnalysisResult, AngularPackageInfo, Recommendation, MigrationStep } from '../types/index.js';

import { BaseAnalyzer } from './BaseAnalyzer.js';

export class AngularAnalyzer extends BaseAnalyzer {
  private readonly ANGULAR_COMPATIBILITY_MATRIX = {
    '20': { node: '>=18.19.1 || >=20.11.1 || >=22.0.0', typescript: '>=5.6.0 <5.8.0' },
    '19': { node: '>=18.19.1 || >=20.11.1 || >=22.0.0', typescript: '>=5.5.0 <5.7.0' },
    '18': { node: '>=18.19.1', typescript: '>=5.4.0 <5.6.0' },
    '17': { node: '>=18.13.0', typescript: '>=5.2.0 <5.5.0' },
    '16': { node: '>=16.14.0', typescript: '>=4.9.3 <5.2.0' },
    '15': { node: '>=14.20.0', typescript: '>=4.7.2 <4.9.0' },
  };

  async analyze(): Promise<Partial<AnalysisResult>> {
    const angularPackages: AngularPackageInfo[] = [];
    const recommendations: Recommendation[] = [];
    const migrationPath: MigrationStep[] = [];

    console.log('🔍 Analyse des packages Angular via npm registry...');

    const allDeps = this.getAllDependencies();
    const angularDeps = Object.entries(allDeps).filter(([name]) => this.isAngularPackage(name));

    // Récupérer la matrice de compatibilité Angular et toutes les infos de packages en parallèle
    const [compatibilityMatrix, packageInfos] = await Promise.all([
      this.npmClient.getAngularCompatibilityMatrix(),
      this.npmClient.getBulkPackageInfo(angularDeps.map(([name]) => name)),
    ]);

    // Traiter tous les packages Angular en parallèle
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(5);

    const analysisPromises = angularDeps.map(([depName, depVersion]) =>
      limit(async () => {
        try {
          const currentVersion = semver.coerce(depVersion)?.version;
          if (!currentVersion) return null;

          const packageInfo = packageInfos[depName];
          if (!packageInfo) return null;

          const latestVersion = packageInfo['dist-tags']?.latest;
          if (!latestVersion) return null;

          const targetVersion = this.calculateTargetVersion(currentVersion, latestVersion);

          const packageData: AngularPackageInfo = {
            name: depName,
            currentVersion,
            latestVersion,
            targetVersion,
            migrationGuide: this.getMigrationGuide(depName, semver.major(currentVersion)),
            hasBreakingChanges: semver.major(targetVersion) > semver.major(currentVersion),
            migrationComplexity: this.calculateMigrationComplexity(currentVersion, targetVersion),
          };

          // Vérifier la compatibilité avec Node.js et TypeScript
          const compatRecs = await this.checkCompatibility(depName, currentVersion);

          return { packageData, recommendations: compatRecs };
        } catch (error) {
          console.warn(`Erreur lors de l'analyse de ${depName}:`, (error as Error).message);
          return null;
        }
      })
    );

    // Attendre tous les résultats et filtrer les nulls
    const results = await Promise.all(analysisPromises);

    results.forEach(result => {
      if (result) {
        angularPackages.push(result.packageData);
        recommendations.push(...result.recommendations);
      }
    });

    // Générer les recommandations supplémentaires
    recommendations.push(
      ...this.generateAdvancedRecommendations(angularPackages, compatibilityMatrix)
    );

    // Générer le chemin de migration
    migrationPath.push(...(await this.generateDetailedMigrationPath(angularPackages)));

    return { angularPackages, recommendations, migrationPath };
  }

  private calculateTargetVersion(current: string, latest: string): string {
    const currentMajor = semver.major(current);
    const latestMajor = semver.major(latest);

    // Migration progressive par version majeure
    if (currentMajor < latestMajor) {
      return `${currentMajor + 1}.0.0`;
    }

    return latest;
  }

  private calculateMigrationComplexity(current: string, target: string): 'low' | 'medium' | 'high' {
    const currentMajor = semver.major(current);
    const targetMajor = semver.major(target);
    const majorDiff = targetMajor - currentMajor;

    if (majorDiff === 0) return 'low';
    if (majorDiff === 1) return 'medium';
    return 'high';
  }

  private async checkCompatibility(
    packageName: string,
    version: string
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    try {
      const versionInfo = await this.npmClient.getPackageVersion(packageName, version);
      if (!versionInfo) return recommendations;

      // Vérifier Node.js
      if (versionInfo.engines?.node) {
        const currentNodeVersion = process.version;
        if (!semver.satisfies(currentNodeVersion, versionInfo.engines.node)) {
          recommendations.push({
            type: 'warning',
            category: 'compatibility',
            message: `${packageName}@${version} nécessite Node.js ${versionInfo.engines.node}, vous avez ${currentNodeVersion}`,
            package: packageName,
            action: 'Mettre à jour Node.js',
            priority: 'high',
          });
        }
      }

      // Vérifier TypeScript
      const typeScriptDep = versionInfo.peerDependencies?.typescript;
      if (typeScriptDep) {
        const installedTS = this.getAllDependencies().typescript;
        if (installedTS) {
          const tsVersion = semver.coerce(installedTS)?.version;
          if (tsVersion && !semver.satisfies(tsVersion, typeScriptDep)) {
            recommendations.push({
              type: 'error',
              category: 'compatibility',
              message: `${packageName}@${version} nécessite TypeScript ${typeScriptDep}, vous avez ${tsVersion}`,
              package: packageName,
              action: 'Mettre à jour TypeScript',
              command: `npm install typescript@"${typeScriptDep}"`,
              priority: 'high',
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Impossible de vérifier la compatibilité pour ${packageName}@${version}`);
    }
    return recommendations;
  }

  private generateAdvancedRecommendations(
    packages: AngularPackageInfo[],
    compatibilityMatrix: Record<string, { node?: string; typescript?: string }>
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Vérifier l'alignement des versions
    const corePackage = packages.find(p => p.name === '@angular/core');
    if (!corePackage) return recommendations;

    const coreMajor = semver.major(corePackage.currentVersion);
    const mismatchedPackages = packages.filter(
      p => p.name !== '@angular/core' && semver.major(p.currentVersion) !== coreMajor
    );

    if (mismatchedPackages.length > 0) {
      recommendations.push({
        type: 'error',
        category: 'migration',
        message: `Versions Angular non alignées: ${mismatchedPackages.map(p => p.name).join(', ')}`,
        action: 'Aligner toutes les versions Angular',
        command: `ng update @angular/core@${corePackage.targetVersion}`,
        priority: 'high',
      });
    }

    // Vérifications basées sur la matrice de compatibilité
    const coreCompatibility = compatibilityMatrix[coreMajor];
    if (coreCompatibility) {
      if (coreCompatibility.node && !semver.satisfies(process.version, coreCompatibility.node)) {
        recommendations.push({
          type: 'warning',
          category: 'compatibility',
          message: `Angular ${coreMajor} nécessite Node.js ${coreCompatibility.node}`,
          action: 'Mettre à jour Node.js',
          priority: 'high',
        });
      }
    }

    return recommendations;
  }

  private async generateDetailedMigrationPath(
    packages: AngularPackageInfo[]
  ): Promise<MigrationStep[]> {
    const steps: MigrationStep[] = [];

    const corePackage = packages.find(p => p.name === '@angular/core');
    if (!corePackage) return steps;

    const currentMajor = semver.major(corePackage.currentVersion);
    const targetMajor = semver.major(corePackage.targetVersion);

    if (currentMajor >= targetMajor) return steps;

    // Étape de préparation
    steps.push({
      order: 0,
      description: 'Préparation de la migration',
      commands: [
        'npm audit fix --force',
        'npm run lint -- --fix',
        'npm run test',
        'git add . && git commit -m "Pre-migration snapshot"',
      ],
      validation: 'npm run build',
      estimatedDuration: '5-10 minutes',
    });

    // Migration version par version
    for (let version = currentMajor; version < targetMajor; version++) {
      const nextVersion = version + 1;

      steps.push({
        order: steps.length + 1,
        description: `Migration vers Angular ${nextVersion}`,
        commands: [
          `ng update @angular/cli@${nextVersion} @angular/core@${nextVersion}`,
          'npm run build',
          'npm run test',
        ],
        validation: 'ng version',
        estimatedDuration: '10-20 minutes',
        prerequisites: [`Angular ${version} fonctionnel`],
      });

      // Étapes spécifiques par version
      const specificSteps = this.getVersionSpecificSteps(nextVersion);
      steps.push(...specificSteps);
    }

    return steps;
  }

  private getVersionSpecificSteps(targetVersion: number): MigrationStep[] {
    const steps: MigrationStep[] = [];

    // Étapes spécifiques selon la version cible
    switch (targetVersion) {
      case 17:
        steps.push({
          order: 100,
          description: 'Migration vers les Standalone Components (optionnel)',
          commands: ['ng generate @angular/core:standalone', 'npm run build'],
          estimatedDuration: '30-60 minutes',
        });
        break;

      case 18:
        steps.push({
          order: 100,
          description: 'Migration vers les nouveaux Control Flow (@if, @for)',
          commands: ['ng generate @angular/core:control-flow', 'npm run build'],
          estimatedDuration: '20-40 minutes',
        });
        break;
    }

    return steps;
  }

  private getMigrationGuide(packageName: string, majorVersion: number): string {
    const baseUrl = 'https://update.angular.io/guide';
    const nextVersion = majorVersion + 1;

    return `${baseUrl}?v=${majorVersion}.0-${nextVersion}.0`;
  }
}
