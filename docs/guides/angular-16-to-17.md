# Migration Angular 16 vers 17

Ce guide détaille le processus de migration d'Angular 16 vers Angular 17.

## 🎯 Changements majeurs

### 1. Nouveau Logo et Branding
Angular 17 marque une renaissance avec un nouveau logo et une nouvelle identité visuelle.

### 2. Vite et esbuild par défaut
Angular 17 utilise Vite pour le dev server et esbuild pour les builds.

```json
// angular.json
{
  "projects": {
    "app": {
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/app",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.app.json"
          }
        }
      }
    }
  }
}
```

### 3. Nouveau Control Flow (Stable)
Le nouveau control flow devient stable et recommandé.

```html
<!-- Syntaxe complète disponible -->
@if (user.isAdmin) {
  <admin-panel />
} @else if (user.isModerator) {
  <moderator-panel />
} @else {
  <user-panel />
}

@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
} @empty {
  <li>Aucun élément</li>
}

@switch (userType) {
  @case ('admin') {
    <admin-view />
  }
  @case ('user') {
    <user-view />
  }
  @default {
    <guest-view />
  }
}
```

### 4. Deferred Loading
Nouvelle fonctionnalité pour le chargement différé.

```html
@defer {
  <large-component />
} @loading {
  <loading-spinner />
} @error {
  <p>Erreur de chargement</p>
} @placeholder {
  <p>Cliquez pour charger</p>
}

<!-- Avec conditions -->
@defer (on viewport) {
  <heavy-content />
}

@defer (when isVisible) {
  <dynamic-content />
}
```

### 5. Server-Side Rendering (SSR) amélioré
SSR devient plus simple avec la nouvelle configuration.

```bash
# Ajouter SSR à un projet existant
ng add @angular/ssr
```

## 📋 Étapes de migration

### 1. Préparation

```bash
# Analyser le projet
ng-migrate analyze

# Créer une branche de migration
git checkout -b migration/angular-17

# Sauvegarder l'état actuel
git add -A
git commit -m "chore: pre-Angular17 migration backup"
```

### 2. Mise à jour des dépendances

```bash
# Mettre à jour Angular CLI globalement
npm install -g @angular/cli@17

# Mettre à jour le projet
ng update @angular/core@17 @angular/cli@17
```

### 3. Migration vers le nouveau builder

```bash
# Migration automatique vers le nouveau builder
ng update @angular/cli --migrate-only --name=use-application-builder
```

### 4. Node.js et TypeScript

Angular 17 requiert :
- Node.js : 18.13.0 ou supérieur
- TypeScript : 5.2.0 ou supérieur

```bash
# Vérifier les versions
node --version  # >= 18.13.0
npx tsc --version  # >= 5.2.0

# Mettre à jour TypeScript
npm install typescript@~5.2.0
```

## 🔧 Changements de configuration

### angular.json - Nouveau format

```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "my-app": {
      "projectType": "application",
      "root": "",
      "sourceRoot": "src",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:application",
          "options": {
            "outputPath": "dist/my-app",
            "index": "src/index.html",
            "browser": "src/main.ts",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.app.json",
            "assets": ["src/favicon.ico", "src/assets"],
            "styles": ["src/styles.css"],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kb",
                  "maximumError": "1mb"
                }
              ],
              "outputHashing": "all"
            },
            "development": {
              "optimization": false,
              "extractLicenses": false,
              "sourceMap": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "my-app:build:production"
            },
            "development": {
              "buildTarget": "my-app:build:development"
            }
          },
          "defaultConfiguration": "development"
        }
      }
    }
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022", "dom"],
    "useDefineForClassFields": false,
    "experimentalDecorators": true,
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

## 🚨 Points d'attention

### 1. Migration du Control Flow

```bash
# Migration automatique
ng generate @angular/core:control-flow
```

### 2. Standalone par défaut
Les nouveaux projets utilisent standalone par défaut :

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig);
```

### 3. Inject Function
Utilisation recommandée de `inject()` :

```typescript
// Avant
constructor(private http: HttpClient) {}

// Après (recommandé)
private http = inject(HttpClient);
```

### 4. Input Transforms

```typescript
@Component({...})
export class UserComponent {
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: numberAttribute }) age = 0;
}
```

## 🔍 Vérifications post-migration

### 1. Performance du build

```bash
# Comparer les temps de build
time ng build

# Vérifier la taille des bundles
ls -lah dist/*/
```

### 2. Tests

```bash
# Tests unitaires
ng test

# Tests E2E
ng e2e

# Couverture
ng test --code-coverage
```

### 3. Analyse des dépendances

```bash
# Vérifier la santé du projet
ng-migrate doctor

# Audit de sécurité
npm audit fix
```

## 💡 Nouvelles fonctionnalités à adopter

### 1. Animations avec @defer

```typescript
@Component({
  template: `
    @defer (on interaction) {
      <animated-component />
    } @placeholder {
      <button>Cliquer pour charger</button>
    }
  `
})
```

### 2. View Transitions API

```typescript
@Component({
  animations: [
    trigger('routeAnimations', [
      transition('* <=> *', [
        style({ opacity: 0 }),
        animate('300ms', style({ opacity: 1 }))
      ])
    ])
  ]
})
```

### 3. Improved Hybrid Rendering

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch())
  ]
};
```

## 📊 Checklist de migration

- [ ] Backup complet du projet
- [ ] Node.js >= 18.13.0
- [ ] TypeScript ~5.2.0
- [ ] ng update @angular/core@17 @angular/cli@17
- [ ] Migration vers nouveau builder
- [ ] Migration du control flow
- [ ] Tests unitaires passent
- [ ] Build de production optimisé
- [ ] Performance vérifiée
- [ ] SSR fonctionnel (si applicable)

## 🆘 Problèmes courants

### Erreur avec le nouveau builder

```bash
# Réinitialiser la configuration
ng update @angular/cli --migrate-only --name=use-application-builder --force
```

### Problèmes de compatibilité Zone.js

```typescript
// Vérifier polyfills dans angular.json
"polyfills": ["zone.js"]
```

### Erreurs TypeScript

```bash
# Nettoyer et recompiler
rm -rf dist/ .angular/
ng build --configuration development
```

## 🚀 Optimisations recommandées

### 1. Build Cache

```json
// angular.json
{
  "cli": {
    "cache": {
      "enabled": true,
      "path": ".angular/cache",
      "environment": "all"
    }
  }
}
```

### 2. Preloading Strategy

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'feature',
    loadChildren: () => import('./feature/routes'),
    data: { preload: true }
  }
];

// app.config.ts
providers: [
  provideRouter(routes, withPreloading(PreloadAllModules))
]
```

### 3. Image Optimization

```html
<img ngSrc="hero.jpg" 
     width="1200" 
     height="600" 
     priority
     placeholder
     sizes="(max-width: 768px) 100vw, 50vw">
```

## 📚 Ressources

- [Angular 17 Release Notes](https://blog.angular.io/introducing-angular-v17)
- [Migration Guide Officiel](https://angular.io/guide/update-to-version-17)
- [Nouveau Control Flow](https://angular.io/guide/control-flow)
- [Deferred Loading](https://angular.io/guide/defer)

## Prochaines étapes

- [Migration Angular 17 vers 18](angular-17-to-18.md)
- [Migration Monorepo](monorepo-migration.md)
- [Intégration CI/CD](ci-cd-integration.md)