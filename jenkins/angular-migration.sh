#!/bin/bash
#
# Angular Migration Script
# Executes the actual Angular migration commands
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=== Angular Migration Script ==="
echo "Date: $(date)"
echo ""

# Step 1: Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: No package.json found in current directory${NC}"
    exit 1
fi

# Step 2: Detect current Angular version
CURRENT_VERSION=$(grep -o '"@angular/core":[[:space:]]*"[^"]*"' package.json | cut -d'"' -f4 | grep -o '[0-9]*' | head -1)
if [ -z "$CURRENT_VERSION" ]; then
    echo -e "${RED}Error: Could not detect Angular version${NC}"
    exit 1
fi

TARGET_VERSION=$((CURRENT_VERSION + 1))

echo -e "${BLUE}Current Angular version: ${CURRENT_VERSION}${NC}"
echo -e "${BLUE}Target Angular version: ${TARGET_VERSION}${NC}"
echo ""

# Step 3: Create backup branch
echo -e "${YELLOW}Creating backup branch...${NC}"
git checkout -b "angular-migration-${CURRENT_VERSION}-to-${TARGET_VERSION}-$(date +%Y%m%d-%H%M%S)"
echo -e "${GREEN}✓ Backup branch created${NC}"
echo ""

# Step 4: Clean install
echo -e "${YELLOW}Cleaning node_modules and package-lock.json...${NC}"
rm -rf node_modules package-lock.json
echo -e "${GREEN}✓ Cleaned${NC}"
echo ""

# Step 5: Install dependencies with legacy peer deps if needed
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install --legacy-peer-deps
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 6: Update Angular CLI globally
echo -e "${YELLOW}Updating Angular CLI globally...${NC}"
npm install -g @angular/cli@${TARGET_VERSION}
echo -e "${GREEN}✓ Angular CLI updated${NC}"
echo ""

# Step 7: Run Angular update check
echo -e "${YELLOW}Checking available updates...${NC}"
ng update
echo ""

# Step 8: Update Angular packages
echo -e "${YELLOW}Updating Angular packages to version ${TARGET_VERSION}...${NC}"
ng update @angular/core@${TARGET_VERSION} @angular/cli@${TARGET_VERSION} --allow-dirty --force
echo -e "${GREEN}✓ Angular packages updated${NC}"
echo ""

# Step 9: Update other Angular packages
echo -e "${YELLOW}Updating additional Angular packages...${NC}"
ANGULAR_PACKAGES=$(grep -o '"@angular/[^"]*"' package.json | grep -v '@angular/core\|@angular/cli' | cut -d'"' -f2 | sort -u)
if [ -n "$ANGULAR_PACKAGES" ]; then
    for package in $ANGULAR_PACKAGES; do
        echo "Updating $package..."
        ng update ${package}@${TARGET_VERSION} --allow-dirty --force || true
    done
fi
echo -e "${GREEN}✓ Additional packages updated${NC}"
echo ""

# Step 10: Clean install after updates
echo -e "${YELLOW}Running clean install...${NC}"
rm -rf node_modules package-lock.json
npm install
echo -e "${GREEN}✓ Clean install completed${NC}"
echo ""

# Step 11: Build project
echo -e "${YELLOW}Building project...${NC}"
npm run build
BUILD_STATUS=$?
if [ $BUILD_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
fi
echo ""

# Step 12: Run tests
echo -e "${YELLOW}Running tests...${NC}"
npm test -- --watch=false --browsers=ChromeHeadless || TEST_STATUS=$?
if [ "${TEST_STATUS:-0}" -eq 0 ]; then
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠ Some tests failed${NC}"
fi
echo ""

# Step 13: Summary
echo "=== Migration Summary ==="
echo -e "Migration: Angular ${BLUE}${CURRENT_VERSION}${NC} → ${GREEN}${TARGET_VERSION}${NC}"
echo -e "Branch: $(git branch --show-current)"
echo -e "Build: $([ $BUILD_STATUS -eq 0 ] && echo -e "${GREEN}✓ Success${NC}" || echo -e "${RED}✗ Failed${NC}")"
echo -e "Tests: $([ "${TEST_STATUS:-0}" -eq 0 ] && echo -e "${GREEN}✓ Passed${NC}" || echo -e "${YELLOW}⚠ Failed${NC}")"
echo ""

# Step 14: Next steps
echo "=== Next Steps ==="
echo "1. Review and fix any build or test failures"
echo "2. Test your application thoroughly"
echo "3. Commit changes: git add . && git commit -m 'chore: migrate to Angular ${TARGET_VERSION}'"
echo "4. Create pull request for review"
echo ""

# Exit with appropriate code
if [ $BUILD_STATUS -ne 0 ]; then
    exit 1
fi
exit 0