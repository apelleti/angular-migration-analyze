import type {
  AnalysisResult,
  BundleAnalysis,
  DuplicatedDependency,
  OptimizationSuggestion,
} from '../types';

import { BaseAnalyzer } from './BaseAnalyzer';

export class PerformanceAnalyzer extends BaseAnalyzer {
  async analyze(): Promise<
    Partial<AnalysisResult> & {
      bundleAnalysis: BundleAnalysis;
      duplicatedDependencies: DuplicatedDependency[];
      optimizationSuggestions: OptimizationSuggestion[];
    }
  > {
    console.log('⚡ Analyse de performance...');

    const bundleAnalysis = await this.analyzeBundleSize();
    const duplicatedDependencies = await this.findDuplicatedDependencies();
    const optimizationSuggestions = this.generateOptimizationSuggestions(
      bundleAnalysis,
      duplicatedDependencies
    );

    return {
      bundleAnalysis,
      duplicatedDependencies,
      optimizationSuggestions,
      recommendations: optimizationSuggestions.map(opt => ({
        type: 'info' as const,
        category: 'performance' as const,
        message: opt.description,
        action: opt.action,
        command: opt.command,
        priority:
          opt.impact === 'high' ? 'high' : opt.impact === 'medium' ? 'medium' : ('low' as const),
      })),
    };
  }

  private async analyzeBundleSize(): Promise<BundleAnalysis> {
    const allDeps = this.getAllDependencies();
    let totalSize = 0;
    const packageSizes: Array<{ name: string; size: number }> = [];

    for (const [packageName, version] of Object.entries(allDeps)) {
      try {
        const size = await this.estimatePackageSize(packageName, version);
        packageSizes.push({ name: packageName, size });
        totalSize += size;
      } catch (error) {
        // Taille inconnue
      }
    }

    return {
      totalSize,
      packageSizes: packageSizes.sort((a, b) => b.size - a.size),
      largestPackages: packageSizes.slice(0, 10),
      estimatedBundleSize: Math.round(totalSize * 0.3), // Approximation après minification/tree-shaking
    };
  }

  private async estimatePackageSize(packageName: string, version: string): Promise<number> {
    try {
      const packageInfo = await this.npmClient.getPackageInfo(packageName);
      if (!packageInfo) return 0;

      const versionInfo = await this.npmClient.getPackageVersion(packageName, version);
      if (!versionInfo?.dist) return 0;

      // Estimation basée sur la taille du tarball (approximation)
      // En réalité, il faudrait télécharger et analyser le package
      return Math.round(Math.random() * 500000); // Simulation - remplacer par une vraie analyse
    } catch (error) {
      return 0;
    }
  }

  private async findDuplicatedDependencies(): Promise<DuplicatedDependency[]> {
    const duplicates: DuplicatedDependency[] = [];

    // Analyser le lock file pour trouver les duplicatas
    if (this.lockFile && 'dependencies' in this.lockFile && this.lockFile.dependencies) {
      const packageVersions = new Map<string, Set<string>>();

      this.collectPackageVersions(this.lockFile.dependencies, packageVersions);

      for (const [packageName, versions] of packageVersions.entries()) {
        if (versions.size > 1) {
          duplicates.push({
            package: packageName,
            versions: Array.from(versions),
            estimatedWaste: await this.estimatePackageSize(packageName, Array.from(versions)[0]),
          });
        }
      }
    }

    return duplicates;
  }

  private collectPackageVersions(
    dependencies: any,
    packageVersions: Map<string, Set<string>>
  ): void {
    for (const [packageName, info] of Object.entries(dependencies)) {
      if (typeof info === 'object' && info && 'version' in info) {
        if (!packageVersions.has(packageName)) {
          packageVersions.set(packageName, new Set());
        }
        packageVersions.get(packageName).add((info as any).version);

        // Récursion pour les sous-dépendances
        if ((info as any).dependencies) {
          this.collectPackageVersions((info as any).dependencies, packageVersions);
        }
      }
    }
  }

  private generateOptimizationSuggestions(
    bundleAnalysis: BundleAnalysis,
    duplicates: DuplicatedDependency[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Suggestion pour les gros packages
    const largePackages = bundleAnalysis.largestPackages.filter(p => p.size > 100000);
    if (largePackages.length > 0) {
      suggestions.push({
        type: 'bundle-size',
        description: `Packages volumineux détectés: ${largePackages.map(p => p.name).join(', ')}`,
        action: 'Considérer le lazy loading ou des alternatives plus légères',
        impact: 'high',
        estimatedSavings: '20-40% de la taille du bundle',
      });
    }

    // Suggestions pour les duplicatas
    if (duplicates.length > 0) {
      const totalWaste = duplicates.reduce((sum, dup) => sum + dup.estimatedWaste, 0);
      suggestions.push({
        type: 'duplicates',
        description: `${duplicates.length} packages dupliqués détectés`,
        action: 'Résoudre les conflits de versions',
        command: 'npm dedupe',
        impact: 'medium',
        estimatedSavings: `~${Math.round(totalWaste / 1000)}KB`,
      });
    }

    // Suggestions générales
    suggestions.push({
      type: 'tree-shaking',
      description: "Optimiser l'importation des modules",
      action: 'Utiliser des imports spécifiques plutôt que des imports globaux',
      impact: 'medium',
      estimatedSavings: '10-30% de la taille du bundle',
    });

    return suggestions;
  }
}
