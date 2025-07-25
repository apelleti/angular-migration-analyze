# Angular Migration Analyzer Documentation

Bienvenue dans la documentation complète d'Angular Migration Analyzer, votre outil de confiance pour analyser et migrer vos projets Angular.

## 📚 Table des matières

### 🚀 Pour commencer
- [Installation](getting-started/installation.md) - Comment installer l'outil
- [Démarrage rapide](getting-started/quick-start.md) - Votre première analyse en 5 minutes
- [Configuration](getting-started/configuration.md) - Personnaliser l'outil selon vos besoins

### 📖 Guides
- [Migration Angular 15 vers 16](guides/angular-15-to-16.md)
- [Migration Angular 16 vers 17](guides/angular-16-to-17.md)
- [Migration Angular 17 vers 18](guides/angular-17-to-18.md)
- [Migration de monorepo](guides/monorepo-migration.md)
- [Intégration CI/CD](guides/ci-cd-integration.md)

### 💡 Exemples
- [Analyse basique](examples/basic-analysis/README.md)
- [Configuration entreprise](examples/enterprise-setup/README.md)
- [Analyzers personnalisés](examples/custom-analyzers/README.md)
- [Scripts d'automatisation](examples/automation-scripts/README.md)

### 🔧 Référence API
- [Analyzers](api/analyzers.md) - Documentation des analyzers
- [Configuration](api/configuration.md) - Options de configuration détaillées
- [Utilisation programmatique](api/programmatic-usage.md) - Utiliser la librairie dans votre code

## 🎯 Vue d'ensemble

Angular Migration Analyzer est un outil puissant conçu pour :

- **Analyser** les dépendances de votre projet Angular
- **Identifier** les problèmes de compatibilité et les vulnérabilités
- **Planifier** des migrations étape par étape
- **Automatiser** les corrections courantes
- **Optimiser** les performances de votre application

## 🌟 Fonctionnalités principales

### 1. Analyse complète
- Détection des peer dependencies manquantes
- Identification des conflits de versions
- Analyse de sécurité (vulnérabilités CVE)
- Évaluation des performances (taille des bundles)
- Vérification de la configuration

### 2. Support multi-gestionnaires
- npm
- pnpm  
- yarn

### 3. Modes d'exécution
- **Mode interactif** : Sélection des corrections à appliquer
- **Mode batch** : Automatisation complète
- **Mode dry-run** : Simulation sans modification
- **Mode offline** : Fonctionne sans connexion internet

### 4. Formats de sortie
- Table (console)
- JSON
- HTML
- Script exécutable

## 🏗️ Architecture

```
MigrationAnalyzer
├── PeerDependencyAnalyzer
├── VersionCompatibilityAnalyzer
├── AngularAnalyzer
├── SecurityAnalyzer
├── PerformanceAnalyzer
└── ConfigurationAnalyzer
```

Chaque analyzer est spécialisé dans un domaine spécifique et peut être utilisé indépendamment.

## 💻 Exemples d'utilisation

### Analyse simple
```bash
ng-migrate analyze
```

### Diagnostic complet
```bash
ng-migrate doctor --fail-on-critical
```

### Génération de script de correction
```bash
ng-migrate fix --format script --output fix.sh
```

### Mode dry-run
```bash
ng-migrate analyze --dry-run --fix
```

## 🔒 Sécurité

L'outil intègre plusieurs mesures de sécurité :
- Validation de toutes les entrées utilisateur
- Protection contre les injections de commandes
- Sanitisation des chemins de fichiers
- Mode lecture seule par défaut

## 🤝 Contribution

Voir [CONTRIBUTING.md](../CONTRIBUTING.md) pour les directives de contribution.

## 📄 License

MIT - Voir [LICENSE](../LICENSE) pour plus de détails.

## 🆘 Support

- [Issues GitHub](https://github.com/your-org/angular-migration-analyzer/issues)
- [Discussions](https://github.com/your-org/angular-migration-analyzer/discussions)
- Email: support@example.com

---

*Documentation générée pour la version 1.0.0*