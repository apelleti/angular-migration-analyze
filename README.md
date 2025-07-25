# Angular Migration Analyzer 🚀

[![npm version](https://img.shields.io/npm/v/angular-migration-analyzer.svg)](https://www.npmjs.com/package/angular-migration-analyzer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/angular-migration-analyzer.svg)](https://nodejs.org)
[![Build Status](https://img.shields.io/github/workflow/status/your-org/angular-migration-analyzer/CI)](https://github.com/your-org/angular-migration-analyzer/actions)
[![Coverage Status](https://img.shields.io/codecov/c/github/your-org/angular-migration-analyzer)](https://codecov.io/gh/your-org/angular-migration-analyzer)

> 🔍 Analysez, optimisez et migrez vos projets Angular en toute confiance

Angular Migration Analyzer est un outil puissant qui analyse vos dépendances Angular, identifie les problèmes de compatibilité, et génère des plans de migration détaillés. Parfait pour maintenir vos projets à jour et sécurisés.

## ✨ Fonctionnalités

- 🔍 **Analyse complète** - Peer dependencies, conflits de versions, vulnérabilités
- 🚀 **Performance** - Analyse parallélisée pour des résultats rapides
- 🛡️ **Sécurité** - Détection des vulnérabilités CVE connues
- 📊 **Rapports détaillés** - HTML, JSON, ou directement dans le terminal
- 🎯 **Mode dry-run** - Prévisualisez les changements sans risque
- 🔧 **Corrections automatiques** - Scripts de correction générés automatiquement
- 📦 **Support monorepo** - Analysez plusieurs projets simultanément
- 🌐 **Mode offline** - Fonctionne sans connexion internet

## 📸 Aperçu

### Analyse en action

```bash
$ ng-migrate analyze

🚀 Démarrage de l'analyse complète...
🔍 Analyse des peer dependencies via npm registry...
✅ Analyse terminée (2341ms)

📊 RÉSUMÉ DE L'ANALYSE
╔══════════════════════════════════════════════════════╗
║ 🟡 Score de santé: 75/100                            ║
╠══════════════════════════════════════════════════════╣
║ 🚨 Problèmes critiques: 1                            ║
║ ⚠️  Avertissements: 3                                 ║
║ 🅰️  Packages Angular: 12                              ║
║ 💡 Recommandations: 4                                 ║
╚══════════════════════════════════════════════════════╝

❌ Peer Dependencies manquantes:
┌─────────────────────┬──────────────────┬───────────┬───────────┐
│ Package             │ Requis par       │ Version   │ Sévérité  │
├─────────────────────┼──────────────────┼───────────┼───────────┤
│ @angular/animations │ @angular/common  │ ^17.0.0   │ 🚨 Critique│
└─────────────────────┴──────────────────┴───────────┴───────────┘
```

### Rapport HTML interactif

<p align="center">
  <img src="docs/assets/html-report-preview.png" alt="HTML Report" width="800">
</p>

## 🚀 Installation

### Installation globale (recommandé)

```bash
npm install -g angular-migration-analyzer
```

### Installation locale

```bash
npm install --save-dev angular-migration-analyzer
```

### Utilisation avec npx

```bash
npx angular-migration-analyzer analyze
```

## 📖 Guide de démarrage rapide

### 1. Analyser votre projet

```bash
# Analyse complète
ng-migrate analyze

# Analyse ciblée
ng-migrate analyze --only security
ng-migrate analyze --only performance
```

### 2. Obtenir un diagnostic

```bash
# Diagnostic de santé
ng-migrate doctor

# Avec seuil d'échec
ng-migrate doctor --fail-on-critical
```

### 3. Générer des corrections

```bash
# Voir les commandes suggérées
ng-migrate fix

# Générer un script de correction
ng-migrate fix --format script --output fix-deps.sh

# Mode dry-run (simulation)
ng-migrate fix --dry-run
```

## 🎯 Cas d'usage

### Préparation à une migration Angular

```bash
# Vérifier la compatibilité avec Angular 18, 19 ou 20
ng-migrate analyze --target-version 20

# Générer un plan de migration
ng-migrate fix --format script --output migrate-to-20.sh
```

<details>
<summary>📋 Exemple de script généré</summary>

```bash
#!/bin/bash
# Script de migration généré par Angular Migration Analyzer
# Date: 2024-03-15

echo "🚀 Début de la migration..."

# Sauvegarde
git add -A && git commit -m "backup: pre-migration"

# Étape 1: Installer les peer dependencies manquantes
echo "📦 Installation des dépendances..."
npm install @angular/animations@^17.0.0

# Étape 2: Mise à jour Angular
echo "🔄 Mise à jour Angular..."
ng update @angular/core@20 @angular/cli@20

# Étape 3: Corrections post-migration
echo "🔧 Application des corrections..."
npm audit fix

echo "✅ Migration terminée!"
```

</details>

### Intégration CI/CD

```yaml
# .github/workflows/analyze.yml
name: Dependency Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm install -g angular-migration-analyzer
      - run: ng-migrate doctor --fail-on-critical
```

### Audit de sécurité

```bash
# Scanner les vulnérabilités
ng-migrate analyze --only security --fail-on-high

# Rapport détaillé
ng-migrate analyze --only security --format html --output security-report.html
```

### Analyse de monorepo

```bash
# Analyser tout le monorepo
ng-migrate analyze --monorepo

# Analyser un projet spécifique
ng-migrate analyze --project my-app
```

## 📊 Formats de sortie

### Terminal (par défaut)

Affichage coloré avec emojis pour une lecture facile :

```
🔍 Analyse des versions...
⚠️  Conflits détectés:
   rxjs: 7.5.0 requis par @angular/common
   rxjs: 7.8.0 requis par @ngrx/store
   
💡 Recommandation: Utiliser rxjs@7.8.0
```

### HTML

Rapport interactif avec graphiques et filtres :

```bash
ng-migrate analyze --format html --output report.html
```

Features du rapport HTML :
- 📊 Graphiques interactifs
- 🔍 Recherche et filtres
- 📱 Responsive design
- 🎨 Thème clair/sombre
- 📥 Export PDF

### JSON (pour l'automatisation)

```bash
ng-migrate analyze --format json --output analysis.json
```

<details>
<summary>📄 Structure JSON</summary>

```json
{
  "summary": {
    "healthScore": 75,
    "criticalCount": 1,
    "warningCount": 3,
    "angularPackages": 12,
    "recommendationCount": 4,
    "metadata": {
      "analyzedAt": "2024-03-15T10:30:00Z",
      "projectPath": "/my-project",
      "version": "1.0.0"
    }
  },
  "missingPeerDeps": [
    {
      "package": "@angular/animations",
      "requiredBy": "@angular/common",
      "requiredVersion": "^17.0.0",
      "severity": "critical"
    }
  ],
  "vulnerabilities": {
    "critical": 0,
    "high": 1,
    "moderate": 2,
    "low": 3
  },
  "recommendations": [
    {
      "type": "update",
      "package": "@angular/core",
      "from": "17.0.0",
      "to": "17.3.0",
      "reason": "Security fixes and performance improvements"
    }
  ]
}
```

</details>

## 🔧 Configuration avancée

Créez un fichier `.ng-migrate.json` à la racine de votre projet :

```json
{
  "registry": "https://registry.npmjs.org",
  "cache": {
    "enabled": true,
    "ttl": 300000,
    "maxSize": 100
  },
  "analysis": {
    "includeDevDependencies": true,
    "checkVulnerabilities": true,
    "checkLicenses": true,
    "excludePackages": ["@types/*", "eslint-*"]
  },
  "output": {
    "colors": true,
    "emoji": true,
    "verbose": false
  },
  "rules": {
    "peerDependencies": {
      "severity": "error",
      "allowOptional": true
    },
    "security": {
      "auditLevel": "moderate",
      "failOnVulnerabilities": true
    },
    "performance": {
      "maxBundleSize": 5000000,
      "warnDuplicates": true
    }
  }
}
```

## 🛠️ Options CLI complètes

### Commandes principales

| Commande | Description | Exemple |
|----------|-------------|---------|
| `analyze` | Analyse complète du projet | `ng-migrate analyze` |
| `doctor` | Diagnostic rapide de santé | `ng-migrate doctor` |
| `fix` | Génère les commandes de correction | `ng-migrate fix --dry-run` |
| `init` | Initialise la configuration | `ng-migrate init` |

### Options communes

| Option | Description | Défaut |
|--------|-------------|---------|
| `--format` | Format de sortie (table, json, html, script) | `table` |
| `--output` | Fichier de sortie | stdout |
| `--only` | Type d'analyse spécifique | all |
| `--dry-run` | Mode simulation | `false` |
| `--verbose` | Mode verbeux | `false` |
| `--quiet` | Mode silencieux | `false` |
| `--no-colors` | Désactive les couleurs | `false` |
| `--no-emoji` | Désactive les emojis | `false` |
| `--fail-on-critical` | Échec si problèmes critiques | `false` |
| `--target-version` | Version Angular cible | latest |
| `--monorepo` | Mode monorepo | `false` |
| `--project` | Projet spécifique (monorepo) | all |

## 📈 Performance et optimisations

Notre outil est optimisé pour la performance avec :
- 🚀 Analyse parallélisée (p-limit)
- 💾 Cache intelligent des requêtes npm
- 🔄 Réutilisation des résultats d'analyse
- 📦 Bundling optimisé avec esbuild

### Benchmarks

| Taille du projet | Temps d'analyse | Mémoire utilisée |
|------------------|-----------------|------------------|
| Petit (<50 deps) | ~2s | ~50MB |
| Moyen (50-200 deps) | ~5s | ~100MB |
| Large (200+ deps) | ~10s | ~200MB |
| Monorepo (1000+ deps) | ~30s | ~500MB |

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez notre [guide de contribution](CONTRIBUTING.md).

```bash
# Cloner le repo
git clone https://github.com/your-org/angular-migration-analyzer.git
cd angular-migration-analyzer

# Installer les dépendances
npm install

# Lancer les tests
npm test

# Build
npm run build

# Lancer en mode développement
npm run dev
```

### Scripts disponibles

- `npm test` - Lance les tests unitaires
- `npm run test:coverage` - Tests avec couverture
- `npm run lint` - Vérification du code
- `npm run build` - Build de production
- `npm run dev` - Mode développement
- `npm run website:dev` - Lance le site web en développement
- `npm run website:build` - Build le site web pour production
- `npm run website:start` - Lance le site web en production

## 📚 Documentation complète

- 📖 [Documentation complète](docs/index.md)
- 🚀 [Guide de démarrage](docs/getting-started/quick-start.md)
- 🔧 [Configuration avancée](docs/getting-started/configuration.md)
- 📋 [Guides de migration](docs/guides/)
  - [Angular 15 → 16](docs/guides/angular-15-to-16.md)
  - [Angular 16 → 17](docs/guides/angular-16-to-17.md)
  - [Angular 17 → 18](docs/guides/angular-17-to-18.md)
  - [Angular 18 → 19](docs/guides/angular-18-to-19.md)
  - [Angular 19 → 20](docs/guides/angular-19-to-20.md)
- 🏭 [Intégration CI/CD](docs/guides/ci-cd-integration.md)
- 🏢 [Migration Monorepo](docs/guides/monorepo-migration.md)
- 🌐 [Site Web](https://angular-migration-analyzer.dev) - Démo interactive et documentation

## 🏆 Comparaison avec d'autres outils

| Fonctionnalité | Angular Migration Analyzer | ng update | npm audit |
|----------------|---------------------------|-----------|-----------|
| Analyse des peer deps | ✅ Complète | ⚠️ Basique | ❌ |
| Détection de conflits | ✅ Avancée | ⚠️ Limitée | ❌ |
| Suggestions de fix | ✅ Détaillées | ⚠️ Basiques | ⚠️ |
| Mode dry-run | ✅ | ❌ | ❌ |
| Support monorepo | ✅ | ⚠️ | ❌ |
| Rapports visuels | ✅ | ❌ | ❌ |
| Performance analysis | ✅ | ❌ | ❌ |
| Analyse offline | ✅ | ❌ | ❌ |

## 🛡️ Sécurité

- ✅ Pas d'exécution automatique de commandes
- ✅ Validation de toutes les entrées utilisateur
- ✅ Mode dry-run par défaut pour les actions sensibles
- ✅ Support des proxies d'entreprise
- ✅ Audit de sécurité intégré

## 📊 Qui utilise Angular Migration Analyzer ?

<p align="center">
  <img src="docs/assets/users-logos.png" alt="Users" width="600">
</p>

- 🏢 Grandes entreprises pour leurs migrations Angular
- 🚀 Startups pour maintenir leurs dépendances à jour
- 👥 Équipes de développement pour l'intégration CI/CD
- 🎓 Formateurs pour enseigner les bonnes pratiques



## 📄 License

MIT © [Your Organization](https://github.com/your-org)

## 🙏 Remerciements

- L'équipe Angular pour leur excellent framework
- La communauté npm pour l'écosystème riche
- Tous nos contributeurs et utilisateurs
- Les mainteneurs des dépendances utilisées

---

<p align="center">
  Fait avec ❤️ par la communauté Angular
</p>

<p align="center">
  <a href="https://github.com/your-org/angular-migration-analyzer/issues/new?template=bug_report.md">🐛 Signaler un bug</a>
  ·
  <a href="https://github.com/your-org/angular-migration-analyzer/issues/new?template=feature_request.md">✨ Demander une fonctionnalité</a>
  ·
  <a href="https://discord.gg/angular">💬 Rejoindre la communauté</a>
  ·
  <a href="https://twitter.com/angular">🐦 Suivre sur Twitter</a>
</p>