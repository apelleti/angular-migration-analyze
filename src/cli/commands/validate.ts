import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { MigrationAnalyzer } from '../../MigrationAnalyzerSimple.js';
import { ValidationResult } from '../../types/index.js';

export const validateCommand = new Command('validate')
  .description('Validate project after migration')
  .option('-p, --project <path>', 'Path to Angular project', '.')
  .option('--strict', 'Enable strict validation')
  .action(async (options) => {
    const spinner = ora('Running validation...').start();
    
    try {
      const analyzer = new MigrationAnalyzer({
        projectPath: options.project
      });
      
      interface ValidationCheck {
        name: string;
        check: () => Promise<ValidationResult>;
      }
      
      const validationChecks: ValidationCheck[] = [
        {
          name: 'Detecting deprecated APIs',
          check: () => analyzer.checkDeprecatedAPIs()
        },
        {
          name: 'Verifying peer dependencies',
          check: () => analyzer.validatePeerDependencies()
        },
        {
          name: 'Checking TypeScript configuration',
          check: () => analyzer.validateTypeScriptConfig()
        },
        {
          name: 'Scanning for legacy patterns',
          check: () => analyzer.checkLegacyPatterns()
        }
      ];
      
      interface CheckResult extends ValidationResult {
        checkName: string;
      }
      
      const results: CheckResult[] = [];
      
      for (const validation of validationChecks) {
        spinner.text = validation.name;
        try {
          const result = await validation.check();
          results.push({
            checkName: validation.name,
            passed: result.passed,
            issues: result.issues || []
          });
        } catch (error) {
          results.push({
            checkName: validation.name,
            passed: false,
            issues: [(error as Error).message]
          });
        }
      }
      
      spinner.stop();
      
      // Display results
      console.log(chalk.bold('\nValidation Results:\n'));
      
      let allPassed = true;
      results.forEach(result => {
        if (result.passed) {
          console.log(chalk.green(`✅ ${result.checkName}`));
        } else {
          allPassed = false;
          console.log(chalk.red(`❌ ${result.checkName}`));
          result.issues.forEach(issue => {
            console.log(chalk.gray(`   - ${issue}`));
          });
        }
      });
      
      // Summary
      console.log('\n' + chalk.bold('Summary:'));
      if (allPassed) {
        console.log(chalk.green('✨ All validation checks passed!'));
        console.log(chalk.gray('Your project is ready for Angular migration.'));
      } else {
        const failedCount = results.filter(r => !r.passed).length;
        console.log(chalk.yellow(`⚠️  ${failedCount} validation checks failed`));
        
        if (!options.strict) {
          console.log(chalk.gray('Some issues can be fixed after migration.'));
        } else {
          console.log(chalk.red('Fix these issues before proceeding.'));
          process.exit(1);
        }
      }
      
    } catch (error) {
      spinner.fail('Validation failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });