import * as fs from 'fs/promises';

import type { AnalysisResult } from '../types/index.js';

export class ReportGenerator {
  async generateJSON(results: AnalysisResult, filePath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: results.summary,
      ...results,
    };

    await fs.writeFile(filePath, JSON.stringify(report, null, 2));
  }

  async generateHTML(results: AnalysisResult, filePath: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Migration Angular</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #1976d2; color: white; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .error { border-left: 4px solid #f44336; background: #ffebee; }
        .warning { border-left: 4px solid #ff9800; background: #fff3e0; }
        .success { border-left: 4px solid #4caf50; background: #e8f5e9; }
        .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .table th, .table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background-color: #f5f5f5; }
        .command { background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Rapport de Migration Angular</h1>
        <p>Généré le: ${new Date().toLocaleString('fr-FR')}</p>
    </div>
    
    ${this.generateHTMLSummary(results)}
    ${this.generateHTMLMissingPeerDeps(results)}
    ${this.generateHTMLConflicts(results)}
    ${this.generateHTMLAngularPackages(results)}
    ${this.generateHTMLRecommendations(results)}
    ${this.generateHTMLMigrationPath(results)}
</body>
</html>`;

    await fs.writeFile(filePath, html);
  }

  private generateHTMLSummary(results: AnalysisResult): string {
    const summary = results.summary;
    return `
    <div class="section ${summary.criticalIssues > 0 ? 'error' : 'success'}">
        <h2>📈 Résumé</h2>
        <p><strong>Score de santé:</strong> ${summary.healthScore}/100</p>
        <p><strong>Problèmes critiques:</strong> ${summary.criticalIssues}</p>
        <p><strong>Total des problèmes:</strong> ${summary.totalIssues}</p>
        <p><strong>Packages Angular:</strong> ${summary.angularPackagesCount}</p>
        <p><strong>Recommandations:</strong> ${summary.recommendationsCount}</p>
    </div>`;
  }

  private generateHTMLMissingPeerDeps(results: AnalysisResult): string {
    if (results.missingPeerDeps.length === 0) return '';

    const rows = results.missingPeerDeps
      .map(
        dep => `
        <tr>
            <td>${dep.package}</td>
            <td>${dep.requiredBy}</td>
            <td>${dep.requiredVersion}</td>
            <td>${dep.optional ? '✅ Optionnel' : '❌ Requis'}</td>
        </tr>
    `
      )
      .join('');

    return `
    <div class="section error">
        <h2>❌ Peer Dependencies Manquantes</h2>
        <table class="table">
            <thead>
                <tr><th>Package</th><th>Requis par</th><th>Version</th><th>Type</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
  }

  private generateHTMLConflicts(results: AnalysisResult): string {
    if (results.conflicts.length === 0) return '';

    const conflictItems = results.conflicts
      .map(
        conflict => `
        <li>
            <strong>${conflict.package}</strong>
            <ul>
                ${conflict.versions
                  .map(
                    v => `
                    <li>${v.version} - requis par: ${v.requiredBy.join(', ')}</li>
                `
                  )
                  .join('')}
            </ul>
        </li>
    `
      )
      .join('');

    return `
    <div class="section warning">
        <h2>⚠️ Conflits de Versions</h2>
        <ul>${conflictItems}</ul>
    </div>`;
  }

  private generateHTMLAngularPackages(results: AnalysisResult): string {
    if (results.angularPackages.length === 0) return '';

    const rows = results.angularPackages
      .map(
        pkg => `
        <tr>
            <td>${pkg.name}</td>
            <td>${pkg.currentVersion}</td>
            <td>${pkg.targetVersion}</td>
            <td>${pkg.currentVersion === pkg.targetVersion ? '✅ À jour' : '🔄 Migration disponible'}</td>
        </tr>
    `
      )
      .join('');

    return `
    <div class="section">
        <h2>🅰️ Packages Angular</h2>
        <table class="table">
            <thead>
                <tr><th>Package</th><th>Version actuelle</th><th>Version cible</th><th>Status</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
  }

  private generateHTMLRecommendations(results: AnalysisResult): string {
    if (results.recommendations.length === 0) return '';

    const recommendations = results.recommendations
      .map(rec => {
        const icon = rec.type === 'error' ? '🚨' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
        const command = rec.command ? `<div class="command">${rec.command}</div>` : '';
        return `
        <div class="section ${rec.type}">
            <p>${icon} ${rec.message}</p>
            ${command}
        </div>
      `;
      })
      .join('');

    return `
    <div class="section">
        <h2>💡 Recommandations</h2>
        ${recommendations}
    </div>`;
  }

  private generateHTMLMigrationPath(results: AnalysisResult): string {
    if (results.migrationPath.length === 0) return '';

    const steps = results.migrationPath
      .map(
        step => `
        <div class="section">
            <h3>Étape ${step.order}: ${step.description}</h3>
            <p><strong>Commandes:</strong></p>
            ${step.commands.map(cmd => `<div class="command">${cmd}</div>`).join('')}
            ${step.validation ? `<p><strong>Validation:</strong> <code>${step.validation}</code></p>` : ''}
        </div>
    `
      )
      .join('');

    return `
    <div class="section">
        <h2>🗺️ Plan de Migration</h2>
        ${steps}
    </div>`;
  }
}
