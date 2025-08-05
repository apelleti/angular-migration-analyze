#!/bin/bash
#
# Clean Angular Migration Script
# Resolves conflicts first, then migrates WITHOUT --force
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=== Clean Angular Migration (No --force) ==="
echo "Date: $(date)"
echo ""

# Function to check if package exists in package.json
package_exists() {
    grep -q "\"$1\"" package.json
}

# Function to get package version
get_package_version() {
    grep -o "\"$1\":[[:space:]]*\"[^\"]*\"" package.json | cut -d'"' -f4 || echo ""
}

# Step 1: Pre-flight checks
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: No package.json found${NC}"
    exit 1
fi

# Step 2: Install analyzer
echo -e "${YELLOW}Installing ng-migration-analyzer...${NC}"
npm install -g ng-migration-analyzer@latest

# Step 3: Initial analysis
echo -e "${YELLOW}Analyzing project...${NC}"
ngma scan --export-plan --export-summary --json > /dev/null 2>&1

FROM_VERSION=$(grep -o '"fromVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
TO_VERSION=$(grep -o '"toVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
INITIAL_CONFLICTS=$(grep -o '"peerDepConflicts":[[:space:]]*[0-9]*' .ngma/analysis-report.json | grep -o '[0-9]*$' || echo "0")

echo -e "${BLUE}Migration path: Angular $FROM_VERSION → $TO_VERSION${NC}"
echo -e "${BLUE}Initial conflicts: $INITIAL_CONFLICTS${NC}"
echo ""

# Step 4: Create backup branch
BRANCH_NAME="angular-${FROM_VERSION}-to-${TO_VERSION}-clean-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BRANCH_NAME"
echo -e "${GREEN}✓ Created branch: $BRANCH_NAME${NC}"
echo ""

# Step 5: Pre-migration fixes
echo -e "${YELLOW}=== Phase 1: Pre-Migration Fixes ===${NC}"
echo ""

# 5.1: Update TypeScript first (critical for Angular migrations)
echo "Updating TypeScript to compatible version..."
case $TO_VERSION in
    17) TS_VERSION="~5.2.0" ;;
    18) TS_VERSION="~5.4.0" ;;
    19) TS_VERSION="~5.5.0" ;;
    *) TS_VERSION="latest" ;;
esac
npm install typescript@${TS_VERSION} --save-dev
echo -e "${GREEN}✓ TypeScript updated${NC}"

# 5.2: Update RxJS if needed
if package_exists "rxjs"; then
    echo "Updating RxJS..."
    if [ "$TO_VERSION" -ge 18 ]; then
        npm install rxjs@^7.8.0 --save
    elif [ "$TO_VERSION" -eq 17 ]; then
        npm install rxjs@^7.5.0 --save
    fi
    echo -e "${GREEN}✓ RxJS updated${NC}"
fi

# 5.3: Update Zone.js if needed
if package_exists "zone.js"; then
    echo "Updating zone.js..."
    case $TO_VERSION in
        17) npm install zone.js@~0.13.0 --save ;;
        18) npm install zone.js@~0.14.0 --save ;;
        19) npm install zone.js@~0.15.0 --save ;;
    esac
    echo -e "${GREEN}✓ zone.js updated${NC}"
fi

# 5.4: Remove deprecated packages
echo ""
echo "Removing deprecated packages..."
DEPRECATED_PACKAGES=(
    "@angular/flex-layout"
    "@angular/http"
    "angular-in-memory-web-api"
    "@angular/platform-server-dynamic"
)

for pkg in "${DEPRECATED_PACKAGES[@]}"; do
    if package_exists "$pkg"; then
        echo "  Removing: $pkg"
        npm uninstall $pkg
        
        # Add replacements
        case $pkg in
            "@angular/flex-layout")
                echo "  Adding @angular/cdk for layout utilities"
                npm install @angular/cdk@${FROM_VERSION}
                ;;
        esac
    fi
done

# 5.5: Update third-party Angular packages
echo ""
echo "Updating third-party packages..."

# NgRx
if package_exists "@ngrx/store"; then
    echo "  Updating NgRx packages..."
    NGRX_PACKAGES=$(grep -o '"@ngrx/[^"]*"' package.json | cut -d'"' -f2)
    for pkg in $NGRX_PACKAGES; do
        npm install ${pkg}@${FROM_VERSION} || true
    done
fi

# Angular Material
if package_exists "@angular/material"; then
    echo "  Updating Angular Material..."
    npm install @angular/material@${FROM_VERSION} @angular/cdk@${FROM_VERSION}
fi

# 5.6: Fix known problematic packages
echo ""
echo "Fixing known compatibility issues..."

# Jest preset for Angular
if package_exists "jest-preset-angular"; then
    case $TO_VERSION in
        17) npm install jest-preset-angular@^13.0.0 --save-dev ;;
        18) npm install jest-preset-angular@^14.0.0 --save-dev ;;
        19) npm install jest-preset-angular@^14.2.0 --save-dev ;;
    esac
fi

# 5.7: Clean install to validate
echo ""
echo -e "${YELLOW}Validating dependency fixes...${NC}"
rm -rf node_modules package-lock.json
npm install
echo -e "${GREEN}✓ Dependencies validated${NC}"

