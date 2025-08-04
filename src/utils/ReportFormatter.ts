import chalk from 'chalk';
import { AnalysisReport, DeprecatedPattern } from '../types/index.js';

export function formatAnalysisReport(report: AnalysisReport): string {
  const output: string[] = [];
  
  // Header
  output.push(chalk.bold.blue('\n📊 Angular Migration Analysis Report'));
  output.push(chalk.gray('='.repeat(50)));
  
  // Summary
  output.push(chalk.bold('\n📋 Summary'));
  output.push(`  Current Version: ${chalk.cyan(report.fromVersion)}`);
  output.push(`  Target Version: ${chalk.green(report.toVersion)}`);
  output.push(`  Files Impacted: ${chalk.yellow(report.summary.filesImpacted)}`);
  output.push(`  Breaking Changes: ${chalk.red(report.summary.breakingChanges)}`);
  output.push(`  Peer Dep Conflicts: ${chalk.yellow(report.summary.peerDepConflicts)}`);
  output.push(`  Estimated Effort: ${chalk.magenta(report.summary.estimatedEffort)}`);
  
  // Dependencies Analysis
  if (report.dependencies) {
    output.push(chalk.bold('\n🔗 Dependencies Analysis'));
    
    if (report.dependencies.incompatible.length > 0) {
      output.push(chalk.red('  ❌ Incompatible Dependencies:'));
      report.dependencies.incompatible.forEach(dep => {
        output.push(`    - ${dep.package}: ${dep.reason || 'needs update'}`);
      });
    }
    
    if (report.dependencies.deprecated.length > 0) {
      output.push(chalk.yellow('  ⚠️  Deprecated Dependencies:'));
      report.dependencies.deprecated.forEach(dep => {
        output.push(`    - ${dep.package}: ${dep.alternative || 'find alternative'}`);
      });
    }
  }
  
  // Peer Dependencies
  if (report.peerDependencies && report.peerDependencies.conflicts.length > 0) {
    output.push(chalk.bold('\n🔄 Peer Dependency Conflicts'));
    
    report.peerDependencies.conflicts.forEach(conflict => {
      output.push(chalk.red(`  ❌ ${conflict.package}`));
      output.push(`     Required: ${conflict.required}`);
      output.push(`     Installed: ${conflict.installed}`);
      if (conflict.resolution) {
        output.push(chalk.green(`     Resolution: ${conflict.resolution}`));
      }
    });
  }
  
  // Deprecated Patterns
  if (report.patterns && report.patterns.length > 0) {
    output.push(chalk.bold('\n🔍 Deprecated Patterns Found'));
    
    const groupedPatterns = groupPatternsByType(report.patterns);
    
    for (const [type, patterns] of Object.entries(groupedPatterns)) {
      const emoji = patterns[0].autoFixable ? '🔧' : '⚠️';
      const fixText = patterns[0].autoFixable ? chalk.green(' (auto-fixable)') : '';
      
      output.push(`  ${emoji} ${type}${fixText}: ${patterns.length} occurrences`);
      
      // Show first 3 files
      patterns.slice(0, 3).forEach(pattern => {
        output.push(chalk.gray(`     ${pattern.file}:${pattern.line}`));
      });
      
      if (patterns.length > 3) {
        output.push(chalk.gray(`     ... and ${patterns.length - 3} more`));
      }
    }
  }
  
  // Migration Plan
  if (report.migrationPlan) {
    output.push(chalk.bold('\n📝 Migration Plan'));
    
    report.migrationPlan.phases.forEach((phase, index) => {
      output.push(`  ${chalk.cyan(`Phase ${index + 1}: ${phase.name}`)} (${phase.duration})`);
      phase.tasks.forEach(task => {
        output.push(`    ✓ ${task}`);
      });
    });
    
    output.push(chalk.bold(`\n  Total Estimated Time: ${report.migrationPlan.totalEstimate}`));
  }
  
  // Recommendations
  output.push(chalk.bold('\n💡 Recommendations'));
  output.push('  1. Create a backup branch before starting migration');
  output.push('  2. Run automated fixes first with: ngma fix --auto-safe');
  output.push('  3. Address peer dependency conflicts before ng update');
  output.push('  4. Test thoroughly after each migration phase');
  
  output.push(chalk.gray('\n' + '=' . repeat(50)));
  
  return output.join('\n');
}

function groupPatternsByType(patterns: DeprecatedPattern[]): Record<string, DeprecatedPattern[]> {
  const grouped: Record<string, DeprecatedPattern[]> = {};
  
  for (const pattern of patterns) {
    if (!grouped[pattern.type]) {
      grouped[pattern.type] = [];
    }
    grouped[pattern.type].push(pattern);
  }
  
  return grouped;
}