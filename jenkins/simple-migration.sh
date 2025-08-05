#!/bin/bash
#
# Simple Angular Migration Script for Jenkins
# Executes migration based on ngma analysis
#

set -e

echo "=== Angular Migration (with ngma) ==="
echo ""

# Install analyzer
npm install -g ng-migration-analyzer@latest

# Run analysis
echo "1. Analyzing project..."
ngma scan --quiet --json

# Get versions and check for peer conflicts
FROM_VERSION=$(grep -o '"fromVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
TO_VERSION=$(grep -o '"toVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
PEER_CONFLICTS=$(grep -o '"peerDepConflicts":[[:space:]]*[0-9]*' .ngma/analysis-report.json | grep -o '[0-9]*$' || echo "0")

echo "   Current: Angular $FROM_VERSION"
echo "   Target: Angular $TO_VERSION"
echo "   Peer conflicts: $PEER_CONFLICTS"
echo ""

# Generate suggestions
echo "2. Generating suggestions..."
ngma suggest --format markdown --output suggestions.md -r .ngma/analysis-report.json
echo ""

# Clean and install
echo "3. Preparing migration..."
rm -rf node_modules package-lock.json
if [ "$PEER_CONFLICTS" -gt 0 ]; then
    echo "   Using --legacy-peer-deps due to conflicts"
    npm install --legacy-peer-deps
else
    npm install
fi
echo ""

# Update Angular
echo "4. Updating Angular..."
npm install -g @angular/cli@${TO_VERSION}
if [ "$PEER_CONFLICTS" -gt 0 ]; then
    ng update @angular/core@${TO_VERSION} @angular/cli@${TO_VERSION} --allow-dirty --force
else
    ng update @angular/core@${TO_VERSION} @angular/cli@${TO_VERSION} --allow-dirty
fi

# Update other Angular packages
for pkg in $(grep -o '"@angular/[^"]*"' package.json | grep -v '@angular/core\|@angular/cli' | cut -d'"' -f2); do
    ng update ${pkg}@${TO_VERSION} --allow-dirty --force || true
done
echo ""

# Final install and build
echo "5. Building project..."
rm -rf node_modules
npm install $([ "$PEER_CONFLICTS" -gt 0 ] && echo "--legacy-peer-deps")
npm run build
echo ""

echo "=== Migration Complete ==="
echo "Angular $FROM_VERSION → $TO_VERSION"
echo "Check .ngma/suggestions.md for manual fixes needed"