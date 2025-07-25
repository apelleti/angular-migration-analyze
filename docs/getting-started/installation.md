# Installation

Ce guide vous explique comment installer Angular Migration Analyzer sur votre système.

## Prérequis

- **Node.js** : Version 16.0.0 ou supérieure
- **npm** : Version 7.0.0 ou supérieure (généralement installé avec Node.js)
- **Git** : Pour cloner des projets (optionnel)

### Vérifier les prérequis

```bash
# Vérifier la version de Node.js
node --version
# Devrait afficher v16.0.0 ou plus

# Vérifier la version de npm
npm --version
# Devrait afficher 7.0.0 ou plus
```

## Méthodes d'installation

### 1. Installation globale (recommandé)

Installez l'outil globalement pour l'utiliser sur tous vos projets :

```bash
npm install -g angular-migration-analyzer
```

Après l'installation, vérifiez que l'outil est bien installé :

```bash
ng-migrate --version
# Devrait afficher : 1.0.0
```

### 2. Installation locale (par projet)

Pour installer l'outil uniquement pour un projet spécifique :

```bash
# Dans le répertoire de votre projet
npm install --save-dev angular-migration-analyzer
```

Puis ajoutez un script dans votre `package.json` :

```json
{
  "scripts": {
    "analyze": "ng-migrate analyze",
    "doctor": "ng-migrate doctor"
  }
}
```

Utilisation :
```bash
npm run analyze
```

### 3. Utilisation avec npx (sans installation)

Pour utiliser l'outil sans l'installer :

```bash
npx angular-migration-analyzer analyze
```

### 4. Installation depuis les sources

Pour les contributeurs ou pour tester la dernière version :

```bash
# Cloner le repository
git clone https://github.com/your-org/angular-migration-analyzer.git
cd angular-migration-analyzer

# Installer les dépendances
npm install

# Builder le projet
npm run build

# Lier globalement
npm link
```

## Installation avec d'autres gestionnaires de packages

### Yarn

```bash
# Global
yarn global add angular-migration-analyzer

# Local
yarn add --dev angular-migration-analyzer
```

### pnpm

```bash
# Global
pnpm add -g angular-migration-analyzer

# Local  
pnpm add -D angular-migration-analyzer
```

## Configuration post-installation

### 1. Initialiser la configuration (optionnel)

```bash
ng-migrate init
```

Cela crée un fichier `.ng-migrate.json` avec la configuration par défaut.

### 2. Vérifier l'installation

Exécutez le diagnostic pour vérifier que tout fonctionne :

```bash
ng-migrate doctor
```

## Résolution des problèmes courants

### Erreur : "command not found"

Si la commande `ng-migrate` n'est pas trouvée après l'installation globale :

1. Vérifiez le PATH npm :
   ```bash
   npm config get prefix
   ```

2. Ajoutez le répertoire bin au PATH :
   ```bash
   # Linux/Mac
   export PATH=$PATH:$(npm config get prefix)/bin
   
   # Windows
   set PATH=%PATH%;%APPDATA%\npm
   ```

### Erreur : "EACCES permission denied"

Sur Linux/Mac, si vous avez des problèmes de permissions :

1. Utilisez un gestionnaire de versions Node (recommandé) :
   ```bash
   # Installer nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Installer Node
   nvm install node
   ```

2. Ou configurez npm pour utiliser un répertoire différent :
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   ```

### Problèmes de proxy

Si vous êtes derrière un proxy d'entreprise :

```bash
# Configurer le proxy npm
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Installer l'outil
npm install -g angular-migration-analyzer
```

## Mise à jour

Pour mettre à jour vers la dernière version :

```bash
# Installation globale
npm update -g angular-migration-analyzer

# Installation locale
npm update angular-migration-analyzer
```

Vérifiez la version après la mise à jour :

```bash
ng-migrate --version
```

## Désinstallation

Pour désinstaller l'outil :

```bash
# Installation globale
npm uninstall -g angular-migration-analyzer

# Installation locale
npm uninstall angular-migration-analyzer
```

## Prochaines étapes

- [Démarrage rapide](quick-start.md) - Effectuez votre première analyse
- [Configuration](configuration.md) - Personnalisez l'outil
- [Exemples](../examples/basic-analysis/README.md) - Voir des cas d'usage concrets