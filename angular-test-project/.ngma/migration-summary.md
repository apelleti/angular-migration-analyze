# Angular Migration Summary

**Project:** angular-test-project
**Migration:** Angular 18 → 19

## Summary

- **Files Impacted:** 3
- **Breaking Changes:** 5
- **Peer Dependency Conflicts:** 23
- **Estimated Effort:** 6 days

## Deprecated Patterns Found

### 1. structural-directives

**File:** `/home/antoine/dev/angular-migration-analyze/angular-test-project/src/app/app.component.ts`
**Line:** 11
**Description:** Consider migrating to new control flow syntax (@if, @for, @switch)
**Auto-fixable:** ✅ Yes

### 2. viewchild-static-false

**File:** `/home/antoine/dev/angular-migration-analyze/angular-test-project/src/app/app.component.ts`
**Line:** 66
**Description:** ViewChild with static: false is now the default
**Auto-fixable:** ✅ Yes

### 3. viewchild-static-false

**File:** `/home/antoine/dev/angular-migration-analyze/angular-test-project/src/app/app.component.ts`
**Line:** 67
**Description:** ViewChild with static: false is now the default
**Auto-fixable:** ✅ Yes

## Peer Dependency Conflicts

### 1. @angular/core

**Required:** 18.2.0
**Installed:** 18.2.3
**Impact:** undefined

### 2. @angular/core

**Required:** 18.2.0
**Installed:** 18.2.3
**Impact:** undefined

### 3. @angular/common

**Required:** 18.2.0
**Installed:** 18.2.3
**Impact:** undefined

### 4. @angular/core

**Required:** 18.2.0
**Installed:** 18.2.3
**Impact:** undefined

### 5. @angular/common

**Required:** 18.2.0
**Installed:** 18.2.3
**Impact:** undefined

### 6. @angular/animations

**Required:** 18.2.0
**Installed:** 18.2.3
**Impact:** undefined

### 7. @angular/core

**Required:** 18.2.0
**Installed:** 18.2.3
**Impact:** undefined

### 8. @angular/common

**Required:** 18.2.0
**Installed:** 18.2.3
**Impact:** undefined

### 9. @angular/core

**Required:** 18.2.0
**Installed:** 18.2.3
**Impact:** undefined

### 10. @angular/common

**Required:** 18.2.0
**Installed:** 18.2.3
**Impact:** undefined

### 11. @angular/core

**Required:** ^15.0.0
**Installed:** 18.2.3
**Impact:** undefined

### 12. @angular/common

**Required:** ^15.0.0
**Installed:** 18.2.3
**Impact:** undefined

### 13. @angular/core

**Required:** ^15.0.0
**Installed:** 18.2.3
**Impact:** undefined

### 14. jest

**Required:** ^29.5.0
**Installed:** not installed
**Impact:** undefined

### 15. ng-packagr

**Required:** ^18.0.0
**Installed:** not installed
**Impact:** undefined

### 16. protractor

**Required:** ^7.0.0
**Installed:** not installed
**Impact:** undefined

### 17. tailwindcss

**Required:** ^2.0.0 || ^3.0.0
**Installed:** not installed
**Impact:** undefined

### 18. browser-sync

**Required:** ^3.0.2
**Installed:** not installed
**Impact:** undefined

### 19. @web/test-runner

**Required:** ^0.18.0
**Installed:** not installed
**Impact:** undefined

### 20. @angular/localize

**Required:** ^18.0.0
**Installed:** not installed
**Impact:** undefined

### 21. jest-environment-jsdom

**Required:** ^29.5.0
**Installed:** not installed
**Impact:** undefined

### 22. @angular/service-worker

**Required:** ^18.0.0
**Installed:** not installed
**Impact:** undefined

### 23. @angular/platform-server

**Required:** ^18.0.0
**Installed:** not installed
**Impact:** undefined

