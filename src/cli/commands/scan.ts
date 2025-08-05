import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { join, basename } from 'path';
import * as path from 'path';
import { MigrationAnalyzer } from '../../MigrationAnalyzerSimple.js';
import { formatAnalysisReport } from '../../utils/ReportFormatter.js';

export const scanCommand = new Command('scan')
  .description('Analyze project for Angular migration issues')
  .option('-p, --project <path>', 'Path to Angular project', '.')
  .option('-o, --output <file>', 'Output report to file')
  .option('--json', 'Output in JSON format')
  .option('--export-summary', 'Export migration summary as markdown')
  .option('--ci', 'CI mode: fail with exit code 1 if critical issues found')
  .option('--quiet', 'Suppress console output except errors')
  .option('--threshold <level>', 'Exit code threshold: critical, high, medium, low', 'critical')
  .action(async (options) => {
    const spinner = ora('Analyzing project...').start();
    
    try {
      const analyzer = new MigrationAnalyzer({
        projectPath: options.project
      });
      
      // Step 1: Detect Angular version
      spinner.text = 'Detecting Angular version...';
      const detectedVersion = await analyzer.detectAngularVersion();
      
      if (!options.quiet) {
        console.log(chalk.blue(`\nDetected Angular version: ${detectedVersion}`));
        console.log(chalk.yellow(`Migration target: Angular ${analyzer.toVersion} (n+1)`));
      }
      
      // Step 2: Download breaking changes
      spinner.text = 'Fetching breaking changes...';
      await analyzer.fetchBreakingChanges();
      
      // Step 3: Analyze dependencies
      spinner.text = 'Analyzing dependencies...';
      const depAnalysis = await analyzer.analyzeDependencies();
      
      // Step 4: Scan for deprecated patterns
      spinner.text = 'Scanning for deprecated patterns...';
      const patterns = await analyzer.scanPatterns();
      
      // Make file paths relative for consistency
      patterns.forEach(pattern => {
        if (pattern.file.startsWith('/')) {
          pattern.file = pattern.file.replace(process.cwd() + '/', '');
        }
      });
      
      // Step 5: Analyze peer dependencies
      spinner.text = 'Checking peer dependencies...';
      const peerDeps = await analyzer.analyzePeerDependencies();
      
      if (!options.quiet) {
        spinner.succeed('Analysis complete!');
      } else {
        spinner.stop();
      }
      
      // Generate report with consistent project name
      const projectName = options.project === '.' || options.project === './' 
        ? path.basename(process.cwd())
        : path.basename(options.project);
        
      const report = {
        projectPath: projectName,
        fromVersion: analyzer.fromVersion,
        toVersion: analyzer.toVersion,
        summary: {
          filesImpacted: patterns.length,
          breakingChanges: analyzer.breakingChanges.length,
          peerDepConflicts: peerDeps.conflicts.length
        },
        dependencies: depAnalysis,
        patterns: patterns,
        peerDependencies: peerDeps,
        breakingChanges: analyzer.breakingChanges
      };
      
      // Output report
      if (!options.quiet) {
        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(formatAnalysisReport(report));
        }
      }
      
      // Save outputs to .ngma folder
      const outputDir = join(options.project, '.ngma');
      
      try {
        // Always save JSON report
        await analyzer.saveReport(report, 'analysis-report.json');
        if (!options.quiet) {
          console.log(chalk.green(`\nReport saved to: ${outputDir}/analysis-report.json`));
        }
      } catch (error) {
        console.error(chalk.red(`Failed to save analysis report: ${error.message}`));
      }
      
      
      // Export summary if requested
      if (options.exportSummary) {
        try {
          await analyzer.exportMigrationSummary(report, 'analysis-summary.md');
          console.log(chalk.green(`Migration summary saved to: ${outputDir}/analysis-summary.md`));
        } catch (error) {
          console.error(chalk.red(`Failed to save migration summary: ${error.message}`));
        }
      }
      
      // Save to custom file if specified
      if (options.output) {
        try {
          await analyzer.saveReport(report, options.output);
          console.log(chalk.green(`Custom report saved to: ${outputDir}/${options.output}`));
        } catch (error) {
          console.error(chalk.red(`Failed to save custom report: ${error.message}`));
        }
      }
      
      // CI mode: exit with error code if issues found
      if (options.ci) {
        const thresholdPriority = options.threshold.toLowerCase();
        const hasIssuesAboveThreshold = report.patterns.some(p => {
          const severityMap = { error: 'critical', warning: 'high', info: 'medium' };
          const patternPriority = severityMap[p.severity] || 'low';
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[patternPriority] <= priorityOrder[thresholdPriority];
        }) || (report.peerDependencies?.conflicts?.length > 0 && thresholdPriority !== 'low');
        
        if (hasIssuesAboveThreshold) {
          if (!options.quiet) {
            console.error(chalk.red(`\n✗ Migration issues found above ${thresholdPriority} threshold`));
          }
          process.exit(1);
        } else {
          if (!options.quiet) {
            console.log(chalk.green(`\n✓ No ${thresholdPriority} or higher issues found`));
          }
          process.exit(0);
        }
      }
      
    } catch (error) {
      if (!options.quiet) {
        spinner.fail('Analysis failed');
      } else {
        spinner.stop();
      }
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });