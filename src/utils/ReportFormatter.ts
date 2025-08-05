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
    
    // Separate incompatible packages from other conflicts
    const incompatiblePackages = report.peerDependencies.conflicts.filter(c => 
      c.resolution?.includes('is incompatible')
    );
    const otherConflicts = report.peerDependencies.conflicts.filter(c => 
      !c.resolution?.includes('is incompatible')
    );
    
    // Show incompatible packages first with warning
    if (incompatiblePackages.length > 0) {
      output.push(chalk.bgRed.white('\n  ⚠️  INCOMPATIBLE PACKAGES - Must be resolved before migration:'));
      
      // Group by the package causing the incompatibility
      const packageGroups = new Map<string, typeof incompatiblePackages>();
      incompatiblePackages.forEach(conflict => {
        const match = conflict.resolution?.match(/(\S+) is incompatible/);
        if (match) {
          const pkg = match[1];
          if (!packageGroups.has(pkg)) {
            packageGroups.set(pkg, []);
          }
          packageGroups.get(pkg)!.push(conflict);
        }
      });
      
      packageGroups.forEach((conflicts, pkg) => {
        output.push(chalk.yellow(`\n  📦 ${pkg}`));
        output.push(chalk.gray(`     Requires Angular ${conflicts[0].required.replace('^', '')} but you have Angular ${report.fromVersion}`));
        if (pkg === '@angular/flex-layout') {
          output.push(chalk.cyan(`     → Replace with @angular/cdk/layout`));
          output.push(chalk.gray(`     → See: https://github.com/angular/flex-layout/wiki/Using-Angular-CDK-Layout`));
        } else {
          output.push(chalk.cyan(`     → Update to a compatible version or remove`));
        }
      });
      
      if (otherConflicts.length > 0) {
        output.push(chalk.bold('\n  Other conflicts:'));
      }
    }
    
    // Show other conflicts
    otherConflicts.forEach(conflict => {
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
      output.push(`  ⚠️ ${type}: ${patterns.length} occurrences`);
      
      // Show first 3 files
      patterns.slice(0, 3).forEach(pattern => {
        output.push(chalk.gray(`     ${pattern.file}:${pattern.line}`));
      });
      
      if (patterns.length > 3) {
        output.push(chalk.gray(`     ... and ${patterns.length - 3} more`));
      }
    }
  }
  
  // Recommendations
  output.push(chalk.bold('\n💡 Recommendations'));
  output.push('  1. Create a backup branch before starting migration');
  output.push('  2. Address peer dependency conflicts before ng update');
  output.push('  3. Update to latest minor version first if jumping multiple majors');
  output.push('  4. Test thoroughly after migration');
  
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