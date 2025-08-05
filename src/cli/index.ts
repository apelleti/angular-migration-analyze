#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { scanCommand } from './commands/scan.js';
import { suggestCommand } from './commands/suggest.js';
import { validateCommand } from './commands/validate.js';

// Read package.json for version
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('ngma')
  .description(chalk.blue('Angular Migration Analyzer - Smart migration assistant'))
  .version(packageJson.version)
  .addCommand(scanCommand)
  .addCommand(suggestCommand)
  .addCommand(validateCommand);

// Add examples
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ ngma scan                     # Analyze current directory for migration to n+1');
  console.log('  $ ngma suggest                  # Get migration suggestions without modifying files');
  console.log('  $ ngma suggest --format markdown # Export suggestions as markdown');
  console.log('  $ ngma validate                 # Validate after migration');
});

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}