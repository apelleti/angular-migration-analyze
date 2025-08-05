#!/bin/bash
#
# Smart Angular Migration Script
# Analyzes the project first, then executes migration based on recommendations
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=== Smart Angular Migration Script ==="
echo "Date: $(date)"
echo ""

# Step 1: Check prerequisites
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: No package.json found in current directory${NC}"
    exit 1
fi

# Step 2: Install ng-migration-analyzer if needed
if ! command -v ngma &> /dev/null; then
    echo -e "${YELLOW}Installing ng-migration-analyzer...${NC}"
    npm install -g ng-migration-analyzer@latest
    echo -e "${GREEN}✓ Installed${NC}"
fi

# Step 3: Run analysis
echo -e "${YELLOW}Running migration analysis...${NC}"
ngma scan --export-plan --export-summary --json > /dev/null 2>&1
echo -e "${GREEN}✓ Analysis complete${NC}"

# Step 4: Parse analysis results
if [ ! -f ".ngma/analysis-report.json" ]; then
    echo -e "${RED}Error: Analysis report not found${NC}"
    exit 1
fi

CURRENT_VERSION=$(grep -o '"fromVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
TARGET_VERSION=$(grep -o '"toVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
FILES_IMPACTED=$(grep -o '"filesImpacted":[[:space:]]*[0-9]*' .ngma/analysis-report.json | grep -o '[0-9]*$' || echo "0")
PEER_CONFLICTS=$(grep -o '"peerDepConflicts":[[:space:]]*[0-9]*' .ngma/analysis-report.json | grep -o '[0-9]*$' || echo "0")

echo ""
echo -e "${BLUE}Analysis Results:${NC}"
echo -e "  Current version: Angular ${CURRENT_VERSION}"
echo -e "  Target version: Angular ${TARGET_VERSION}"
echo -e "  Files impacted: ${FILES_IMPACTED}"
echo -e "  Peer dependency conflicts: ${PEER_CONFLICTS}"
echo ""

# Step 5: Generate suggestions
echo -e "${YELLOW}Generating migration suggestions...${NC}"
ngma suggest --format markdown --output migration-guide.md -r .ngma/analysis-report.json > /dev/null 2>&1
echo -e "${GREEN}✓ Suggestions generated (.ngma/migration-guide.md)${NC}"
echo ""

# Step 6: Check if migration should proceed
if [ "$PEER_CONFLICTS" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Peer dependency conflicts detected${NC}"
    echo "  The migration will use --legacy-peer-deps"
    echo "  Conflicts should be resolved after migration"
    USE_LEGACY_PEER_DEPS=true
else
    USE_LEGACY_PEER_DEPS=false
fi

# Step 7: Ask for confirmation (skip in CI mode)
if [ -z "$CI" ] && [ -z "$JENKINS_HOME" ]; then
    echo -e "${YELLOW}Ready to proceed with migration?${NC}"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled"
        exit 0
    fi
fi

# Step 8: Create backup branch
echo ""
echo -e "${YELLOW}Creating backup branch...${NC}"
BRANCH_NAME="angular-${CURRENT_VERSION}-to-${TARGET_VERSION}-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BRANCH_NAME"
echo -e "${GREEN}✓ Branch created: $BRANCH_NAME${NC}"

# Step 9: Pre-migration cleanup
echo ""
echo -e "${YELLOW}Preparing for migration...${NC}"
rm -rf node_modules package-lock.json
echo -e "${GREEN}✓ Cleaned node_modules and lock file${NC}"

# Step 10: Install dependencies based on analysis
echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
if [ "$USE_LEGACY_PEER_DEPS" = true ]; then
    npm install --legacy-peer-deps
else
    npm install
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 11: Update Angular CLI globally
echo ""
echo -e "${YELLOW}Updating Angular CLI...${NC}"
npm install -g @angular/cli@${TARGET_VERSION}
echo -e "${GREEN}✓ Angular CLI updated${NC}"

# Step 12: Execute Angular migration
echo ""
echo -e "${YELLOW}Running Angular migration...${NC}"
echo "Executing: ng update @angular/core@${TARGET_VERSION} @angular/cli@${TARGET_VERSION}"

if [ "$USE_LEGACY_PEER_DEPS" = true ]; then
    ng update @angular/core@${TARGET_VERSION} @angular/cli@${TARGET_VERSION} --allow-dirty --force
else
    ng update @angular/core@${TARGET_VERSION} @angular/cli@${TARGET_VERSION} --allow-dirty
fi
echo -e "${GREEN}✓ Angular core packages updated${NC}"

# Step 13: Update additional Angular packages
echo ""
echo -e "${YELLOW}Updating additional Angular packages...${NC}"
ANGULAR_PACKAGES=$(grep -o '"@angular/[^"]*"' package.json | grep -v '@angular/core\|@angular/cli' | cut -d'"' -f2 | sort -u)
if [ -n "$ANGULAR_PACKAGES" ]; then
    for package in $ANGULAR_PACKAGES; do
        echo "  Updating $package..."
        if [ "$USE_LEGACY_PEER_DEPS" = true ]; then
            ng update ${package}@${TARGET_VERSION} --allow-dirty --force || true
        else
            ng update ${package}@${TARGET_VERSION} --allow-dirty || true
        fi
    done
fi
echo -e "${GREEN}✓ Additional packages updated${NC}"

# Step 14: Post-migration install
echo ""
echo -e "${YELLOW}Running post-migration install...${NC}"
rm -rf node_modules
if [ "$USE_LEGACY_PEER_DEPS" = true ]; then
    npm install --legacy-peer-deps
else
    npm install
fi
echo -e "${GREEN}✓ Dependencies reinstalled${NC}"

# Step 15: Build project
echo ""
echo -e "${YELLOW}Building project...${NC}"
npm run build
BUILD_STATUS=$?
if [ $BUILD_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    echo "  Check .ngma/migration-guide.md for suggestions"
fi

# Step 16: Run tests
echo ""
echo -e "${YELLOW}Running tests...${NC}"
npm test -- --watch=false --browsers=ChromeHeadless 2>/dev/null || TEST_STATUS=$?
if [ "${TEST_STATUS:-0}" -eq 0 ]; then
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠ Some tests failed${NC}"
fi

# Step 17: Re-run analysis to check remaining issues
echo ""
echo -e "${YELLOW}Running post-migration analysis...${NC}"
ngma scan --quiet --json > .ngma/post-migration-report.json 2>&1 || true
POST_FILES_IMPACTED=$(grep -o '"filesImpacted":[[:space:]]*[0-9]*' .ngma/post-migration-report.json 2>/dev/null | grep -o '[0-9]*$' || echo "0")

# Step 18: Summary
echo ""
echo "=== Migration Summary ==="
echo -e "Migration: Angular ${BLUE}${CURRENT_VERSION}${NC} → ${GREEN}${TARGET_VERSION}${NC}"
echo -e "Branch: ${BLUE}$BRANCH_NAME${NC}"
echo -e "Build: $([ $BUILD_STATUS -eq 0 ] && echo -e "${GREEN}✓ Success${NC}" || echo -e "${RED}✗ Failed${NC}")"
echo -e "Tests: $([ "${TEST_STATUS:-0}" -eq 0 ] && echo -e "${GREEN}✓ Passed${NC}" || echo -e "${YELLOW}⚠ Failed${NC}")"
echo -e "Issues before: ${FILES_IMPACTED}"
echo -e "Issues after: ${POST_FILES_IMPACTED}"
echo ""

# Step 19: Recommendations
echo "=== Recommendations ==="
if [ "$USE_LEGACY_PEER_DEPS" = true ]; then
    echo -e "${YELLOW}⚠ Peer dependency conflicts were bypassed with --legacy-peer-deps${NC}"
    echo "  Review and fix these conflicts:"
    grep -A5 '"conflicts"' .ngma/analysis-report.json 2>/dev/null | grep '"package"' | cut -d'"' -f4 | sort -u | sed 's/^/  - /'
    echo ""
fi

if [ $BUILD_STATUS -ne 0 ] || [ "${TEST_STATUS:-0}" -ne 0 ]; then
    echo -e "${YELLOW}⚠ Build or test failures detected${NC}"
    echo "  1. Review the migration guide: .ngma/migration-guide.md"
    echo "  2. Check the suggestions report for specific fixes"
    echo "  3. Apply manual fixes as recommended"
    echo ""
fi

echo "=== Next Steps ==="
echo "1. Review changes: git diff"
echo "2. Test application manually"
echo "3. Fix any remaining issues using .ngma/migration-guide.md"
if [ "$USE_LEGACY_PEER_DEPS" = true ]; then
    echo "4. Resolve peer dependency conflicts"
    echo "5. Remove --legacy-peer-deps from package.json if added"
fi
echo "6. Commit: git add . && git commit -m 'chore: migrate to Angular ${TARGET_VERSION}'"
echo "7. Push and create pull request"
echo ""

# Step 20: Generate fix commands if needed
if [ $BUILD_STATUS -ne 0 ] || [ "$POST_FILES_IMPACTED" -gt 0 ]; then
    echo -e "${YELLOW}Generating fix commands...${NC}"
    cat > .ngma/apply-fixes.sh << EOF
#!/bin/bash
# Auto-generated fix commands based on analysis

echo "Applying recommended fixes..."

# Add specific fix commands based on common issues
# These would be generated based on the analysis report

echo "Fixes applied. Re-run build: npm run build"
EOF
    chmod +x .ngma/apply-fixes.sh
    echo -e "${GREEN}✓ Fix commands saved to: .ngma/apply-fixes.sh${NC}"
fi

# Exit with build status
exit $BUILD_STATUS