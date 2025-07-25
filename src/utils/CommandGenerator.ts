import { AnalysisResult } from '../types';

export class CommandGenerator {
  generateFixCommands(results: AnalysisResult & any): string[] {
    const commands: string[] = [];
    
    try {
      // Install missing peer dependencies (non-optional only)
      const requiredPeerDeps = results.missingPeerDeps
        .filter(dep => dep.severity === 'error' && !dep.optional);
      
      if (requiredPeerDeps.length > 0) {
        const packages = requiredPeerDeps.map(dep => 
          `${dep.package}@"${dep.requiredVersion}"`
        );
        commands.push(`npm install --save-dev ${packages.join(' ')}`);
      }
      
      // Angular-specific update commands
      const outdatedAngularPackages = results.angularPackages
        .filter(pkg => pkg.currentVersion !== pkg.targetVersion);
      
      if (outdatedAngularPackages.length > 0) {
        const corePackage = outdatedAngularPackages.find(p => p.name === '@angular/core');
        if (corePackage) {
          commands.push(`ng update @angular/cli@${corePackage.targetVersion} @angular/core@${corePackage.targetVersion}`);
        }
      }
      
      // Security fixes
      const criticalVulns = results.vulnerabilities?.filter(
        (v: any) => v.severity === 'critical' || v.severity === 'high'
      );
      
      if (criticalVulns && criticalVulns.length > 0) {
        commands.push('npm audit fix --force');
      }
      
      // Deduplicate dependencies if duplicates found
      const duplicates = results.duplicatedDependencies;
      if (duplicates && duplicates.length > 0) {
        commands.push('npm dedupe');
      }
      
    } catch (error) {
      console.warn('Error generating fix commands:', error.message);
    }
    
    return commands;
  }

  getCommandDescription(command: string): string {
    const descriptions: Record<string, string> = {
      'npm install --save-dev': 'Installation des peer dependencies manquantes',
      'ng update @angular/cli': 'Mise à jour d\'Angular CLI',
      'ng update @angular/core': 'Mise à jour d\'Angular Core',
      'npm audit fix': 'Correction des vulnérabilités de sécurité',
      'npm dedupe': 'Déduplication des dépendances',
      'npm run build': 'Build de validation',
      'npm run test': 'Exécution des tests',
      'npm run lint': 'Vérification du code'
    };

    for (const [key, desc] of Object.entries(descriptions)) {
      if (command.includes(key)) {
        return desc;
      }
    }

    return 'Commande de maintenance';
  }

  getCommandCategory(command: string): 'security' | 'dependencies' | 'angular' | 'optimization' {
    if (command.includes('audit')) return 'security';
    if (command.includes('ng update') || command.includes('@angular')) return 'angular';
    if (command.includes('dedupe') || command.includes('npm install')) return 'dependencies';
    return 'optimization';
  }

  estimateCommandTime(command: string): string {
    const timeEstimates: Record<string, string> = {
      'npm install': '1-3 minutes',
      'ng update': '3-10 minutes',
      'npm audit fix': '2-5 minutes',
      'npm dedupe': '30 secondes',
      'npm run build': '1-5 minutes',
      'npm run test': '2-10 minutes'
    };

    for (const [key, time] of Object.entries(timeEstimates)) {
      if (command.includes(key)) {
        return time;
      }
    }

    return '< 1 minute';
  }

  estimateDuration(commands: string[]): string {
    const totalMinutes = commands.reduce((total, cmd) => {
      if (cmd.includes('ng update')) return total + 7; // moyenne
      if (cmd.includes('npm install')) return total + 2;
      if (cmd.includes('audit fix')) return total + 3;
      if (cmd.includes('build')) return total + 3;
      if (cmd.includes('test')) return total + 5;
      return total + 1;
    }, 0);

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}min`;
    }
  }

  generateExecutableScript(commands: string[], results: AnalysisResult): string {
    const timestamp = new Date().toISOString();
    
    let script = '#!/bin/bash\n';
    script += '#\n';
    script += '# Script de correction des dépendances Angular\n';
    script += `# Généré le ${timestamp}\n`;
    script += '# Par angular-migration-analyzer\n';
    script += '#\n\n';
    
    script += 'set -e  # Arrêt en cas d\'erreur\n';
    script += 'set -u  # Arrêt si variable non définie\n\n';
    
