# Angular Migration Analyzer (ngma)

A smart CLI tool to analyze and prepare your Angular projects for migration.

## 🚀 Quick Start

```bash
# Install globally
npm install -g angular-migration-analyzer

# Or run directly with npx
npx angular-migration-analyzer scan
```

## 📋 Commands

### `ngma scan`
Analyze your project for migration issues:

```bash
ngma scan                     # Analyze current directory
ngma scan -t 18              # Target Angular 18
ngma scan -o report.json     # Save report to file
ngma scan --json             # Output JSON format
```

### `ngma fix`
Apply automatic fixes for common issues:

```bash
ngma fix --auto-safe         # Apply only safe fixes
ngma fix --dry-run          # Preview changes
ngma fix -r report.json     # Use existing report
```

### `ngma validate`
Validate your project after migration:

```bash
ngma validate               # Run all validation checks
ngma validate --strict      # Fail on warnings
```

## 🔍 What it detects

- **Breaking Changes**: ViewChild static, ModuleWithProviders generics, deprecated imports
- **Dependency Issues**: Incompatible packages, peer dependency conflicts
- **Code Patterns**: Legacy syntax, deprecated APIs, anti-patterns
- **TypeScript Config**: Outdated compiler options

## 📊 Example Output

```
📊 Angular Migration Analysis Report
==================================================

📋 Summary
  Current Version: 15
  Target Version: 16
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

2. **Apply** automatic fixes:
   ```bash
   ngma fix --auto-safe
   ```

3. **Migrate** Angular:
   ```bash
   ng update @angular/core@16 @angular/cli@16
   ```

4. **Validate** the result:
   ```bash
   ngma validate
   ```

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

## 🤝 Contributing

Issues and PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

MIT