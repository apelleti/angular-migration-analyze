# Angular Migration Summary

**Project:** angular-test-project
**Migration:** Angular 17 → 18

## Summary

- **Files Impacted:** 3
- **Breaking Changes:** 0
- **Peer Dependency Conflicts:** 6

## Deprecated Patterns Found

### ⚠️ structural-directives

**Occurrences:** 1
**Description:** Consider migrating to new control flow syntax (@if, @for, @switch)

**Locations:**
- `angular-test-project/src/app/app.component.ts:11`

### ⚠️ viewchild-static-false

**Occurrences:** 2
**Description:** ViewChild with static: false is now the default

**Locations:**
- `angular-test-project/src/app/app.component.ts:66`
- `angular-test-project/src/app/app.component.ts:67`

## Peer Dependency Conflicts

### ⚠️ Incompatible Packages

The following packages are incompatible with your current Angular version and must be addressed before migration:

#### @angular/flex-layout

This package requires Angular 15.0.0 but your project uses Angular 17.

**Recommended Action:** Replace with @angular/cdk/layout
- [Migration Guide](https://github.com/angular/flex-layout/wiki/Using-Angular-CDK-Layout)

### Other Dependency Conflicts

#### 1. zone.js

**Required:** ~0.14.0
**Installed:** 0.13.3
**Resolution:** Update zone.js from 0.13.3 to ~0.14.0

#### 2. @angular/localize

**Required:** ^17.0.0
**Installed:** not installed
**Resolution:** npm install @angular/localize@^17.0.0

#### 3. @angular/service-worker

**Required:** ^17.0.0
**Installed:** not installed
**Resolution:** npm install @angular/service-worker@^17.0.0

#### 4. @angular/platform-server

**Required:** ^17.0.0
**Installed:** not installed
**Resolution:** npm install @angular/platform-server@^17.0.0

