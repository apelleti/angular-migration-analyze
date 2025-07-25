import type { AnalysisResult, Recommendation, SecurityVulnerability, DeprecatedPackage, LicenseInfo } from '../types';

import { BaseAnalyzer } from './BaseAnalyzer';

export class SecurityAnalyzer extends BaseAnalyzer {
  async analyze(): Promise<Partial<AnalysisResult> & {
    vulnerabilities: SecurityVulnerability[];
    deprecatedPackages: DeprecatedPackage[];
    licenseIssues: LicenseInfo[];
  }> {
    const vulnerabilities: SecurityVulnerability[] = [];
    const deprecatedPackages: DeprecatedPackage[] = [];
    const licenseIssues: LicenseInfo[] = [];
    const recommendations: Recommendation[] = [];

    console.log('🔒 Analyse de sécurité via npm registry...');

    const allDeps = this.getAllDependencies();
    const packageInfos = await this.npmClient.getBulkPackageInfo(Object.keys(allDeps));

    // Analyser les vulnérabilités
    for (const [depName, depVersion] of Object.entries(allDeps)) {
      const packageInfo = packageInfos[depName];
      if (!packageInfo) continue;

      try {
        // Vérifier les vulnérabilités
        const packageVulns = await this.checkVulnerabilities(depName, depVersion);
        vulnerabilities.push(...packageVulns);

        // Vérifier les packages dépréciés
        const deprecation = await this.checkDeprecation(depName, depVersion, packageInfo);
        if (deprecation) {
          deprecatedPackages.push(deprecation);
        }

        // Vérifier les licences
        const licenseInfo = await this.checkLicense(depName, depVersion, packageInfo);
        if (licenseInfo && !licenseInfo.compatible) {
          licenseIssues.push(licenseInfo);
        }

      } catch (error) {
        console.warn(`Erreur lors de l'analyse de sécurité pour ${depName}:`, error.message);
      }
    }

    // Générer les recommandations de sécurité
    recommendations.push(...this.generateSecurityRecommendations(vulnerabilities, deprecatedPackages, licenseIssues));

    return { 
      vulnerabilities, 
      deprecatedPackages, 
      licenseIssues, 
      recommendations 
    };
  }

  private async checkVulnerabilities(packageName: string, version: string): Promise<SecurityVulnerability[]> {
    try {
      const auditResults = await this.npmClient.getPackageVulnerabilities(packageName, version);
      
      return auditResults.map((vuln: any) => ({
        package: packageName,
        version: version,
        severity: vuln.severity,
        title: vuln.title,
        description: vuln.overview,
        references: vuln.references || [],
        patchedVersions: vuln.patched_versions || '',
        vulnerableVersions: vuln.vulnerable_versions || '',
        cve: vuln.cves || []
      }));
    } catch (error) {
      return [];
    }
  }

  private async checkDeprecation(
    packageName: string, 
    version: string, 
    packageInfo: any
  ): Promise<DeprecatedPackage | null> {
    try {
      const versionInfo = await this.npmClient.getPackageVersion(packageName, version);
      if (!versionInfo) return null;

      if (versionInfo.deprecated) {
        return {
          name: packageName,
          version: version,
          deprecationMessage: versionInfo.deprecated,
          alternatives: this.suggestAlternatives(packageName),
          lastUpdate: packageInfo.time[version] || ''
        };
      }

      // Vérifier si le package n'a pas été mis à jour depuis longtemps
      const lastVersion = packageInfo['dist-tags'].latest;
      const lastUpdate = new Date(packageInfo.time[lastVersion]);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      if (lastUpdate < twoYearsAgo) {
        return {
          name: packageName,
          version: version,
          deprecationMessage: `Package non maintenu depuis ${lastUpdate.toLocaleDateString()}`,
          alternatives: this.suggestAlternatives(packageName),
          lastUpdate: lastUpdate.toISOString()
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async checkLicense(
    packageName: string, 
    version: string, 
    _packageInfo: any
  ): Promise<LicenseInfo | null> {
    try {
      const versionInfo = await this.npmClient.getPackageVersion(packageName, version);
      if (!versionInfo) return null;

      const license = versionInfo.license || 'UNKNOWN';
      const compatible = this.isLicenseCompatible(license);
      const concerns = this.getLicenseConcerns(license);

      return {
        package: packageName,
        version: version,
        license: license,
        compatible: compatible,
        concerns: concerns.length > 0 ? concerns : undefined
      };
    } catch (error) {
      return null;
    }
  }

  private isLicenseCompatible(license: string): boolean {
    const compatibleLicenses = [
      'MIT', 'ISC', 'BSD', 'BSD-2-Clause', 'BSD-3-Clause',
      'Apache-2.0', 'Apache 2.0', 'Unlicense', 'CC0-1.0'
    ];
    
    return compatibleLicenses.some(compat => 
      license.toUpperCase().includes(compat.toUpperCase())
    );
  }

  private getLicenseConcerns(license: string): string[] {
    const concerns: string[] = [];
    
    if (license.toUpperCase().includes('GPL')) {
      concerns.push('Licence copyleft - peut affecter la distribution');
    }
    
    if (license === 'UNKNOWN' || !license) {
      concerns.push('Licence inconnue - vérification manuelle requise');
    }
    
    if (license.toUpperCase().includes('COMMERCIAL')) {
      concerns.push('Licence commerciale - coûts potentiels');
    }
    
    return concerns;
  }

  private suggestAlternatives(packageName: string): string[] {
    const alternatives: Record<string, string[]> = {
      'request': ['axios', 'node-fetch', 'got'],
      'moment': ['date-fns', 'dayjs', 'luxon'],
      'lodash': ['ramda', 'utils natives ES6+'],
      'babel-polyfill': ['core-js', '@babel/preset-env'],
      'node-sass': ['sass', 'dart-sass'],
      'tslint': ['eslint + @typescript-eslint'],
      'protractor': ['cypress', 'playwright', 'webdriver-io']
    };
    
    return alternatives[packageName] || [];
  }

  private generateSecurityRecommendations(
    vulnerabilities: SecurityVulnerability[],
    deprecatedPackages: DeprecatedPackage[],
    licenseIssues: LicenseInfo[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Recommandations pour les vulnérabilités
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    const highVulns = vulnerabilities.filter(v => v.severity === 'high');

    if (criticalVulns.length > 0) {
      recommendations.push({
        type: 'error',
        category: 'security',
        message: `${criticalVulns.length} vulnérabilité(s) critique(s) détectée(s)`,
        action: 'Mettre à jour immédiatement les packages vulnérables',
        command: 'npm audit fix --force',
        priority: 'high'
      });
    }

    if (highVulns.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'security',
        message: `${highVulns.length} vulnérabilité(s) de sévérité élevée`,
        action: 'Planifier la mise à jour des packages',
        command: 'npm audit fix',
        priority: 'high'
      });
    }

    // Recommandations pour les packages dépréciés
    if (deprecatedPackages.length > 0) {
      deprecatedPackages.forEach(pkg => {
        recommendations.push({
          type: 'warning',
          category: 'security',
          message: `${pkg.name} est déprécié: ${pkg.deprecationMessage}`,
          package: pkg.name,
          action: pkg.alternatives ? `Remplacer par: ${pkg.alternatives.join(' ou ')}` : 'Chercher une alternative',
          priority: 'medium'
        });
      });
    }

    // Recommandations pour les licences
    if (licenseIssues.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'security',
        message: `${licenseIssues.length} package(s) avec des problèmes de licence`,
        action: 'Vérifier la compatibilité légale',
        priority: 'low'
      });
    }

    return recommendations;
  }
}