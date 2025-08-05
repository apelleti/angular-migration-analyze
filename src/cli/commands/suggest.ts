import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync } from 'fs';
import { MigrationAnalyzer } from '../../MigrationAnalyzerSimple.js';
import { SuggestionEngine } from '../../utils/SuggestionEngine.js';

export const suggestCommand = new Command('suggest')
  .description('Suggest migration fixes and improvements without modifying files')
  .option('-p, --project <path>', 'Path to Angular project', '.')
  .option('-r, --report <file>', 'Path to existing scan report file')
  .option('--format <type>', 'Output format: console, markdown, json', 'console')
  .option('-o, --output <file>', 'Save suggestions to file')
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
        
        // Check minimum version (Angular 17+)
        if (Number(analyzer.fromVersion) < 17) {
          throw new Error(`This tool only supports Angular 17 and above. Detected version: ${analyzer.fromVersion}`);
        }
        
        await analyzer.fetchBreakingChanges();
        const patterns = await analyzer.scanPatterns();
        const depAnalysis = await analyzer.analyzeDependencies();
        const peerDeps = await analyzer.analyzePeerDependencies();
        
        report = {
          projectPath: options.project,
          fromVersion: analyzer.fromVersion,
          toVersion: analyzer.toVersion,
          patterns: patterns,
          dependencies: depAnalysis,
          peerDependencies: peerDeps,
          breakingChanges: analyzer.breakingChanges
        };
      }
      
      spinner.text = 'Generating suggestions...';
      const suggestionEngine = new SuggestionEngine(report);
      const suggestions = await suggestionEngine.generateSuggestions();
      
      spinner.succeed(`Generated ${suggestions.totalSuggestions} suggestions`);
      
      // Output suggestions based on format
      if (options.format === 'json') {
        console.log(JSON.stringify(suggestions, null, 2));
      } else if (options.format === 'markdown') {
        const markdown = suggestionEngine.toMarkdown(suggestions);
        console.log(markdown);
      } else {
        // Console format
        suggestionEngine.displayConsole(suggestions);
      }
      
      // Save to file if requested
      if (options.output) {
        await suggestionEngine.saveSuggestions(suggestions, options.output, options.format);
        console.log(chalk.green(`\nSuggestions saved to: .ngma/${options.output}`));
      }
      
    } catch (error) {
      spinner.fail('Suggestion generation failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });