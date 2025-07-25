# 🚀 Angular Migration Analyzer - Guide d'utilisation

## Installation

```bash
# Installation globale
npm install -g angular-migration-analyzer

# Ou utilisation avec npx
npx angular-migration-analyzer
```

## Commandes principales

### 📊 Analyse complète

```bash
# Analyse standard avec affichage en tableau
ng-migrate analyze

# Analyse avec rapport JSON
ng-migrate analyze --format json --output report.json

# Analyse avec rapport HTML
ng-migrate analyze --format html --output migration-report.html

# Analyse avec suggestions de corrections
ng-migrate analyze --fix
```

### 🔍 Diagnostic complet

```bash
# Diagnostic avec score de santé
ng-migrate doctor

# Diagnostic d'un projet spécifique
ng-migrate doctor --path /chemin/vers/projet
```

### 🔧 Corrections automatiques

```bash
# Prévisualiser les corrections
ng-migrate fix --dry-run

# Appliquer toutes les corrections automatiquement
ng-migrate fix --auto

# Appliquer les corrections de façon interactive
ng-migrate fix
```

### 🔄 Migration assistée

```bash
# Migration vers la version Angular suivante
ng-migrate migrate

# Migration vers une version spécifique
ng-migrate migrate --to 18

# Migration avec backup automatique
ng-migrate backup --description "Avant migration v18"
ng-migrate migrate --to 18
```

## Fonctionnalités avancées

### 💾 Gestion des backups

```bash
# Créer un backup
ng-migrate backup --description "Backup avant migration"

# Lister les backups disponibles
ng-migrate restore

# Restaurer un backup spécifique
ng-migrate restore
```

### 🏢 Support des monorepos

```bash
# Analyser tous les workspaces d'un monorepo
ng-migrate monorepo

# Générer un rapport consolidé
ng-migrate monorepo --output monorepo-report.json
```

### 🔔 ~~Notifications~~ (supprimé)

### ⚙️ ~~Configuration CI/CD~~ (supprimé)

## Exemples de rapports

### Exemple de sortie console

```
📊 ANALYSE DES DÉPENDANCES

❌ Peer Dependencies manquantes:
┌─────────────────────┬──────────────────┬───────────┬───────────┐
│ Package             │ Requis par       │ Version   │ Optionnel │
├─────────────────────┼──────────────────┼───────────┼───────────┤
│ @angular/animations │ @angular/common  │ ^18.0.0   │ ✗         │
│ zone.js             │ @angular/core    │ ~0.14.0   │ ✗         │
└─────────────────────┴──────────────────┴───────────┴───────────┘

⚠️ Conflits de versions:
rxjs:
  6.6.7 requis par: @angular/core, @angular/common
  7.8.1 requis par: @ngrx/store

🅰️ Packages Angular:
┌─────────────────────┬──────────────────┬───────────────┬────────┐
│ Package             │ Version actuelle │ Version cible │ Status │
├─────────────────────┼──────────────────┼───────────────┼────────┤
│ @angular/core       │ 17.3.2          │ 18.0.0        │ 🔄     │
│ @angular/common     │ 17.3.2          │ 18.0.0        │ 🔄     │
│ @angular/cli        │ 17.3.2          │ 18.0.0        │ 🔄     │
└─────────────────────┴──────────────────┴───────────────┴────────┘

🟡 Score de santé: 75/100

📊 Résumé:
   Problèmes critiques: 2
   Avertissements: 3
   Packages Angular: 8

💡 RECOMMANDATIONS

🚨 2 vulnérabilité(s) critique(s) détectées
   Commande: npm audit fix --force

⚠️ lodash est déprécié: Maintenance minimale
   Remplacer par: ramda ou utils natives ES6+

ℹ️ Packages volumineux détectés: moment, lodash
   Considérer le lazy loading ou des alternatives plus légères
```

### Diagnostic avec score de santé

```
🟢 Score de santé: 92/100

📊 Résumé:
   Problèmes critiques: 0
   Avertissements: 1
   Packages Angular: 12

✅ Prêt pour la migration !

💡 RECOMMANDATIONS

ℹ️ TypeScript 5.0 détecté - compatible avec Angular 18
ℹ️ Node.js 18.16.0 - version recommandée
⚠️ ESLint: quelques règles obsolètes détectées
```

## Configuration avancée

### Fichier de configuration (.ng-migrate.json)

```json
{
  "registry": "https://registry.npmjs.org",
  "cache": {
    "enabled": true,
    "ttl": 300000
  },
  "analysis": {
    "includeDevDependencies": true,
    "checkVulnerabilities": true,
    "skipOptionalPeerDeps": false
  },
  "excludePackages": [
    "@types/*",
    "eslint-*"
  ],
  "customRules": [
    {
      "name": "angular-version-alignment",
      "enabled": true,
      "severity": "error"
    }
  ]
}
```

### Variables d'environnement

```bash
# Registry npm alternatif
export NG_MIGRATE_REGISTRY=https://npm.internal.company.com

# Désactiver le cache
export NG_MIGRATE_CACHE=false

# Niveau de log
export NG_MIGRATE_LOG_LEVEL=debug
```

## Intégration programmatique

```typescript
import { MigrationAnalyzer } from 'angular-migration-analyzer';

async function analyzeProject() {
  const analyzer = new MigrationAnalyzer('./my-project');
  
  // Analyse complète
  const results = await analyzer.analyze();
  
  // Vérifier les problèmes critiques
  const criticalIssues = results.missingPeerDeps
    .filter(dep => !dep.optional).length;
  
  if (criticalIssues > 0) {
    console.error(`${criticalIssues} problèmes critiques détectés !`);
    process.exit(1);
  }
}
```

## Workflows recommandés

### 1. Migration mensuelle

```bash
#!/bin/bash
# scripts/monthly-migration-check.sh

echo "🔍 Vérification mensuelle des dépendances..."

# Créer un backup
ng-migrate backup --description "Backup mensuel $(date +%Y-%m-%d)"

# Analyser le projet
ng-migrate analyze --format html --output reports/monthly-$(date +%Y-%m).html

# Vérifier les vulnérabilités critiques
if ng-migrate doctor; then
  echo "✅ Projet en bonne santé"
else
  echo "❌ Action requise - consultez le rapport"
fi
```

### 2. Migration progressive

```bash
# Migration d'Angular 15 vers 18 (étape par étape)

# Étape 1: Audit initial
ng-migrate doctor
ng-migrate backup --description "Avant migration 15->16"

# Étape 2: Migration vers 16
ng-migrate migrate --to 16
npm run test
npm run build

# Étape 3: Migration vers 17
ng-migrate backup --description "Avant migration 16->17"
ng-migrate migrate --to 17
npm run test

# Étape 4: Migration vers 18
ng-migrate backup --description "Avant migration 17->18"
ng-migrate migrate --to 18
npm run test
npm run build

# Validation finale
ng-migrate doctor
```

## Dépannage

### Problèmes courants

**Erreur: "Package non trouvé dans le registre"**
```bash
# Vérifier la connectivité
npm ping

# Utiliser un registry alternatif
ng-migrate analyze --registry https://registry.npmjs.org
```

**Cache corrompu**
```bash
# Vider le cache
rm -rf .migration-cache.json
ng-migrate analyze
```

**Timeout des requêtes**
```bash
# Augmenter le timeout
export NG_MIGRATE_TIMEOUT=30000
ng-migrate analyze
```

### Support et contributions

- **Issues**: [GitHub Issues](https://github.com/your-org/angular-migration-analyzer/issues)
- **Documentation**: [Wiki](https://github.com/your-org/angular-migration-analyzer/wiki)
- **Contributions**: [Contributing Guide](CONTRIBUTING.md)

## Roadmap

- [ ] Support Bun et Deno
- [ ] Intégration avec Renovate
- [ ] Plugin VS Code
- [ ] Support des micro-frontends
- [ ] Analyse des performances runtime