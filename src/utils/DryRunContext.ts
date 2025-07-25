import chalk from 'chalk';
import { table } from 'table';

export interface DryRunCommand {
  command: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  category: 'dependencies' | 'angular' | 'security' | 'configuration';
  wouldExecute: boolean;
  reason?: string;
}

export interface DryRunReport {
  commands: DryRunCommand[];
  totalCommands: number;
  wouldExecute: number;
  blocked: number;
  estimatedDuration: string;
  risks: string[];
  recommendations: string[];
}

export class DryRunContext {
  private commands: DryRunCommand[] = [];
  private isDryRun: boolean;

  constructor(isDryRun: boolean = false) {
    this.isDryRun = isDryRun;
  }

  addCommand(command: DryRunCommand): void {
    if (this.isDryRun) {
      this.commands.push(command);
      this.logCommand(command);
    }
  }

  private logCommand(cmd: DryRunCommand): void {
    const icon = cmd.wouldExecute ? '✅' : '🚫';
    const color = cmd.wouldExecute ? chalk.green : chalk.red;

    console.log(`\n${icon} ${color(cmd.description)}`);
    console.log(chalk.gray(`   Commande: ${cmd.command}`));

    if (!cmd.wouldExecute && cmd.reason) {
      console.log(chalk.yellow(`   Raison: ${cmd.reason}`));
    }

    console.log(chalk.gray(`   Impact: ${this.getImpactIcon(cmd.impact)} ${cmd.impact}`));
  }

  private getImpactIcon(impact: string): string {
    switch (impact) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }

  executeCommand(commandFn: () => Promise<any>, commandInfo: DryRunCommand): Promise<any> {
    if (this.isDryRun) {
      this.addCommand(commandInfo);
      // In dry-run mode, don't execute the actual command
      return Promise.resolve({ dryRun: true, command: commandInfo });
    }

    // In normal mode, execute the command
    return commandFn();
  }

  generateReport(): DryRunReport {
    const wouldExecute = this.commands.filter(cmd => cmd.wouldExecute).length;
    const blocked = this.commands.filter(cmd => !cmd.wouldExecute).length;

    const risks = this.identifyRisks();
    const recommendations = this.generateRecommendations();
    const estimatedDuration = this.calculateEstimatedDuration();

    return {
      commands: this.commands,
      totalCommands: this.commands.length,
      wouldExecute,
      blocked,
      estimatedDuration,
      risks,
      recommendations,
    };
  }

  private identifyRisks(): string[] {
    const risks: string[] = [];

    const highImpactCommands = this.commands.filter(cmd => cmd.impact === 'high');
    if (highImpactCommands.length > 0) {
      risks.push(`${highImpactCommands.length} commandes à fort impact détectées`);
    }

    const angularUpdates = this.commands.filter(
      cmd => cmd.category === 'angular' && cmd.command.includes('ng update')
    );
    if (angularUpdates.length > 0) {
      risks.push('Mise à jour Angular majeure nécessaire - vérifiez les breaking changes');
    }

    const securityFixes = this.commands.filter(
      cmd => cmd.category === 'security' && cmd.command.includes('audit fix')
    );
    if (securityFixes.length > 0) {
      risks.push('Corrections de sécurité critiques à appliquer');
    }

    return risks;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.commands.length > 10) {
      recommendations.push('Exécutez les commandes par batch pour éviter les problèmes');
    }

    const blockedCommands = this.commands.filter(cmd => !cmd.wouldExecute);
    if (blockedCommands.length > 0) {
      recommendations.push(
        `Résolvez les ${blockedCommands.length} commandes bloquées avant de continuer`
      );
    }

    const hasAngularUpdate = this.commands.some(cmd => cmd.command.includes('ng update'));
    if (hasAngularUpdate) {
      recommendations.push('Créez une branche dédiée pour la migration Angular');
      recommendations.push('Testez complètement après chaque étape de migration');
    }

    return recommendations;
  }

  private calculateEstimatedDuration(): string {
    let totalMinutes = 0;

    this.commands.forEach(cmd => {
      if (cmd.command.includes('ng update')) totalMinutes += 7;
      else if (cmd.command.includes('npm install')) totalMinutes += 2;
      else if (cmd.command.includes('audit fix')) totalMinutes += 3;
      else if (cmd.command.includes('build')) totalMinutes += 3;
      else if (cmd.command.includes('test')) totalMinutes += 5;
      else totalMinutes += 1;
    });

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}min`;
    }
  }

  displaySummary(): void {
    if (!this.isDryRun || this.commands.length === 0) return;

    const report = this.generateReport();

    console.log(chalk.blue.bold('\n📋 RÉSUMÉ DU MODE DRY-RUN\n'));

    const summaryData = [
      ['Métrique', 'Valeur'],
      ['Total des commandes', report.totalCommands.toString()],
      ['Seraient exécutées', chalk.green(report.wouldExecute.toString())],
      ['Bloquées', chalk.red(report.blocked.toString())],
      ['Durée estimée', report.estimatedDuration],
    ];

    console.log(
      table(summaryData, {
        header: {
          alignment: 'center',
          content: chalk.cyan("Résumé d'exécution"),
        },
      })
    );

    if (report.risks.length > 0) {
      console.log(chalk.yellow.bold('\n⚠️  RISQUES IDENTIFIÉS:'));
      report.risks.forEach(risk => {
        console.log(chalk.yellow(`   • ${risk}`));
      });
    }

    if (report.recommendations.length > 0) {
      console.log(chalk.blue.bold('\n💡 RECOMMANDATIONS:'));
      report.recommendations.forEach(rec => {
        console.log(chalk.blue(`   • ${rec}`));
      });
    }

    console.log(chalk.gray("\n💭 Aucune modification n'a été effectuée (mode dry-run)"));
  }

  reset(): void {
    this.commands = [];
  }

  getCommands(): DryRunCommand[] {
    return [...this.commands];
  }

  isDryRunMode(): boolean {
    return this.isDryRun;
  }
}
