import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { join } from 'path';
import { MigrationAnalyzer } from '../../MigrationAnalyzerSimple.js';
import { formatAnalysisReport } from '../../utils/ReportFormatter.js';

export const scanCommand = new Command('scan')
  .description('Analyze project for Angular migration issues')
  .option('-p, --project <path>', 'Path to Angular project', '.')
  .option('-f, --from <version>', 'Current Angular version')
  .option('-t, --to <version>', 'Target Angular version')
  .option('-o, --output <file>', 'Output report to file')
  .option('--json', 'Output in JSON format')
  .option('--export-plan', 'Export migration plan as markdown')
  .option('--export-summary', 'Export migration summary as markdown')
  .action(async (options) => {
    const spinner = ora('Analyzing project...').start();
    
    try {
      const analyzer = new MigrationAnalyzer({
        projectPath: options.project,
        fromVersion: options.from,
        toVersion: options.to
      });
      
      // Step 1: Detect Angular version if not provided
      if (!options.from) {
        spinner.text = 'Detecting Angular version...';
        const version = await analyzer.detectAngularVersion();
        console.log(chalk.blue(`\nDetected Angular version: ${version}`));
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
      
      // Step 5: Analyze peer dependencies
      spinner.text = 'Checking peer dependencies...';
      const peerDeps = await analyzer.analyzePeerDependencies();
      
      spinner.succeed('Analysis complete!');
      
      // Generate report
      const report = {
        projectPath: options.project,
        fromVersion: analyzer.fromVersion,
        toVersion: analyzer.toVersion,
        summary: {
          filesImpacted: patterns.length,
          breakingChanges: analyzer.breakingChanges.length,
          peerDepConflicts: peerDeps.conflicts.length,
          estimatedEffort: analyzer.estimateEffort(patterns, peerDeps)
        },
        dependencies: depAnalysis,
        patterns: patterns,
        peerDependencies: peerDeps,
        migrationPlan: analyzer.generateMigrationPlan()
      };
      
      // Output report
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatAnalysisReport(report));
      }
      
      // Save outputs to .ngma folder
      const outputDir = join(options.project, '.ngma');
      
      try {
        // Always save JSON report
        await analyzer.saveReport(report, 'analysis-report.json');
        console.log(chalk.green(`\nReport saved to: ${outputDir}/analysis-report.json`));
      } catch (error) {
        console.error(chalk.red(`Failed to save analysis report: ${error.message}`));
      }
      
      // Export migration plan if requested
      if (options.exportPlan) {
        try {
          await analyzer.exportMigrationPlan(report.migrationPlan, 'migration-plan.md');
          console.log(chalk.green(`Migration plan saved to: ${outputDir}/migration-plan.md`));
        } catch (error) {
          console.error(chalk.red(`Failed to save migration plan: ${error.message}`));
        }
      }
      
      // Export summary if requested
      if (options.exportSummary) {
        try {
          await analyzer.exportMigrationSummary(report, 'migration-summary.md');
          console.log(chalk.green(`Migration summary saved to: ${outputDir}/migration-summary.md`));
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
      
    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });