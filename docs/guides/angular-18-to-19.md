# Migration Angular 18 vers 19

Ce guide détaille le processus de migration d'Angular 18 vers Angular 19.

## Vue d'ensemble

Angular 19 apporte des améliorations significatives en termes de performance et introduit de nouvelles fonctionnalités pour améliorer l'expérience développeur.

### Principales nouveautés

- **Signals stables** : Les Signals sont maintenant stables et recommandés pour la gestion d'état
- **Amélioration des performances** : Optimisations du moteur de rendu et de la détection de changements
- **Support étendu Node.js** : Compatibilité avec Node.js 18.19.1, 20.11.1 et 22.0.0
- **TypeScript 5.5-5.6** : Support des dernières fonctionnalités TypeScript
- **Nouveaux schémas de migration** : Migration automatique vers les Signals

## Prérequis

### Versions requises
- Node.js : >=18.19.1 || >=20.11.1 || >=22.0.0
- TypeScript : >=5.5.0 <5.7.0
- Zone.js : ^0.15.0

### Préparation

1. **Sauvegarde du projet**
```bash
git checkout -b migration/angular-19
git add -A
git commit -m "chore: pre-Angular19 migration backup"
```

2. **Vérification de l'état actuel**
```bash
ng version
npm outdated
ng-migrate analyze
```

## Processus de migration

### Étape 1 : Mise à jour Angular CLI

```bash
npm install -g @angular/cli@19
```

### Étape 2 : Mise à jour des dépendances

```bash
ng update @angular/core@19 @angular/cli@19
```

### Étape 3 : Mise à jour des dépendances tierces

```bash
ng update @angular/material@19
ng update @angular/cdk@19
ng update @angular/pwa@19
```

### Étape 4 : Migration automatique

```bash
ng update @angular/core@19 --migrate-only
```

## Changements majeurs (Breaking Changes)

### 1. Signals par défaut

Les nouveaux composants utilisent maintenant les Signals par défaut :

```typescript
// Avant (Angular 18)
@Component({
  selector: 'app-counter',
  template: '{{ count }}'
})
export class CounterComponent {
  count = 0;
  
  increment() {
    this.count++;
  }
}

// Après (Angular 19)
@Component({
  selector: 'app-counter',
  template: '{{ count() }}'
})
export class CounterComponent {
  count = signal(0);
  
  increment() {
    this.count.update(v => v + 1);
  }
}
```

### 2. Nouvelle API de formulaires réactifs avec Signals

```typescript
// Nouveau système de formulaires avec Signals
import { FormControl, FormGroup } from '@angular/forms/signals';

const form = new FormGroup({
  name: new FormControl(''),
  email: new FormControl('')
});

// Accès aux valeurs via signals
const nameValue = form.controls.name.value(); // Signal<string>
```

### 3. Optimisations du build

Le nouveau système de build utilise esbuild par défaut avec des optimisations améliorées :

```json
{
  "projects": {
    "app": {
      "architect": {
        "build": {
          "options": {
            "optimization": {
              "scripts": true,
              "styles": {
                "minify": true,
                "inlineCritical": true
              },
              "fonts": true
            }
          }
        }
      }
    }
  }
}
```

## Nouvelles fonctionnalités

### 1. Computed Signals améliorés

```typescript
const firstName = signal('John');
const lastName = signal('Doe');

// Nouveau : computed avec dépendances explicites
const fullName = computed(() => {
  return `${firstName()} ${lastName()}`;
}, { equals: (a, b) => a === b });
```

### 2. Effects optimisés

```typescript
// Nouveau : effects avec options avancées
effect(() => {
  console.log('Count changed:', count());
}, {
  allowSignalWrites: true,
  manualCleanup: true
});
```

### 3. Lazy loading amélioré

```typescript
// Routes avec préchargement intelligent
const routes: Routes = [
  {
    path: 'feature',
    loadChildren: () => import('./feature/feature.module'),
    data: { preload: true, priority: 'high' }
  }
];
```

## Optimisations recommandées

### 1. Migration vers Signals

```bash
# Utiliser le schéma de migration
ng generate @angular/core:signals-migration
```

### 2. Optimisation des bundles

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "500kb",
      "maximumError": "1mb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "2kb",
      "maximumError": "4kb"
    }
  ]
}
```

### 3. Activation du mode standalone par défaut

```typescript
// angular.json
{
  "schematics": {
    "@schematics/angular:component": {
      "standalone": true
    }
  }
}
```

## Tests et validation

### 1. Tests unitaires
```bash
npm test
```

### 2. Tests e2e
```bash
npm run e2e
```

### 3. Analyse de bundle
```bash
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

### 4. Vérification des performances
```bash
ng build --configuration production
npx lighthouse http://localhost:4200 --view
```

## Checklist de migration

- [ ] Backup du code source
- [ ] Mise à jour vers Node.js 18.19.1+ ou 20.11.1+ ou 22.0.0+
- [ ] ng update @angular/core@19 @angular/cli@19
- [ ] ng update des dépendances tierces
- [ ] Migration vers Signals (optionnel mais recommandé)
- [ ] Tests unitaires passants
- [ ] Tests e2e passants
- [ ] Build de production fonctionnel
- [ ] Vérification des performances
- [ ] Mise à jour de la documentation

## Dépannage

### Erreur : "Cannot find module '@angular/core/signals'"
Solution : Assurez-vous d'avoir la dernière version d'Angular 19
```bash
npm install @angular/core@19 --save --force
```

### Erreur : "TypeScript version mismatch"
Solution : Installer la version TypeScript compatible
```bash
npm install typescript@~5.5.0 --save-dev
```

### Problèmes de compatibilité avec les dépendances
Solution : Forcer la mise à jour
```bash
ng update --all --force
```

## Ressources

- [Angular 19 Release Notes](https://blog.angular.io/angular-v19)
- [Guide de migration officiel](https://angular.io/guide/update-to-version-19)
- [Signals Guide](https://angular.io/guide/signals)
- [Migration Angular 19 vers 20](angular-19-to-20.md)