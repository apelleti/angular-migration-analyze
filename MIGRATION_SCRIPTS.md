# Migration Scripts Guide

The `ng-migration-analyzer` generates intelligent migration scripts based on your project's specific needs.

## 🤖 Auto-Generated Scripts

When you run `ngma suggest`, it automatically creates:

### `.ngma/migration.sh`
A custom migration script tailored to your project that:
- Includes pre-migration fixes for dependencies
- Avoids `--force` when possible
- Updates all Angular packages
- Provides clean migration path

## 📋 Available Scripts

### 1. **auto-migration.sh** (Recommended)
```bash
./jenkins/auto-migration.sh
```
- Fully automated analysis and migration
- Generates and executes custom migration script
- Best for CI/CD pipelines

### 2. **simple-migration.sh**
```bash
./jenkins/simple-migration.sh
```
- Direct migration with automatic conflict handling
- Uses `--legacy-peer-deps` if needed
- Minimal configuration

### 3. **clean-migration.sh**
```bash
./jenkins/clean-migration.sh
```
- Resolves conflicts BEFORE migration
- Avoids `--force` flag
- Most thorough approach

### 4. **pre-migration-fix.sh**
```bash
./jenkins/pre-migration-fix.sh
```
- Only fixes conflicts, doesn't migrate
- Useful for testing fixes separately
- Generates executable migration script

## 🔍 How It Works

### Conflict Resolution Strategy

The analyzer detects specific conflicts and generates targeted fixes:

```bash
# Example: TypeScript version conflict
npm install typescript@~5.4.0 --save-dev

# Example: RxJS version conflict  
npm install rxjs@^7.8.0 --save

# Example: Zone.js version conflict
npm install zone.js@~0.14.0 --save
```

### Migration Without --force

By fixing dependencies first, we can run:
```bash
ng update @angular/core@18 @angular/cli@18 --allow-dirty
```

Instead of:
```bash
ng update @angular/core@18 @angular/cli@18 --allow-dirty --force
```

## 📊 Script Selection Guide

| Scenario | Recommended Script |
|----------|-------------------|
| Jenkins/CI pipeline | `auto-migration.sh` |
| Quick migration | `simple-migration.sh` |
| Complex project | `clean-migration.sh` |
| Test fixes only | `pre-migration-fix.sh` |
| Custom needs | Use generated `.ngma/migration.sh` |

## 🎯 Best Practices

1. **Always analyze first**
   ```bash
   ngma scan
   ngma suggest
   ```

2. **Review generated script**
   ```bash
   cat .ngma/migration.sh
   ```

3. **Create backup branch**
   ```bash
   git checkout -b angular-migration-backup
   ```

4. **Test thoroughly**
   ```bash
   npm run build
   npm test
   ```

## 🛠️ Customization

The generated script can be customized:

```bash
# Edit the generated script
nano .ngma/migration.sh

# Add custom steps
echo "npm run lint" >> .ngma/migration.sh
```

## 📝 Example Output

```bash
$ ./jenkins/auto-migration.sh

=== Automated Angular Migration ===

Installing ng-migration-analyzer...
Analyzing project...
Generating migration plan...

Analysis Summary:
  Current: Angular 17
  Target: Angular 18  
  Conflicts: 3

Executing generated migration script...
Fixing dependencies before migration...
npm install typescript@~5.4.0 --save-dev
npm install rxjs@^7.8.0 --save
npm install zone.js@~0.14.0 --save

Running Angular migration...
ng update @angular/core@18 @angular/cli@18 --allow-dirty

Migration complete!
```

## 🚨 Troubleshooting

If migration fails:

1. Check `.ngma/suggestions.md` for manual fixes
2. Review build errors and apply suggested changes
3. Use `--force` as last resort:
   ```bash
   ng update @angular/core@18 @angular/cli@18 --force
   ```

## 🔗 Related Documentation

- [CI/CD Integration Guide](CI_CD_INTEGRATION.md)
- [Jenkins Guide](jenkins/JENKINS_GUIDE.md)
- [README](README.md)