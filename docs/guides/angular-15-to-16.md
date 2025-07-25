# Migration Angular 15 vers 16

Ce guide détaille le processus de migration d'Angular 15 vers Angular 16.

## 🎯 Changements majeurs

### 1. Signals (Developer Preview)
Angular 16 introduit les Signals, un nouveau système de réactivité.

```typescript
// Avant (Angular 15)
export class CounterComponent {
  count = 0;
  
  increment() {
    this.count++;
  }
}

// Après (Angular 16)
import { signal } from '@angular/core';

export class CounterComponent {
  count = signal(0);
  
  increment() {
    this.count.update(value => value + 1);
  }
}
```

### 2. Control Flow Standalone (@if, @for, @switch)
Nouvelle syntaxe de contrôle de flux dans les templates.

```html
<!-- Avant -->
<div *ngIf="isVisible">Content</div>
<li *ngFor="let item of items">{{ item }}</li>

<!-- Après -->
@if (isVisible) {
  <div>Content</div>
}
@for (item of items; track item.id) {
  <li>{{ item }}</li>
}
```

### 3. DestroyRef
Nouveau service pour gérer le cycle de vie.

```typescript
// Avant
export class MyComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// Après
export class MyComponent {
  constructor(private destroyRef: DestroyRef) {
    destroyRef.onDestroy(() => {
      // Cleanup logic
    });
  }
}
```

## 📋 Étapes de migration

### 1. Préparation

```bash
# Analyser le projet actuel
ng-migrate analyze

# Sauvegarder l'état actuel
git add -A
git commit -m "feat: pre-Angular16 migration backup"
```

### 2. Mise à jour des dépendances

```bash
# Mettre à jour Angular CLI
npm install -g @angular/cli@16

# Mettre à jour les packages Angular
ng update @angular/core@16 @angular/cli@16
```

### 3. Node.js et TypeScript

Angular 16 requiert :
- Node.js : 16.14.0 ou supérieur
- TypeScript : 4.9.3 à 5.1.x

```bash
# Vérifier les versions
node --version
npx tsc --version

# Mettre à jour si nécessaire
npm install typescript@~5.0.0
```

### 4. Corrections automatiques

```bash
# Appliquer les migrations automatiques
ng update @angular/core@16 --migrate-only

# Vérifier les changements
git diff
```

## 🔧 Changements de configuration

### angular.json

```json
{
  "projects": {
    "my-app": {
      "architect": {
        "build": {
          "options": {
            // Nouvelle option pour les Signals
            "buildOptimizer": true,
            // Support expérimental du nouveau control flow
            "angularCompilerOptions": {
              "enableBlockSyntax": true
            }
          }
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
    // Required for Signals
    "useDefineForClassFields": true,
    "experimentalDecorators": true
  }
}
```

## 🚨 Points d'attention

### 1. Standalone Components
Migration progressive vers les composants standalone :

```typescript
// Composant standalone
@Component({
  selector: 'app-hello',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: '<h1>Hello {{name}}</h1>'
})
export class HelloComponent {
  name = 'Angular 16';
}
```

### 2. Router Configuration
Nouvelle configuration du routeur :

```typescript
// main.ts avec standalone
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding())
  ]
});
```

### 3. HttpClient avec provideHttpClient

```typescript
// Avant
imports: [HttpClientModule]

// Après (standalone)
providers: [provideHttpClient()]
```

## 🔍 Vérifications post-migration

### 1. Tests unitaires

```bash
# Lancer tous les tests
npm test

# Tests avec couverture
npm run test:coverage
```

### 2. Build de production

```bash
# Build production
ng build --configuration production

# Analyser la taille des bundles
npm run analyze
```

### 3. Audit des dépendances

```bash
# Vérifier les peer dependencies
ng-migrate doctor

# Audit de sécurité
npm audit
```

## 💡 Optimisations recommandées

### 1. Lazy Loading avec Standalone Components

```typescript
const routes: Routes = [
  {
    path: 'feature',
    loadComponent: () => import('./feature/feature.component')
      .then(m => m.FeatureComponent)
  }
];
```

### 2. Image Optimization Directive

```html
<!-- Utiliser la nouvelle directive NgOptimizedImage -->
<img ngSrc="hero.jpg" 
     width="300" 
     height="200" 
     priority>
```

### 3. Hydration pour SSR

```typescript
// main.ts
import { provideClientHydration } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration()
  ]
});
```

## 📊 Checklist de migration

- [ ] Backup du projet
- [ ] Mise à jour Node.js >= 16.14.0
- [ ] Mise à jour TypeScript vers ~5.0.0
- [ ] ng update @angular/core@16 @angular/cli@16
- [ ] Résolution des breaking changes
- [ ] Migration vers standalone components (optionnel)
- [ ] Tests unitaires passent
- [ ] Build de production réussi
- [ ] Tests E2E validés
- [ ] Performance vérifiée

## 🆘 Problèmes courants

### Erreur : "Cannot find module '@angular/core'"

```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
```

### Problème de compatibilité TypeScript

```bash
# Forcer la version compatible
npm install typescript@~5.0.0 --save-exact
```

### Erreurs de template avec nouveau control flow

```typescript
// Activer dans angular.json
"angularCompilerOptions": {
  "enableBlockSyntax": true
}
```

## 📚 Ressources

- [Guide officiel Angular 16](https://angular.io/guide/update-to-version-16)
- [Angular Signals RFC](https://github.com/angular/angular/discussions/49685)
- [Standalone Components Guide](https://angular.io/guide/standalone-components)

## Prochaines étapes

- [Migration Angular 16 vers 17](angular-16-to-17.md)
- [Optimisation des performances](../optimization/performance.md)
- [Migration vers Standalone Components](../advanced/standalone-migration.md)