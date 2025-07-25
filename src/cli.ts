#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { table } from 'table';
import * as fs from 'fs';
import { MigrationAnalyzer } from './MigrationAnalyzer';
import { ReportGenerator } from './utils/ReportGenerator';
import { CommandGenerator } from './utils/CommandGenerator';
import { SecurityUtils } from './utils/SecurityUtils';
import { ConfigurationManager } from './utils/ConfigurationManager';
import { DryRunContext } from './utils/DryRunContext';
import { AnalysisProgress, ValidationError } from './types';

const program = new Command();

program
  .name('ng-migrate')
  .description('Analyse et prépare les migrations Angular')
  .version('1.0.0');

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

program
  .command('analyze')
  .description('Analyse les dépendances du projet')
  .option('-p, --path <path>', 'Chemin du projet', process.cwd())
  .option('-f, --format <format>', 'Format de sortie (json|table|html)', 'table')
  .option('-o, --output <file>', 'Fichier de sortie')
  .option('--fix', 'Proposer des corrections automatiques')
  .option('--no-cache', 'Désactiver le cache')
  .option('--dry-run', 'Mode simulation - aucune modification')
  .option('--verbose', 'Mode verbeux')
  .action(async options => {
    let spinner: any;
    const dryRunContext = new DryRunContext(options.dryRun);

    try {
      // Validate inputs
      if (!SecurityUtils.validateFilePath(options.path)) {
        throw new ValidationError('Invalid project path');
      }

      if (options.output && !SecurityUtils.validateFilePath(options.output)) {
        throw new ValidationError('Invalid output file path');
      }

      // Load configuration
      const config = ConfigurationManager.loadConfiguration(options.path);

      if (options.noCache) {
        config.cache.enabled = false;
      }

      // Progress tracking
      spinner = ora("Initialisation de l'analyse...").start();

      const progressCallback = (progress: AnalysisProgress) => {
        if (options.verbose) {
          spinner.text = `${progress.currentTask} (${progress.percentage}%)`;
        }
      };

      const analyzer = new MigrationAnalyzer(options.path, config, progressCallback);

      spinner.text = 'Analyse en cours...';
      const results = await analyzer.analyze();

      spinner.succeed(`Analyse terminée (${results.metadata.duration}ms)`);

      const reporter = new ReportGenerator();

      switch (options.format) {
        case 'json':
          if (options.output) {
            await reporter.generateJSON(results, options.output);
            console.log(chalk.green(`Rapport sauvegardé: ${options.output}`));
          } else {
            console.log(JSON.stringify(results, null, 2));
          }
          break;

        case 'html':
          const htmlFile = options.output || 'migration-report.html';
          await reporter.generateHTML(results, htmlFile);
          console.log(chalk.green(`Rapport HTML généré: ${htmlFile}`));
          break;

        default:
          displayTableReport(results);
      }

      // Display summary
      displaySummary(results);

      if (options.fix && results.recommendations.length > 0) {
        await handleFixSuggestions(results, dryRunContext);
      }

      // Display dry-run summary if applicable
      if (options.dryRun) {
        dryRunContext.displaySummary();
      }

      // Exit with appropriate code
      process.exit(results.summary.criticalIssues > 0 ? 1 : 0);
    } catch (error) {
      if (spinner) {
        spinner.fail("Erreur lors de l'analyse");
      }

      if (error instanceof ValidationError) {
        console.error(chalk.red(`Erreur de validation: ${error.message}`));
      } else {
        console.error(chalk.red(`Erreur: ${error.message}`));
        if (options.verbose) {
          console.error(error.stack);
        }
      }
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('Diagnostic complet du projet')
  .option('-p, --path <path>', 'Chemin du projet', process.cwd())
  .option('--fail-on-critical', 'Échec si problèmes critiques détectés')
  .option('--dry-run', 'Mode simulation - aucune modification')
  .option('--verbose', 'Mode verbeux')
  .action(async options => {
    let spinner: any;

    try {
      if (!SecurityUtils.validateFilePath(options.path)) {
        throw new ValidationError('Invalid project path');
      }

      const config = ConfigurationManager.loadConfiguration(options.path);

      spinner = ora('Diagnostic en cours...').start();

      const analyzer = new MigrationAnalyzer(options.path, config);
      const results = await analyzer.analyze();

      spinner.succeed('Diagnostic terminé');

      // Affichage du diagnostic
      console.log(chalk.blue.bold('\n📊 DIAGNOSTIC DU PROJET\n'));

      displayHealthScore(results);
      displayIssuesSummary(results);
      displayRecommendations(results);

      // Check critical issues
      if (options.failOnCritical && results.summary.criticalIssues > 0) {
        console.log(chalk.red('\n❌ Problèmes critiques détectés - échec du diagnostic'));
        process.exit(1);
      } else if (results.summary.criticalIssues === 0) {
        console.log(chalk.green('\n✅ Aucun problème critique - projet prêt'));
        process.exit(0);
      }
    } catch (error) {
      if (spinner) {
        spinner.fail('Erreur lors du diagnostic');
      }
      console.error(chalk.red(error.message));
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('fix')
  .description('Affiche les corrections suggérées (sans les exécuter)')
  .option('-p, --path <path>', 'Chemin du projet', process.cwd())
  .option('-f, --format <format>', 'Format de sortie (table|json|script)', 'table')
  .option('-o, --output <file>', 'Fichier de sortie pour le script')
  .option('--dry-run', 'Mode simulation - affiche ce qui serait exécuté')
  .option('--verbose', 'Mode verbeux')
  .action(async options => {
    const dryRunContext = new DryRunContext(options.dryRun);

    try {
      if (!SecurityUtils.validateFilePath(options.path)) {
        throw new ValidationError('Invalid project path');
      }

      const config = ConfigurationManager.loadConfiguration(options.path);
      const analyzer = new MigrationAnalyzer(options.path, config);
      const results = await analyzer.analyze();

      const commandGen = new CommandGenerator();
      const commands = commandGen.generateFixCommands(results);

      if (commands.length === 0) {
        console.log(chalk.blue('✅ Aucune correction nécessaire - projet en bonne santé !'));
        return;
      }

      // En mode dry-run, simuler l'exécution des commandes
      if (options.dryRun) {
        commands.forEach(cmd => {
          dryRunContext.addCommand({
            command: cmd,
            description: commandGen.getCommandDescription(cmd),
            impact: cmd.includes('--force') ? 'high' : 'medium',
            category: commandGen.getCommandCategory(cmd),
            wouldExecute: true,
          });
        });

        dryRunContext.displaySummary();
        return;
      }

      switch (options.format) {
        case 'json':
          const jsonOutput = {
            timestamp: new Date().toISOString(),
            commands: commands.map((cmd, index) => ({
              order: index + 1,
              command: cmd,
              description: commandGen.getCommandDescription(cmd),
              category: commandGen.getCommandCategory(cmd),
            })),
            summary: {
              totalCommands: commands.length,
              estimatedDuration: commandGen.estimateDuration(commands),
            },
          };

          if (options.output) {
            await fs.promises.writeFile(options.output, JSON.stringify(jsonOutput, null, 2));
            console.log(chalk.green(`Commandes sauvegardées: ${options.output}`));
          } else {
            console.log(JSON.stringify(jsonOutput, null, 2));
          }
          break;

        case 'script':
          const script = commandGen.generateExecutableScript(commands, results);
          const scriptFile = options.output || 'fix-dependencies.sh';
          await fs.promises.writeFile(scriptFile, script, { mode: 0o755 });
          console.log(chalk.green(`📝 Script généré: ${scriptFile}`));
          console.log(chalk.blue('Pour exécuter: chmod +x ' + scriptFile + ' && ./' + scriptFile));
          break;

        default:
          displayFixCommands(commands, commandGen);
      }
    } catch (error) {
      console.error(chalk.red(`Erreur: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialise la configuration du projet')
  .option('-p, --path <path>', 'Chemin du projet', process.cwd())
  .action(async options => {
    try {
      ConfigurationManager.generateDefaultConfigFile(options.path);
      console.log(chalk.green('✅ Configuration initialisée avec succès'));
    } catch (error) {
      console.error(chalk.red(`Erreur: ${error.message}`));
      process.exit(1);
    }
  });

// Helper functions
function displayTableReport(results: any): void {
  console.log(chalk.blue.bold('\n📦 ANALYSE DES DÉPENDANCES\n'));

  // Peer Dependencies manquantes
  if (results.missingPeerDeps.length > 0) {
    console.log(chalk.red.bold('❌ Peer Dependencies manquantes:'));
    const peerData = [
      ['Package', 'Requis par', 'Version', 'Sévérité'],
      ...results.missingPeerDeps.map((dep: any) => [
        dep.package,
        dep.requiredBy,
        dep.requiredVersion,
        dep.severity === 'error' ? '🚨 Critique' : '⚠️ Optionnel',
      ]),
    ];
    console.log(table(peerData));
  }

  // Conflits de versions
  if (results.conflicts.length > 0) {
    console.log(chalk.yellow.bold('\n⚠️  Conflits de versions:'));
    results.conflicts.forEach((conflict: any) => {
      console.log(chalk.yellow(`${conflict.package}:`));
      conflict.versions.forEach((v: any) => {
        console.log(`  ${v.version} requis par: ${v.requiredBy.join(', ')}`);
      });
      if (conflict.resolution) {
        console.log(chalk.green(`  💡 Résolution suggérée: ${conflict.resolution}`));
      }
    });
  }

  // Packages Angular
  if (results.angularPackages.length > 0) {
    console.log(chalk.green.bold('\n🅰️  Packages Angular:'));
    const angularData = [
      ['Package', 'Version actuelle', 'Version cible', 'Complexité', 'Status'],
      ...results.angularPackages.map((pkg: any) => [
        pkg.name,
        pkg.currentVersion,
        pkg.targetVersion,
        pkg.migrationComplexity || 'unknown',
        pkg.currentVersion === pkg.targetVersion ? '✅' : '🔄',
      ]),
    ];
    console.log(table(angularData));
  }
}

function displaySummary(results: any): void {
  console.log(chalk.blue.bold('\n📊 RÉSUMÉ\n'));

  const summary = results.summary;
  const healthColor =
    summary.healthScore >= 80 ? chalk.green : summary.healthScore >= 60 ? chalk.yellow : chalk.red;
  const healthEmoji = summary.healthScore >= 80 ? '🟢' : summary.healthScore >= 60 ? '🟡' : '🔴';

  console.log(`${healthEmoji} Score de santé: ${healthColor.bold(summary.healthScore)}/100`);
  console.log(`🚨 Problèmes critiques: ${summary.criticalIssues}`);
  console.log(`⚠️  Avertissements: ${summary.warnings}`);
  console.log(`🅰️  Packages Angular: ${summary.angularPackagesCount}`);
  console.log(`💡 Recommandations: ${summary.recommendationsCount}`);
  console.log(`⏱️  Durée d'analyse: ${results.metadata.duration}ms`);
  console.log(`📦 Gestionnaire: ${results.metadata.packageManager}`);
}

function displayHealthScore(results: any): void {
  const score = results.summary.healthScore;
  const color = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
  const emoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';

  console.log(`${emoji} Score de santé: ${color.bold(score)}/100`);
}

function displayIssuesSummary(results: any): void {
  const summary = results.summary;

  console.log(`\n📊 Résumé:`);
  console.log(`   ${chalk.red('Problèmes critiques:')} ${summary.criticalIssues}`);
  console.log(`   ${chalk.yellow('Avertissements:')} ${summary.warnings}`);
  console.log(`   ${chalk.blue('Packages Angular:')} ${summary.angularPackagesCount}`);
}

function displayRecommendations(results: any): void {
  if (results.recommendations.length > 0) {
    console.log(chalk.blue.bold('\n💡 RECOMMANDATIONS\n'));

    // Group by priority
    const highPriority = results.recommendations.filter((r: any) => r.priority === 'high');
    const mediumPriority = results.recommendations.filter((r: any) => r.priority === 'medium');
    const lowPriority = results.recommendations.filter((r: any) => r.priority === 'low');

    [
      { title: '🚨 Priorité élevée', items: highPriority },
      { title: '⚠️ Priorité moyenne', items: mediumPriority },
      { title: 'ℹ️ Priorité faible', items: lowPriority },
    ].forEach(group => {
      if (group.items.length > 0) {
        console.log(chalk.bold(group.title));
        group.items.forEach((rec: any) => {
          console.log(`  • ${rec.message}`);
          if (rec.command) {
            console.log(chalk.gray(`    Commande: ${rec.command}`));
          }
          if (rec.estimatedEffort) {
            console.log(chalk.gray(`    Effort estimé: ${rec.estimatedEffort}`));
          }
        });
        console.log('');
      }
    });
  }
}

function displayFixCommands(commands: string[], commandGen: CommandGenerator): void {
  console.log(chalk.blue.bold('\n🔧 COMMANDES DE CORRECTION\n'));

  commands.forEach((cmd, index) => {
    console.log(chalk.green(`${index + 1}. ${commandGen.getCommandDescription(cmd)}`));
    console.log(chalk.gray(`   ${cmd}`));
    console.log(chalk.gray(`   Durée estimée: ${commandGen.estimateCommandTime(cmd)}`));
    console.log('');
  });

  console.log(chalk.yellow(`⏱️  Durée totale estimée: ${commandGen.estimateDuration(commands)}`));
}

async function handleFixSuggestions(results: any, dryRunContext?: DryRunContext): Promise<void> {
  const fixes = results.recommendations.filter((rec: any) => rec.command);

  if (fixes.length === 0) {
    console.log(chalk.blue('Aucune correction automatique disponible'));
    return;
  }

  console.log(chalk.blue('\n🔧 Corrections suggérées:'));
  fixes.forEach((fix: any, i: number) => {
    console.log(`${i + 1}. ${fix.message}`);
    console.log(chalk.gray(`   ${fix.command}`));
    if (fix.estimatedEffort) {
      console.log(chalk.gray(`   Effort: ${fix.estimatedEffort}`));
    }
  });

  const { selectedFixes } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedFixes',
      message: 'Sélectionnez les corrections à appliquer:',
      choices: fixes.map((fix: any, i: number) => ({
        name: `${fix.message} ${fix.estimatedEffort ? `(${fix.estimatedEffort})` : ''}`,
        value: i,
        checked: fix.priority === 'high',
      })),
    },
  ]);

  if (selectedFixes.length > 0) {
    const commandGen = new CommandGenerator();
    const commands = selectedFixes.map((i: number) => fixes[i].command);

    // Sanitize commands
    const sanitizedCommands = commands
      .map((cmd: string) => {
        try {
          return SecurityUtils.sanitizeCommand(cmd);
        } catch (error) {
          console.warn(chalk.yellow(`Commande ignorée: ${cmd}`));
          return null;
        }
      })
      .filter(Boolean) as string[];

    if (dryRunContext?.isDryRunMode()) {
      // En mode dry-run, enregistrer les commandes sans les exécuter
      sanitizedCommands.forEach(cmd => {
        dryRunContext.addCommand({
          command: cmd,
          description: commandGen.getCommandDescription(cmd),
          impact: 'medium',
          category: commandGen.getCommandCategory(cmd),
          wouldExecute: true,
        });
      });
    } else {
      console.log(chalk.yellow('\n⚠️  Les commandes suivantes seront affichées (non exécutées):'));
      sanitizedCommands.forEach(cmd => {
        console.log(chalk.gray(`   ${cmd}`));
      });
    }
  }
}

program.parse();
