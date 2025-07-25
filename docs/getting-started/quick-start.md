# Démarrage rapide

Ce guide vous permet de démarrer avec Angular Migration Analyzer en 5 minutes.

## 🚀 Première analyse

### Étape 1 : Naviguer vers votre projet Angular

```bash
cd /chemin/vers/mon-projet-angular
```

### Étape 2 : Lancer l'analyse

```bash
ng-migrate analyze
```

Vous devriez voir quelque chose comme :

```
🚀 Démarrage de l'analyse complète...
🔍 Analyse des peer dependencies via npm registry...
✅ Analyse terminée (2341ms)

📆 ANALYSE DES DÉPENDANCES

❌ Peer Dependencies manquantes:
┌─────────────────────┬──────────────────┬───────────┬───────────┐
│ Package             │ Requis par       │ Version   │ Sévérité  │
├─────────────────────┼──────────────────┼───────────┼───────────┤
│ @angular/animations │ @angular/common  │ ^17.0.0   │ 🚨 Critique│
└─────────────────────┴──────────────────┴───────────┴───────────┘

📈 RÉSUMÉ

🟡 Score de santé: 75/100
🚨 Problèmes critiques: 1
⚠️  Avertissements: 3
🅰️  Packages Angular: 12
💡 Recommandations: 4
```

## 🔍 Comprendre les résultats

### Score de santé
- **80-100** 🟢 : Excellent, projet en bonne santé
- **60-79** 🟡 : Correct, quelques améliorations nécessaires
- **0-59** 🔴 : Critique, action immédiate requise

### Types de problèmes
1. **Peer Dependencies manquantes** : Packages requis non installés
2. **Conflits de versions** : Différentes versions requises du même package
3. **Vulnérabilités** : Problèmes de sécurité connus
4. **Packages obsolètes** : Versions trop anciennes

## 🏥 Diagnostic de santé

Pour un diagnostic plus détaillé :

```bash
ng-migrate doctor
```

Résultat :
```
📈 DIAGNOSTIC DU PROJET

🟡 Score de santé: 75/100

📈 Résumé:
   Problèmes critiques: 1
   Avertissements: 3
   Packages Angular: 12

💡 RECOMMANDATIONS

🚨 Priorité élevée
  • Installer @angular/animations pour @angular/common
    Commande: npm install @angular/animations@^17.0.0

⚠️ Priorité moyenne
  • Mettre à jour @angular/core vers la version 17.1.0
    Commande: ng update @angular/core@17.1.0
```

## 🔧 Générer des corrections

### Voir les commandes de correction

```bash
ng-migrate fix
```

Cela affiche les commandes suggérées sans les exécuter.

### Générer un script de correction

```bash
ng-migrate fix --format script --output fix-deps.sh
```

Crée un script Bash exécutable avec :
- Sauvegarde automatique (git)
- Exécution sécurisée
- Gestion des erreurs
- Validation finale

### Exécuter le script

```bash
chmod +x fix-deps.sh
./fix-deps.sh
```

## 🧑‍💻 Mode interactif

Pour sélectionner les corrections à appliquer :

```bash
ng-migrate analyze --fix
```

Vous verrez :
```
🔧 Corrections suggérées:
1. Installer @angular/animations pour la compatibilité
   npm install @angular/animations@^17.0.0
   Effort: 2 minutes

2. Mettre à jour TypeScript pour Angular 17
   npm install typescript@~5.2.0
   Effort: 5 minutes

? Sélectionnez les corrections à appliquer: (Appuyez <espace> pour sélectionner)
 ❯◉ Installer @angular/animations (2 minutes)
  ◯ Mettre à jour TypeScript (5 minutes)
```

## 🧪 Mode dry-run (simulation)

Pour voir ce qui serait exécuté sans rien modifier :

```bash
ng-migrate analyze --dry-run --fix
```

Résultat :
```
✅ Installation des peer dependencies manquantes
   Commande: npm install --save-dev @angular/animations@^17.0.0
   Impact: 🟡 medium

📓 RÉSUMÉ DU MODE DRY-RUN

Total des commandes: 3
Seraient exécutées: 3
Bloquées: 0
Durée estimée: 10 minutes

💭 Aucune modification n'a été effectuée (mode dry-run)
```

## 📄 Formats de sortie

### JSON (pour l'automatisation)

```bash
ng-migrate analyze --format json --output analysis.json
```

### HTML (pour les rapports)

```bash
ng-migrate analyze --format html --output report.html
```

Ouvrez le fichier dans un navigateur pour un rapport visuel complet.

## 🌐 Mode hors ligne

Si vous n'avez pas accès à internet :

```bash
ng-migrate analyze --offline
```

Note : Certaines fonctionnalités seront limitées (pas de vérification des dernières versions).

## 🎯 Cas d'usage courants

### 1. Avant une mise à jour Angular majeure

```bash
# Analyser l'état actuel
ng-migrate analyze

# Générer un plan de migration
ng-migrate fix --format script --output pre-migration.sh

# Exécuter les corrections
./pre-migration.sh

# Procéder à la migration
ng update @angular/core@17 @angular/cli@17
```

### 2. Intégration CI/CD

```bash
# Faire échouer le build si problèmes critiques
ng-migrate doctor --fail-on-critical
```

### 3. Audit de sécurité régulier

```bash
# Rapport JSON pour monitoring
ng-migrate analyze --format json | jq '.vulnerabilities'
```

## 🔔 Astuces

1. **Utilisez `--verbose`** pour plus de détails lors du débogage
2. **Créez un alias** pour les commandes fréquentes :
   ```bash
   alias nga="ng-migrate analyze"
   alias ngd="ng-migrate doctor"
   ```
3. **Sauvegardez toujours** avant d'appliquer des corrections
4. **Testez en dry-run** avant toute modification

## ❓ Aide et support

```bash
# Aide générale
ng-migrate --help

# Aide pour une commande
ng-migrate analyze --help
```

## Prochaines étapes

- [Configuration avancée](configuration.md)
- [Guide de migration Angular 17](../guides/angular-17-to-18.md)
- [Intégration CI/CD](../guides/ci-cd-integration.md)