    script += '# Couleurs pour les logs\n';
    script += 'RED="\\033[31m"\n';
    script += 'GREEN="\\033[32m"\n';
    script += 'YELLOW="\\033[33m"\n';
    script += 'BLUE="\\033[34m"\n';
    script += 'NC="\\033[0m" # No Color\n\n';
    
    script += 'echo -e "${BLUE}🚀 Début de la correction des dépendances${NC}"\n';
    script += 'echo -e "${YELLOW}⚠️  Assurez-vous d\'avoir créé un backup !${NC}"\n';
    script += 'read -p "Continuer ? (y/N) " -n 1 -r\n';
    script += 'echo\n';
    script += 'if [[ ! $REPLY =~ ^[Yy]$ ]]; then\n';
    script += '    echo "Annulé par l\'utilisateur"\n';
    script += '    exit 1\n';
    script += 'fi\n\n';
    
    // Backup automatique
    script += '# Création d\'un backup\n';
    script += 'echo -e "${BLUE}📦 Création du backup...${NC}"\n';
    script += 'git add -A || true\n';
    script += 'git commit -m "Backup avant correction dépendances" || true\n\n';
    
    // Commandes de correction
    commands.forEach((cmd, index) => {
      const description = this.getCommandDescription(cmd);
      const estimatedTime = this.estimateCommandTime(cmd);
      
      script += `# ${index + 1}. ${description}\n`;
      script += `echo -e "\${BLUE}Étape ${index + 1}/${commands.length}: ${description}\${NC}"\n`;
      script += `echo -e "\${YELLOW}Durée estimée: ${estimatedTime}\${NC}"\n`;
      script += `${cmd}\n`;
      script += 'if [ $? -eq 0 ]; then\n';
      script += `    echo -e "\${GREEN}✅ ${description} - Succès\${NC}"\n`;
      script += 'else\n';
      script += `    echo -e "\${RED}❌ ${description} - Échec\${NC}"\n`;
      script += '    echo "Voulez-vous continuer malgré l\'erreur ? (y/N)"\n';
      script += '    read -n 1 -r\n';
      script += '    if [[ ! $REPLY =~ ^[Yy]$ ]]; then\n';
      script += '        exit 1\n';
      script += '    fi\n';
      script += 'fi\n';
      script += 'echo\n\n';
    });
    
    // Validation finale
    script += '# Validation finale\n';
    script += 'echo -e "${BLUE}🔍 Validation finale...${NC}"\n';
    script += 'npm run build\n';
    script += 'if [ $? -eq 0 ]; then\n';
    script += '    echo -e "${GREEN}✅ Build réussi !${NC}"\n';
    script += 'else\n';
    script += '    echo -e "${RED}❌ Erreurs de build détectées${NC}"\n';
    script += '    echo -e "${YELLOW}Vérifiez les erreurs ci-dessus${NC}"\n';
    script += 'fi\n\n';
    
    script += 'echo -e "${GREEN}🎉 Correction des dépendances terminée !${NC}"\n';
    script += 'echo -e "${BLUE}💡 Pensez à relancer les tests: npm run test${NC}"\n';
    
