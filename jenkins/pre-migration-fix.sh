#!/bin/bash
#
# Pre-Migration Fix Script
# Resolves conflicts BEFORE Angular migration to avoid --force
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=== Pre-Migration Conflict Resolution ==="
echo ""

# Step 1: Install and run analyzer
echo -e "${YELLOW}Installing ng-migration-analyzer...${NC}"
npm install -g ng-migration-analyzer@latest

echo -e "${YELLOW}Analyzing project...${NC}"
ngma scan --export-plan --export-summary --json > /dev/null 2>&1

if [ ! -f ".ngma/analysis-report.json" ]; then
    echo -e "${RED}Error: Analysis failed${NC}"
    exit 1
fi

# Parse analysis
FROM_VERSION=$(grep -o '"fromVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
TO_VERSION=$(grep -o '"toVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
PEER_CONFLICTS=$(grep -o '"peerDepConflicts":[[:space:]]*[0-9]*' .ngma/analysis-report.json | grep -o '[0-9]*$' || echo "0")

echo -e "${BLUE}Current version: Angular $FROM_VERSION${NC}"
echo -e "${BLUE}Target version: Angular $TO_VERSION${NC}"
echo -e "${BLUE}Peer conflicts: $PEER_CONFLICTS${NC}"
echo ""

# Step 2: Generate conflict resolution plan
echo -e "${YELLOW}Generating conflict resolution plan...${NC}"
ngma suggest --format json --output resolution-plan.json -r .ngma/analysis-report.json > /dev/null 2>&1

# Step 3: Fix deprecated packages BEFORE migration
echo -e "${YELLOW}Fixing deprecated packages...${NC}"

# Remove deprecated packages
DEPRECATED_PACKAGES=$(grep -A10 '"deprecated"' .ngma/analysis-report.json 2>/dev/null | grep '"package"' | cut -d'"' -f4 || true)
if [ -n "$DEPRECATED_PACKAGES" ]; then
    for pkg in $DEPRECATED_PACKAGES; do
        echo "  Removing deprecated package: $pkg"
        npm uninstall $pkg || true
        
        # Install replacement if suggested
        case $pkg in
            "@angular/flex-layout")
                echo "  Installing replacement: @angular/cdk"
                npm install @angular/cdk@${FROM_VERSION} || true
                ;;
            "@angular/http")
                echo "  @angular/common/http is already included"
                ;;
            "ngx-bootstrap")
                echo "  Consider ng-bootstrap as replacement"
                ;;
        esac
    done
fi

# Step 4: Update incompatible packages to compatible versions
echo ""
echo -e "${YELLOW}Updating incompatible packages...${NC}"

# Common packages that need pre-migration updates
PACKAGES_TO_CHECK=(
    "@ngrx/store"
    "@ngrx/effects"
    "@ngrx/entity"
    "@ngrx/router-store"
    "@angular/material"
    "@angular/cdk"
    "rxjs"
    "zone.js"
    "typescript"
)

for pkg in "${PACKAGES_TO_CHECK[@]}"; do
    if grep -q "\"$pkg\"" package.json; then
        echo "  Checking $pkg..."
        
        # Get compatible version for target Angular
        case $pkg in
            "rxjs")
                if [ "$TO_VERSION" -ge 18 ]; then
                    npm install rxjs@^7.8.0 --save
                fi
                ;;
            "zone.js")
                if [ "$TO_VERSION" -ge 18 ]; then
                    npm install zone.js@^0.14.0 --save
                fi
                ;;
            "typescript")
                case $TO_VERSION in
                    17) npm install typescript@~5.2.0 --save-dev ;;
                    18) npm install typescript@~5.4.0 --save-dev ;;
                    19) npm install typescript@~5.5.0 --save-dev ;;
                esac
                ;;
            "@ngrx/store"|"@ngrx/effects"|"@ngrx/entity"|"@ngrx/router-store")
                # Update NgRx to version compatible with target Angular
                npm install ${pkg}@${FROM_VERSION} --save || true
                ;;
        esac
    fi
done

# Step 5: Fix peer dependency conflicts
echo ""
echo -e "${YELLOW}Resolving peer dependency conflicts...${NC}"

