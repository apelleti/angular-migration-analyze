# Migration Angular 17 vers 18

Ce guide détaille le processus de migration d'Angular 17 vers Angular 18.

## 🎯 Changements majeurs

### 1. Zoneless Change Detection (Developer Preview)
Angular 18 introduit la détection de changements sans Zone.js.

```typescript
// app.config.ts
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    // autres providers
  ]
};
```

### 2. Built-in Control Flow (Optimisé)
Améliorations significatives des performances du control flow.

```html
<!-- Nouveau : @let pour les variables locales -->
@let name = user.firstName + ' ' + user.lastName;
@let isLoggedIn = user.status === 'active';

@if (isLoggedIn) {
  <p>Bienvenue, {{ name }}!</p>
}
```

### 3. Material 3 Design Support
Support complet de Material Design 3.

```typescript
// Nouvelle API Material 3
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideMaterial3 } from '@angular/material/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    provideMaterial3()
  ]
};
```

### 4. Improved Debugging Experience
DevTools améliorés avec profiling avancé.

```typescript
// Nouveau service de debugging
import { inject, ApplicationRef } from '@angular/core';

const appRef = inject(ApplicationRef);
appRef.profiler.timeChangeDetection(); // Mesure les performances
```

## 📋 Étapes de migration

### 1. Préparation et analyse

```bash
# Analyser le projet actuel
ng-migrate analyze --verbose

# Créer une branche de migration
git checkout -b migration/angular-18

# Backup complet
git add -A
git commit -m "chore: pre-Angular18 migration backup"
```

### 2. Mise à jour des prérequis

Angular 18 requiert :
- Node.js : 18.19.0 ou 20.9.0+
- TypeScript : 5.4.0 ou supérieur

```bash
# Vérifier Node.js
node --version  # >= 18.19.0

# Installer la bonne version si nécessaire
nvm install 20.9.0
nvm use 20.9.0
```

### 3. Mise à jour Angular

```bash
# Mettre à jour CLI globalement
npm install -g @angular/cli@18

# Mettre à jour le projet
ng update @angular/core@18 @angular/cli@18

# Si vous utilisez Material
ng update @angular/material@18
```

### 4. Migrations automatiques

```bash
# Appliquer toutes les migrations
ng update @angular/core@18 --migrate-only
```

## 🔧 Changements de configuration

### angular.json

```json
{
  "projects": {
    "app": {
      "architect": {
        "build": {
          "options": {
            // Nouvelle option pour le debugging
            "sourceMapScripts": true,
            // Optimisation améliorée
            "optimization": {
              "scripts": true,
              "styles": {
                "minify": true,
                "inlineCritical": true
              },
              "fonts": true
            },
            // Support expérimental zoneless
            "polyfills": [] // Zone.js optionnel
          }
        }
      }
    }
  },
  "cli": {
    "analytics": false,
    "cache": {
      "enabled": true,
      "environment": "all",
      "persistent": true
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
    "lib": ["ES2023", "dom", "dom.iterable"],
    "useDefineForClassFields": false,
    "experimentalDecorators": true,
    // Nouvelles options pour Angular 18
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## 🚨 Points d'attention

### 1. Migration vers Zoneless (Optionnel)

```typescript
// main.ts pour zoneless
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    // Remplacer les timers par des versions Angular
    provideAngularTimers()
  ]
});
```

### 2. Signals Everywhere
Adoption complète des Signals recommandée :

```typescript
// Component avec Signals
@Component({
  template: `
    <h1>{{ title() }}</h1>
    <p>Count: {{ count() }}</p>
    <button (click)="increment()">+</button>
  `
})
export class CounterComponent {
  title = signal('Counter App');
  count = signal(0);
  
  increment() {
    this.count.update(v => v + 1);
  }
  
  // Computed signals
  doubleCount = computed(() => this.count() * 2);
}
```

### 3. Nouvelle API HttpClient

```typescript
// Utilisation des intercepteurs fonctionnels
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};

// Configuration
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withFetch() // Utilise fetch() au lieu de XMLHttpRequest
    )
  ]
};
```

### 4. Improved Forms

```typescript
// Typed Reactive Forms avec validation
interface UserForm {
  email: FormControl<string>;
  age: FormControl<number>;
}

export class UserComponent {
  form = new FormGroup<UserForm>({
    email: new FormControl('', {
      validators: [Validators.required, Validators.email],
      nonNullable: true
    }),
    age: new FormControl(0, {
      validators: [Validators.min(18)],
      nonNullable: true
    })
  });
}
```

## 🔍 Vérifications post-migration

### 1. Performance Benchmarks

```bash
# Mesurer les performances de build
time ng build --configuration production