    return script;
  }

  generateMigrationScript(results: AnalysisResult): string {
    const migrationSteps = results.migrationPath || [];
    const timestamp = new Date().toISOString();
    
    let script = '#!/bin/bash\n';
    script += '#\n';
    script += '# Script de migration Angular\n';
    script += `# Généré le ${timestamp}\n`;
    script += '# Par angular-migration-analyzer\n';
    script += '#\n\n';
    
    script += 'set -e\n';
    script += 'set -u\n\n';
    
    script += '# Configuration\n';
    script += 'BACKUP_BRANCH="backup-before-migration-$(date +%Y%m%d-%H%M%S)"\n';
    script += 'RED="\\033[31m"\n';
    script += 'GREEN="\\033[32m"\n';
    script += 'YELLOW="\\033[33m"\n';
    script += 'BLUE="\\033[34m"\n';
    script += 'NC="\\033[0m"\n\n';
    
    script += 'echo -e "${BLUE}🅰️  Migration Angular${NC}"\n';
    script += 'echo -e "${YELLOW}⚠️  IMPORTANT: Cette migration va modifier votre projet${NC}"\n';
    script += 'echo -e "${YELLOW}   Assurez-vous d\'être sur une branche dédiée !${NC}"\n';
    script += 'read -p "Continuer avec la migration ? (y/N) " -n 1 -r\n';
    script += 'echo\n';
    script += 'if [[ ! $REPLY =~ ^[Yy]$ ]]; then\n';
    script += '    echo "Migration annulée"\n';
    script += '    exit 1\n';
    script += 'fi\n\n';
    
    // Préparation
    script += '# Préparation\n';
    script += 'echo -e "${BLUE}📦 Préparation de la migration...${NC}"\n';
    script += 'git checkout -b "$BACKUP_BRANCH" || true\n';
    script += 'git add -A\n';
    script += 'git commit -m "Snapshot avant migration Angular" || true\n';
    script += 'git checkout - || true\n\n';
    
    // Étapes de migration
    migrationSteps.forEach((step, index) => {
      script += `# ÉTAPE ${step.order}: ${step.description}\n`;
      script += `echo -e "\${BLUE}📋 ÉTAPE ${step.order}: ${step.description}\${NC}"\n`;
      
      if (step.estimatedDuration) {
        script += `echo -e "\${YELLOW}Durée estimée: ${step.estimatedDuration}\${NC}"\n`;
      }
      
      script += 'echo "Appuyez sur Entrée pour continuer ou Ctrl+C pour arrêter"\n';
      script += 'read\n\n';
      
      step.commands.forEach((cmd: string, cmdIndex: number) => {
        script += `echo -e "\${BLUE}Commande ${cmdIndex + 1}/${step.commands.length}: ${cmd}\${NC}"\n`;
        script += `${cmd}\n`;
        script += 'if [ $? -ne 0 ]; then\n';
        script += `    echo -e "\${RED}❌ Erreur lors de: ${cmd}\${NC}"\n`;
        script += '    echo "Voulez-vous continuer ? (y/N)"\n';
        script += '    read -n 1 -r\n';
        script += '    if [[ ! $REPLY =~ ^[Yy]$ ]]; then\n';
        script += '        exit 1\n';
        script += '    fi\n';
        script += 'fi\n\n';
      });
      
      if (step.validation) {
        script += `echo -e "\${BLUE}🔍 Validation: ${step.validation}\${NC}"\n`;
        script += `${step.validation}\n`;
        script += 'if [ $? -eq 0 ]; then\n';
        script += `    echo -e "\${GREEN}✅ Validation réussie\${NC}"\n`;
        script += 'else\n';
        script += `    echo -e "\${YELLOW}⚠️  Validation échouée - vérifiez les erreurs\${NC}"\n`;
        script += 'fi\n\n';
      }
      
      script += `echo -e "\${GREEN}✅ ÉTAPE ${step.order} terminée\${NC}"\n`;
      script += 'echo\n\n';
    });
    
    // Finalisation
    script += '# Finalisation\n';
    script += 'echo -e "${BLUE}🎯 Finalisation de la migration...${NC}"\n';
    script += 'npm run build\n';
    script += 'npm run test\n';
    script += 'echo -e "${GREEN}🎉 Migration Angular terminée avec succès !${NC}"\n';
    script += 'echo -e "${BLUE}💡 N\'oubliez pas de:${NC}"\n';
    script += 'echo -e "   • Tester votre application manuellement"\n';
    script += 'echo -e "   • Vérifier les breaking changes"\n';
    script += 'echo -e "   • Mettre à jour la documentation"\n';
    script += `echo -e "   • Backup disponible sur la branche: $BACKUP_BRANCH"\n`;
    
    return script;
  }

  generatePrerequisites(results: AnalysisResult): string[] {
    const prerequisites: string[] = [];
    
    // Vérifications de base
    prerequisites.push('Créer un backup/commit de l\'état actuel');
    prerequisites.push('S\'assurer que tous les tests passent');
    prerequisites.push('Vérifier que la build fonctionne');
    
    // Basé sur l'analyse
    if (results.summary.criticalIssues > 0) {
      prerequisites.push('Corriger les problèmes critiques identifiés');
    }
    
    const outdatedDeps = results.missingPeerDeps.filter(dep => !dep.optional);
    if (outdatedDeps.length > 0) {
      prerequisites.push('Installer les peer dependencies manquantes');
    }
    
    return prerequisites;
  }

  generatePostMigrationSteps(results: AnalysisResult): string[] {
    return [
      'Exécuter npm run build pour vérifier la compilation',
      'Lancer npm run test pour valider les tests',
      'Tester l\'application manuellement',
      'Vérifier les breaking changes dans les guides Angular',
      'Mettre à jour la documentation du projet',
      'Créer un commit de la migration réussie'
    ];
  }
}