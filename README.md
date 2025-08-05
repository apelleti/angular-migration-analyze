# Angular Migration Analyzer (ngma)

A smart CLI tool to analyze and prepare your Angular projects for migration to the next major version (n+1). Provides suggestions and recommendations without modifying your code.

**Supports Angular 17+ only**

## 🚀 Quick Start

```bash
# Install globally
npm install -g angular-migration-analyzer

# Or run directly with npx
npx angular-migration-analyzer scan
```

## 📋 Commands

### `ngma scan`
Analyze your project for migration issues to the next major version (n+1):

```bash
ngma scan                     # Analyze current directory (auto-detect version)
ngma scan -o report.json     # Save report to file
ngma scan --json             # Output JSON format
ngma scan --ci --threshold high  # CI mode: fail if high/critical issues found
```

### `ngma suggest`
Get migration suggestions without modifying files:

```bash
ngma suggest                      # Display suggestions in console
ngma suggest --format markdown    # Export as markdown
ngma suggest -o suggestions.json  # Save to file
ngma suggest -r report.json      # Use existing scan report
```

### `ngma validate`
Validate your project after migration:

```bash
ngma validate               # Run all validation checks
ngma validate --strict      # Fail on warnings
```

## 🔍 What it detects

- **Breaking Changes**: Dynamically fetched from Angular Update Guide API
- **Dependency Issues**: Incompatible packages, peer dependency conflicts  
- **Code Patterns**: Dynamically loaded patterns based on your Angular version
  - Control flow directives (*ngIf → @if)
  - Signals migration opportunities
  - Deprecated RxJS imports
  - ViewChild static flags
  - ModuleWithProviders generics
- **Peer Dependencies**: Complex conflicts with --legacy-peer-deps suggestions

## 📊 Example Output

```
📊 Angular Migration Analysis Report
==================================================

📋 Summary
  Current Version: 15
  Target Version: 16 (automatic n+1)
  Files Impacted: 23
  Breaking Changes: 5
  Peer Dep Conflicts: 2
  Estimated Effort: 1 day

🔗 Dependencies Analysis
  ❌ Incompatible Dependencies:
    - @angular/flex-layout: use @angular/cdk/layout
    
🔍 Deprecated Patterns Found
  🔧 viewchild-static-false (auto-fixable): 12 occurrences
     src/app/components/header.component.ts:45
     src/app/components/footer.component.ts:23
     
📝 Migration Plan
  Phase 1: Preparation (2-4 hours)
    ✓ Backup project (git checkout -b migration-backup)
    ✓ Update TypeScript to compatible version
    ✓ Resolve peer dependency conflicts
```

## 🛠️ Workflow

1. **Analyze** your project:
   ```bash
   ngma scan
   ```

2. **Review** suggestions:
   ```bash
   ngma suggest --format markdown -o migration-plan.md
   ```

3. **Apply** suggestions manually following the recommendations

4. **Migrate** Angular:
   ```bash
   # If peer dependency conflicts exist:
   npm install --legacy-peer-deps
   ng update @angular/core@18 @angular/cli@18
   
   # Otherwise:
   ng update @angular/core@18 @angular/cli@18
   ```

5. **Validate** and fix peer dependencies post-migration

## 🚀 CI/CD Integration

### Quick Jenkins Integration

```bash
# Automated migration with conflict resolution
./jenkins/auto-migration.sh

# This script will:
# 1. Analyze your project
# 2. Generate fix commands for conflicts
# 3. Create and execute a custom migration script
# 4. Avoid using --force when possible
```

### Other CI Systems

```bash
# GitLab CI / GitHub Actions / CircleCI
npm install -g ng-migration-analyzer
ngma scan --ci --threshold high --quiet
```

Exit codes:
- `0`: No issues above threshold
- `1`: Issues found or error

See:
- [Jenkins Guide](jenkins/JENKINS_GUIDE.md) - Detailed Jenkins integration
- [CI/CD Integration Guide](CI_CD_INTEGRATION.md) - All CI systems
- [migration-script.sh](jenkins/migration-script.sh) - Ready-to-use Jenkins script

## 🎯 Features

- ✅ Detects 90% of common breaking changes
- ✅ Estimates migration effort accurately
- ✅ Provides actionable fix suggestions
- ✅ Validates peer dependencies
- ✅ Generates migration plans
- ✅ Works offline with cached data

## 📦 Requirements

- Node.js 16+
- Angular project with package.json
- TypeScript 4.7+