# Analyser les bundles
ng build --configuration production --stats-json
npx webpack-bundle-analyzer dist/*/stats.json
```

### 2. Tests complets

```bash
# Tests unitaires avec nouveau runner
ng test --browsers=ChromeHeadless

# Tests E2E
ng e2e

# Tests de performance
ng test --performance
```

### 3. Vérification SSR/SSG

```bash
# Si SSR est utilisé
npm run build:ssr
npm run serve:ssr

# Vérifier l'hydratation
# Ouvrir DevTools > Console et chercher des erreurs d'hydratation
```

## 💡 Nouvelles fonctionnalités à adopter

### 1. @let dans les templates

```html
<!-- Calculs complexes une seule fois -->
@let totalPrice = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
@let hasDiscount = totalPrice > 100;

<div class="cart">
  <p>Total: {{ totalPrice | currency }}</p>
  @if (hasDiscount) {
    <p class="discount">10% de réduction appliquée!</p>
    @let finalPrice = totalPrice * 0.9;
    <p>Prix final: {{ finalPrice | currency }}</p>
  }
</div>
```

### 2. Improved Deferred Loading

```html
@defer (on interaction; prefetch on idle) {
  <heavy-component />
} @loading (minimum 200ms) {
  <skeleton-loader />
} @error {
  <error-message />
}
```

### 3. Enhanced Developer Experience

```typescript
// Nouveau service de debugging
@Component({})
export class DebugComponent {
  private debugService = inject(DebugService);
  
  ngOnInit() {
    // En développement uniquement
    if (isDevMode()) {
      this.debugService.logComponentTree();
      this.debugService.enableChangeDetectionProfiling();
    }
  }
}
```

## 📊 Checklist de migration

- [ ] Backup complet du projet
- [ ] Node.js >= 18.19.0 ou 20.9.0+
- [ ] TypeScript >= 5.4.0
- [ ] ng update @angular/core@18 @angular/cli@18
- [ ] Migration Material 3 (si applicable)
- [ ] Tests de zoneless mode (optionnel)
- [ ] Migration vers Signals (recommandé)
- [ ] Tests unitaires passent
- [ ] Tests E2E validés
- [ ] Build de production optimisé
- [ ] Performance benchmarks satisfaisants
- [ ] Pas d'erreurs d'hydratation (SSR)

## 🆘 Problèmes courants

### Erreur : "NG0955: Input signals cannot be accessed in effects"

```typescript
// Problème
effect(() => {
  console.log(this.inputSignal()); // Erreur
});

// Solution
private inputValue = toSignal(this.inputSignal);
effect(() => {
  console.log(this.inputValue());
});
```

### Problème avec Zone.js en mode zoneless

```typescript
// Remplacer setTimeout/setInterval
import { interval, timer } from 'rxjs';

// Avant
setTimeout(() => {}, 1000);

// Après
timer(1000).subscribe(() => {});
```

### Erreurs de types avec les nouvelles APIs

```bash
# Nettoyer et reconstruire
rm -rf node_modules .angular dist
npm ci
ng build
```

## 🚀 Optimisations recommandées

### 1. Partial Hydration (Experimental)

```typescript
@Component({
  selector: 'app-heavy',
  template: `...`,
  // Nouvelle option pour hydratation partielle
  hydration: {
    strategy: 'partial',
    triggers: ['viewport', 'interaction']
  }
})
```

### 2. Fine-grained Change Detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Nouveau : signals pour un contrôle fin
  signals: true
})
export class OptimizedComponent {
  // Les changements ne déclenchent que les mises à jour nécessaires
  data = signal<Data[]>([]);
}
```

### 3. Build Optimizations

```json
// angular.json
{
  "optimization": {
    "scripts": true,
    "styles": {
      "minify": true,
      "inlineCritical": true,
      "removeUnusedCss": true
    },
    "fonts": {
      "inline": true
    }
  }
}
```

## 📚 Ressources

- [Angular 18 Release Notes](https://blog.angular.io/angular-v18-is-now-available)
- [Zoneless Angular Guide](https://angular.io/guide/zoneless)
- [Signals Deep Dive](https://angular.io/guide/signals)
- [Material 3 Migration](https://material.angular.io/guide/material-3)

## Performance Metrics

Améliorations typiques après migration :
- Build time: -30% à -50%
- Bundle size: -10% à -20%
- Runtime performance: +20% à +40%
- Memory usage: -15% à -25%

## Prochaines étapes

- [Migration Angular 18 vers 19](angular-18-to-19.md)
- [Migration Monorepo](monorepo-migration.md)
- [Intégration CI/CD](ci-cd-integration.md)
- [Optimisation des performances](../optimization/performance.md)