#!/bin/bash
#
# Automated Angular Migration Script for Jenkins
# Uses ngma to analyze and generate migration script
#

set -e

echo "=== Automated Angular Migration ==="
echo ""

# Step 1: Install analyzer
echo "Installing ng-migration-analyzer..."
npm install -g ng-migration-analyzer@latest

# Step 2: Run analysis
echo "Analyzing project..."
ngma scan --export-plan --export-summary --json

# Step 3: Generate suggestions (this also creates migration.sh)
echo "Generating migration plan..."
ngma suggest --format markdown --output suggestions.md -r .ngma/analysis-report.json

# Step 4: Display analysis summary
if [ -f ".ngma/analysis-report.json" ]; then
    FROM=$(grep -o '"fromVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
    TO=$(grep -o '"toVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
    CONFLICTS=$(grep -o '"peerDepConflicts":[[:space:]]*[0-9]*' .ngma/analysis-report.json | grep -o '[0-9]*$' || echo "0")
    
    echo ""
    echo "Analysis Summary:"
    echo "  Current: Angular $FROM"
    echo "  Target: Angular $TO"
    echo "  Conflicts: $CONFLICTS"
    echo ""
fi

# Step 5: Execute generated migration script
if [ -f ".ngma/migration.sh" ]; then
    echo "Executing generated migration script..."
    chmod +x .ngma/migration.sh
    ./.ngma/migration.sh
else
    echo "Error: Migration script not generated"
    exit 1
fi

echo ""
echo "Migration complete! Check .ngma/ for detailed reports."