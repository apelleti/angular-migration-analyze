#!/bin/bash
#
# Simple Angular Migration Analysis Runner
# For use in Jenkins Execute Shell build step
#

set -e

echo "=== Angular Migration Analysis ==="
echo "Starting at: $(date)"
echo ""

# Install ng-migration-analyzer
echo "Installing ng-migration-analyzer..."
npm install -g ng-migration-analyzer@latest

# Run analysis with CI mode
echo ""
echo "Running migration analysis..."
ngma scan --ci --threshold high --export-plan --export-summary --json || EXIT_CODE=$?

# Generate suggestions report
echo ""
echo "Generating suggestions..."
ngma suggest --format markdown --output suggestions.md -r .ngma/analysis-report.json || true

# Display summary
if [ -f .ngma/analysis-report.json ]; then
    echo ""
    echo "=== Analysis Summary ==="
    FROM_VERSION=$(grep -o '"fromVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
    TO_VERSION=$(grep -o '"toVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
    FILES=$(grep -o '"filesImpacted":[[:space:]]*[0-9]*' .ngma/analysis-report.json | grep -o '[0-9]*$')
    BREAKING=$(grep -o '"breakingChanges":[[:space:]]*[0-9]*' .ngma/analysis-report.json | grep -o '[0-9]*$')
    
    echo "Current Version: Angular $FROM_VERSION"
    echo "Target Version: Angular $TO_VERSION"  
    echo "Files Impacted: ${FILES:-0}"
    echo "Breaking Changes: ${BREAKING:-0}"
    echo ""
fi

# List generated artifacts
echo "=== Generated Artifacts ==="
ls -la .ngma/ 2>/dev/null || echo "No artifacts found"

echo ""
echo "Completed at: $(date)"

# Exit with the original exit code
exit ${EXIT_CODE:-0}