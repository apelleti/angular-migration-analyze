import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync } from 'fs';
import { MigrationAnalyzer } from '../../MigrationAnalyzerSimple.js';
import { AutoFixer } from '../../utils/AutoFixer.js';

export const fixCommand = new Command('fix')
  .description('Apply automatic fixes for migration issues')
  .option('-p, --project <path>', 'Path to Angular project', '.')
  .option('-r, --report <file>', 'Path to scan report file')
  .option('--dry-run', 'Preview changes without applying them')
  .option('--auto-safe', 'Only apply safe automatic fixes')
  .action(async (options) => {
    const spinner = ora('Loading analysis report...').start();
    
    try {
      let report;
      
      // Load report from file or run scan
      if (options.report) {
        report = JSON.parse(readFileSync(options.report, 'utf-8'));
      } else {
        spinner.text = 'Running analysis...';
        const analyzer = new MigrationAnalyzer({
          projectPath: options.project
        });
        await analyzer.detectAngularVersion();
        await analyzer.fetchBreakingChanges();
        const patterns = await analyzer.scanPatterns();
        report = {
          patterns: patterns,
          projectPath: options.project
        };
      }
      
      spinner.text = 'Preparing fixes...';
      const fixer = new AutoFixer(report);
      const fixes = fixer.prepareFixes(options.autoSafe);
      
      if (fixes.length === 0) {
        spinner.info('No automatic fixes available');
        return;
      }
      
      spinner.succeed(`Found ${fixes.length} automatic fixes`);
      
      // Show fix preview
      console.log(chalk.blue('\nFixes to apply:'));
      fixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. ${fix.description}`);
        console.log(`     Files: ${fix.files.length}`);
      });
      
      if (options.dryRun) {
        console.log(chalk.yellow('\n[DRY RUN] No changes were made'));
        return;
      }
      
      // Apply fixes
      const applySpinner = ora('Applying fixes...').start();
      const results = await fixer.applyFixes(fixes);
      
      applySpinner.succeed('Fixes applied successfully');
      
      // Show results
      console.log(chalk.green(`\n✓ ${results.success} fixes applied`));
      if (results.failed > 0) {
        console.log(chalk.red(`✗ ${results.failed} fixes failed`));
      }
      
      // Save fix log
      try {
        await fixer.saveFixLog(results);
        console.log(chalk.gray('\nFix log saved to: .ngma/fix-log.json'));
      } catch (error) {
        console.error(chalk.red(`Failed to save fix log: ${error.message}`));
      }
      
    } catch (error) {
      spinner.fail('Fix operation failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });