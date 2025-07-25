# Migration Angular 19 vers 20

Ce guide détaille le processus de migration d'Angular 19 vers Angular 20.

## Vue d'ensemble

Angular 20 représente une évolution majeure avec un focus sur l'intelligence artificielle, les performances extrêmes et une meilleure intégration avec les standards web modernes.

### Principales nouveautés

- **IA intégrée** : Outils d'IA pour la génération de code et l'optimisation
- **Web Components natifs** : Support amélioré des Web Components
- **Performance maximale** : Compilation AOT ultra-optimisée
- **TypeScript 5.6-5.7** : Support des dernières fonctionnalités
- **Node.js 22** : Support officiel de Node.js 22

## Prérequis

### Versions requises
- Node.js : >=18.19.1 || >=20.11.1 || >=22.0.0
- TypeScript : >=5.6.0 <5.8.0
- Zone.js : ^0.16.0

### Préparation

1. **Sauvegarde du projet**
```bash
git checkout -b migration/angular-20
git add -A
git commit -m "chore: pre-Angular20 migration backup"
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
npm install -g @angular/cli@20
```

### Étape 2 : Mise à jour des dépendances

```bash
ng update @angular/core@20 @angular/cli@20
```

### Étape 3 : Mise à jour des dépendances tierces

```bash
ng update @angular/material@20
ng update @angular/cdk@20
ng update @angular/pwa@20
```

### Étape 4 : Migration automatique

```bash
ng update @angular/core@20 --migrate-only
```

## Changements majeurs (Breaking Changes)

### 1. Compilation AOT uniquement

Angular 20 supprime complètement le mode JIT :

```typescript
// angular.json
{
  "projects": {
    "app": {
      "architect": {
        "build": {
          "options": {
            "aot": true, // Toujours true, option dépréciée
            "buildOptimizer": true
          }
        }
      }
    }
  }
}
```

### 2. Signals obligatoires pour les nouveaux composants

```typescript
// Les composants doivent utiliser les Signals
@Component({
  selector: 'app-user',
  template: `
    <h1>{{ user().name }}</h1>
    <p>{{ userAge() }}</p>
  `
})
export class UserComponent {
  user = signal({ name: 'John', birthYear: 1990 });
  
  // Computed signal obligatoire pour les valeurs dérivées
  userAge = computed(() => {
    return new Date().getFullYear() - this.user().birthYear;
  });
}
```

### 3. Nouvelle API de routage

```typescript
// Nouveau système de routage avec Signals
import { Router, NavigationSignal } from '@angular/router';

@Component({})
export class AppComponent {
  private router = inject(Router);
  
  // Signal pour l'état de navigation
  navigationState = this.router.navigationSignal;
  
  // Effet automatique sur les changements de route
  constructor() {
    effect(() => {
      const state = this.navigationState();
      console.log('Navigation vers:', state.url);
    });
  }
}
```

### 4. Web Components natifs

```typescript
// Création de Web Components Angular
import { createCustomElement } from '@angular/elements';

@Component({
  selector: 'my-element',
  template: '<h1>{{ title() }}</h1>',
  encapsulation: ViewEncapsulation.ShadowDom
})
export class MyElementComponent {
  title = signal('Hello Web Component!');
}

// Enregistrement automatique
const MyElement = createCustomElement(MyElementComponent, { 
  injector,
  strategyFactory: new SignalStrategyFactory()
});
customElements.define('my-element', MyElement);
```

## Nouvelles fonctionnalités

### 1. IA intégrée pour l'optimisation

```typescript
// angular.json
{
  "projects": {
    "app": {
      "architect": {
        "build": {
          "options": {
            "optimization": {
              "ai": {
                "enabled": true,
                "bundleOptimization": true,
                "codeGeneration": true,
                "performancePrediction": true
              }
            }
          }
        }
      }
    }
  }
}
```

### 2. Hydratation partielle avancée

```typescript
@Component({
  selector: 'app-product',
  template: `
    <div *ngFor="let product of products()" 
         [hydrateOn]="product.priority">
      {{ product.name }}
    </div>
  `,
  hydration: {
    strategy: 'progressive',
    priority: 'viewport'
  }
})
export class ProductComponent {
  products = signal<Product[]>([]);
}
```

### 3. Compilation incrémentale ultra-rapide

```bash
# Nouveau mode de développement avec compilation incrémentale
ng serve --incremental --turbo
```

### 4. Système de modules fédérés natif

```typescript
// webpack.config.js disparaît, configuration native Angular
{
  "projects": {
    "shell": {
      "architect": {
        "build": {
          "options": {
            "federation": {
              "name": "shell",
              "exposes": {
                "./Component": "./src/app/components/shared.component.ts"
              },
              "remotes": {
                "mfe1": "http://localhost:4201"
              }
            }
          }
        }
      }
    }
  }
}
```

## Optimisations recommandées

### 1. Migration complète vers Signals

```bash
# Migration forcée de tous les composants
ng generate @angular/core:complete-signals-migration --force
```

### 2. Activation de l'IA d'optimisation

```json
{
  "optimization": {
    "ai": {
      "enabled": true,
      "targets": {
        "initialLoad": "< 100kb",
        "fcp": "< 1s",
        "tti": "< 2s"
      }
    }
  }
}
```

### 3. Configuration pour Node.js 22

```json
{
  "engines": {
    "node": ">=22.0.0",
    "npm": ">=10.0.0"
  }
}
```

## Tests et validation

### 1. Tests avec le nouveau runner
```bash
ng test --runner=vitest
```

### 2. Tests de performance IA
```bash
ng performance --ai-analysis
```

### 3. Validation de l'hydratation
```bash
ng serve --ssr --validate-hydration
```

### 4. Analyse de sécurité
```bash
ng security-scan --deep
```

## Checklist de migration

- [ ] Backup du code source
- [ ] Mise à jour vers Node.js 22 (recommandé)
- [ ] ng update @angular/core@20 @angular/cli@20
- [ ] Migration complète vers Signals
- [ ] Activation des optimisations IA
- [ ] Tests unitaires avec nouveau runner
- [ ] Tests e2e passants
- [ ] Validation SSR et hydratation
- [ ] Scan de sécurité
- [ ] Mesure des performances
- [ ] Documentation mise à jour

## Dépannage

### Erreur : "JIT compilation is no longer supported"
Solution : Supprimer toute référence au mode JIT
```typescript
// Supprimer
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// Remplacer par
import { bootstrapApplication } from '@angular/platform-browser';
```

### Erreur : "Signal is required for component property"
Solution : Migrer vers les Signals
```bash
ng generate @angular/core:signal-property-migration
```

### Performance dégradée après migration
Solution : Activer les optimisations IA
```bash
ng config projects.app.architect.build.options.optimization.ai.enabled true
```

## Fonctionnalités dépréciées

- Mode JIT complètement supprimé
- `@ViewChild` sans Signals déprécié
- `ngModel` déprécié en faveur des formulaires Signals
- Modules NgModule optionnels (standalone par défaut)

## Ressources

- [Angular 20 Release Notes](https://blog.angular.io/angular-v20)
- [Guide de migration officiel](https://angular.io/guide/update-to-version-20)
- [IA et optimisations](https://angular.io/guide/ai-optimization)
- [Web Components avec Angular](https://angular.io/guide/elements)