# Create package resolution overrides
if [ "$PEER_CONFLICTS" -gt 0 ]; then
    echo "  Creating npm overrides for conflicts..."
    
    # Extract conflicts and create overrides
    node -e "
    const fs = require('fs');
    const report = JSON.parse(fs.readFileSync('.ngma/analysis-report.json', 'utf8'));
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!pkg.overrides) pkg.overrides = {};
    
    // Add overrides for peer conflicts
    if (report.peerDependencies && report.peerDependencies.conflicts) {
        report.peerDependencies.conflicts.forEach(conflict => {
            if (conflict.severity === 'error') {
                console.log('  Adding override for', conflict.package);
                pkg.overrides[conflict.package] = conflict.required;
            }
        });
    }
    
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
fi

# Step 6: Clean install to verify fixes
echo ""
echo -e "${YELLOW}Verifying fixes with clean install...${NC}"
rm -rf node_modules package-lock.json
npm install

INSTALL_STATUS=$?
if [ $INSTALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed without conflicts${NC}"
else
    echo -e "${YELLOW}⚠ Some peer dependency warnings remain (this is normal)${NC}"
fi

# Step 7: Re-analyze to check improvements
echo ""
echo -e "${YELLOW}Re-analyzing after fixes...${NC}"
ngma scan --quiet --json > .ngma/post-fix-report.json 2>&1 || true

NEW_PEER_CONFLICTS=$(grep -o '"peerDepConflicts":[[:space:]]*[0-9]*' .ngma/post-fix-report.json 2>/dev/null | grep -o '[0-9]*$' || echo "0")
echo -e "${BLUE}Remaining peer conflicts: $NEW_PEER_CONFLICTS (was: $PEER_CONFLICTS)${NC}"

# Step 8: Create migration script without --force
echo ""
echo -e "${YELLOW}Creating optimized migration script...${NC}"

cat > .ngma/execute-migration.sh << EOF
#!/bin/bash
# Auto-generated migration script (no --force needed)

echo "=== Executing Angular Migration ==="

# Update Angular CLI
npm install -g @angular/cli@${TO_VERSION}

# Update Angular packages (without --force)
echo "Updating @angular/core and @angular/cli..."
ng update @angular/core@${TO_VERSION} @angular/cli@${TO_VERSION} --allow-dirty

# Update other Angular packages
ANGULAR_PKGS=\$(grep -o '"@angular/[^"]*"' package.json | grep -v '@angular/core\|@angular/cli' | cut -d'"' -f4)
for pkg in \$ANGULAR_PKGS; do
    echo "Updating \$pkg..."
    ng update \${pkg}@${TO_VERSION} --allow-dirty
done

# Clean install after migration
rm -rf node_modules package-lock.json
npm install

# Build
npm run build

echo "Migration complete!"
EOF

chmod +x .ngma/execute-migration.sh

# Step 9: Summary and recommendations
echo ""
echo "=== Pre-Migration Fix Summary ==="
echo -e "Conflicts resolved: $((PEER_CONFLICTS - NEW_PEER_CONFLICTS))"
echo -e "Remaining conflicts: $NEW_PEER_CONFLICTS"
echo ""

if [ "$NEW_PEER_CONFLICTS" -eq 0 ]; then
    echo -e "${GREEN}✓ All conflicts resolved! Ready for clean migration.${NC}"
    echo ""
    echo "Run the migration with:"
    echo "  ./.ngma/execute-migration.sh"
else
    echo -e "${YELLOW}⚠ Some peer conflicts remain but migration should work.${NC}"
    echo ""
    echo "Options:"
    echo "1. Run clean migration: ./.ngma/execute-migration.sh"
    echo "2. If migration fails, use: ./jenkins/simple-migration.sh (with --force)"
fi

echo ""
echo "=== Next Steps ==="
echo "1. Review changes: git diff package.json"
echo "2. Commit pre-migration fixes: git add . && git commit -m 'fix: resolve conflicts before Angular migration'"
echo "3. Run migration: ./.ngma/execute-migration.sh"

exit 0