# Step 6: Re-analyze
echo ""
echo -e "${YELLOW}Re-analyzing after fixes...${NC}"
ngma scan --quiet --json > .ngma/pre-migration-report.json 2>&1
PRE_MIGRATION_CONFLICTS=$(grep -o '"peerDepConflicts":[[:space:]]*[0-9]*' .ngma/pre-migration-report.json | grep -o '[0-9]*$' || echo "0")
echo -e "${BLUE}Conflicts after fixes: $PRE_MIGRATION_CONFLICTS (was: $INITIAL_CONFLICTS)${NC}"

# Step 7: Angular Migration
echo ""
echo -e "${YELLOW}=== Phase 2: Angular Migration ===${NC}"
echo ""

# 7.1: Update Angular CLI
echo "Updating Angular CLI globally..."
npm install -g @angular/cli@${TO_VERSION}
echo -e "${GREEN}✓ CLI updated${NC}"

# 7.2: Core migration
echo ""
echo "Migrating Angular core packages..."
ng update @angular/core@${TO_VERSION} @angular/cli@${TO_VERSION} --allow-dirty

MIGRATION_STATUS=$?
if [ $MIGRATION_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ Core migration successful${NC}"
else
    echo -e "${YELLOW}⚠ Core migration had warnings${NC}"
fi

# 7.3: Additional Angular packages
echo ""
echo "Migrating additional Angular packages..."
ANGULAR_PACKAGES=$(grep -o '"@angular/[^"]*"' package.json | grep -v '@angular/core\|@angular/cli' | cut -d'"' -f2 | sort -u)
for pkg in $ANGULAR_PACKAGES; do
    echo "  Updating $pkg..."
    ng update ${pkg}@${TO_VERSION} --allow-dirty || true
done

# Step 8: Post-migration updates
echo ""
echo -e "${YELLOW}=== Phase 3: Post-Migration Updates ===${NC}"
echo ""

# 8.1: Update third-party packages to new Angular version
if package_exists "@ngrx/store"; then
    echo "Updating NgRx to Angular ${TO_VERSION}..."
    NGRX_PACKAGES=$(grep -o '"@ngrx/[^"]*"' package.json | cut -d'"' -f2)
    for pkg in $NGRX_PACKAGES; do
        npm install ${pkg}@${TO_VERSION} || npm install ${pkg}@latest
    done
fi

if package_exists "@angular/material"; then
    echo "Verifying Angular Material version..."
    npm install @angular/material@${TO_VERSION} @angular/cdk@${TO_VERSION} || true
fi

# 8.2: Final clean install
echo ""
echo -e "${YELLOW}Final installation...${NC}"
rm -rf node_modules package-lock.json
npm install
echo -e "${GREEN}✓ Final installation complete${NC}"

# Step 9: Build and test
echo ""
echo -e "${YELLOW}=== Phase 4: Validation ===${NC}"
echo ""

echo "Building project..."
npm run build
BUILD_STATUS=$?

if [ $BUILD_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
fi

echo ""
echo "Running tests..."
npm test -- --watch=false --browsers=ChromeHeadless 2>/dev/null || TEST_STATUS=$?

if [ "${TEST_STATUS:-0}" -eq 0 ]; then
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠ Some tests failed${NC}"
fi

# Step 10: Final analysis
echo ""
echo -e "${YELLOW}Final migration analysis...${NC}"
ngma scan --quiet --json > .ngma/final-report.json 2>&1
FINAL_CONFLICTS=$(grep -o '"peerDepConflicts":[[:space:]]*[0-9]*' .ngma/final-report.json | grep -o '[0-9]*$' || echo "0")
FINAL_ISSUES=$(grep -o '"filesImpacted":[[:space:]]*[0-9]*' .ngma/final-report.json | grep -o '[0-9]*$' || echo "0")

# Step 11: Generate final report
echo ""
echo "=== Migration Report ==="
echo -e "Migration: Angular ${BLUE}$FROM_VERSION${NC} → ${GREEN}$TO_VERSION${NC}"
echo -e "Branch: $BRANCH_NAME"
echo ""
echo "Conflict Resolution:"
echo -e "  Initial conflicts: $INITIAL_CONFLICTS"
echo -e "  After fixes: $PRE_MIGRATION_CONFLICTS"
echo -e "  Final conflicts: $FINAL_CONFLICTS"
echo ""
echo "Build Status:"
echo -e "  Build: $([ $BUILD_STATUS -eq 0 ] && echo -e "${GREEN}✓ Success${NC}" || echo -e "${RED}✗ Failed${NC}")"
echo -e "  Tests: $([ "${TEST_STATUS:-0}" -eq 0 ] && echo -e "${GREEN}✓ Passed${NC}" || echo -e "${YELLOW}⚠ Failed${NC}")"
echo -e "  Code issues: $FINAL_ISSUES"
echo ""

# Success message
if [ $BUILD_STATUS -eq 0 ] && [ $FINAL_CONFLICTS -eq 0 ]; then
    echo -e "${GREEN}🎉 Clean migration completed successfully!${NC}"
    echo "No --force or --legacy-peer-deps needed!"
else
    echo -e "${YELLOW}⚠ Migration completed with some issues${NC}"
    echo "Review .ngma/suggestions.md for fixes"
fi

echo ""
echo "Next steps:"
echo "1. Review changes: git diff"
echo "2. Test application manually"
echo "3. Commit: git add . && git commit -m 'chore: migrate to Angular ${TO_VERSION}'"
echo "4. Push and create PR: git push -u origin $BRANCH_NAME"

exit $BUILD_STATUS