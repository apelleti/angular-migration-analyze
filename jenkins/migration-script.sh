#!/bin/bash
#
# Angular Migration Analysis Script for Jenkins
# This script analyzes an Angular project and prepares it for migration
#
# Usage: ./migration-script.sh [OPTIONS]
# Options:
#   -p, --project PATH       Project path (default: current directory)
#   -t, --threshold LEVEL    Threshold level: critical, high, medium, low (default: high)
#   -e, --export             Export detailed reports
#   -s, --silent             Silent mode (minimal output)
#   -h, --help               Show this help message

set -e  # Exit on error

# Default values
PROJECT_PATH="."
THRESHOLD="high"
EXPORT_REPORTS=false
SILENT_MODE=false
NGMA_VERSION="latest"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_PATH="$2"
            shift 2
            ;;
        -t|--threshold)
            THRESHOLD="$2"
            shift 2
            ;;
        -e|--export)
            EXPORT_REPORTS=true
            shift
            ;;
        -s|--silent)
            SILENT_MODE=true
            shift
            ;;
        -h|--help)
            echo "Angular Migration Analysis Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -p, --project PATH       Project path (default: current directory)"
            echo "  -t, --threshold LEVEL    Threshold level: critical, high, medium, low (default: high)"
            echo "  -e, --export             Export detailed reports"
            echo "  -s, --silent             Silent mode (minimal output)"
            echo "  -h, --help               Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Functions
log() {
    if [ "$SILENT_MODE" = false ]; then
        echo -e "$1"
    fi
}

log_error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
}

log_success() {
    log "${GREEN}✓ $1${NC}"
}

log_warning() {
    log "${YELLOW}⚠ $1${NC}"
}

log_info() {
    log "${BLUE}ℹ $1${NC}"
}

# Check if running in Jenkins
if [ -n "$JENKINS_HOME" ]; then
    log_info "Running in Jenkins environment"
    # Disable color codes in Jenkins
    RED=""
    GREEN=""
    YELLOW=""
    BLUE=""
    NC=""
fi

# Step 1: Validate environment
log "=== Angular Migration Analysis ==="
log ""
log_info "Project path: $PROJECT_PATH"
log_info "Threshold: $THRESHOLD"
log_info "Export reports: $EXPORT_REPORTS"

# Check if project directory exists
if [ ! -d "$PROJECT_PATH" ]; then
    log_error "Project directory not found: $PROJECT_PATH"
    exit 1
fi

cd "$PROJECT_PATH"

# Check if it's an Angular project
if [ ! -f "package.json" ]; then
    log_error "No package.json found. Is this an Angular project?"
    exit 1
fi

if ! grep -q "@angular/core" package.json; then
    log_error "No @angular/core dependency found. Is this an Angular project?"
    exit 1
fi

# Step 2: Install ng-migration-analyzer if not present
if ! command -v ngma &> /dev/null; then
    log_info "Installing ng-migration-analyzer..."
    npm install -g ng-migration-analyzer@${NGMA_VERSION} || {
        log_error "Failed to install ng-migration-analyzer"
        exit 1
    }
    log_success "ng-migration-analyzer installed"
else
    log_info "ng-migration-analyzer already installed"
fi

# Step 3: Run the analysis
log ""
log_info "Starting migration analysis..."

# Prepare command options
SCAN_OPTIONS="--ci --threshold $THRESHOLD"
if [ "$SILENT_MODE" = true ]; then
    SCAN_OPTIONS="$SCAN_OPTIONS --quiet"
fi
if [ "$EXPORT_REPORTS" = true ]; then
    SCAN_OPTIONS="$SCAN_OPTIONS --export-plan --export-summary"
fi

# Run scan and capture exit code
set +e  # Temporarily disable exit on error
ngma scan $SCAN_OPTIONS --json > .ngma/analysis-output.json
SCAN_EXIT_CODE=$?
set -e

# Step 4: Process results
if [ $SCAN_EXIT_CODE -eq 0 ]; then
    log_success "No $THRESHOLD or higher issues found"
else
    log_warning "Migration issues detected (exit code: $SCAN_EXIT_CODE)"
fi

# Parse JSON results if not in silent mode
if [ "$SILENT_MODE" = false ] && [ -f ".ngma/analysis-output.json" ]; then
    # Extract key metrics using basic tools (works without jq)
    FROM_VERSION=$(grep -o '"fromVersion":[[:space:]]*"[^"]*"' .ngma/analysis-output.json | cut -d'"' -f4)
    TO_VERSION=$(grep -o '"toVersion":[[:space:]]*"[^"]*"' .ngma/analysis-output.json | cut -d'"' -f4)
    FILES_IMPACTED=$(grep -o '"filesImpacted":[[:space:]]*[0-9]*' .ngma/analysis-output.json | grep -o '[0-9]*$')
    BREAKING_CHANGES=$(grep -o '"breakingChanges":[[:space:]]*[0-9]*' .ngma/analysis-output.json | grep -o '[0-9]*$')
    
    log ""
    log "=== Analysis Summary ==="
    log "Current Version: Angular $FROM_VERSION"
    log "Target Version: Angular $TO_VERSION"
    log "Files Impacted: ${FILES_IMPACTED:-0}"
    log "Breaking Changes: ${BREAKING_CHANGES:-0}"
fi

# Step 5: Generate suggestions
if [ "$EXPORT_REPORTS" = true ]; then
    log ""
    log_info "Generating migration suggestions..."
    
    SUGGEST_OPTIONS="--format markdown --output migration-suggestions.md"
    if [ -f ".ngma/analysis-report.json" ]; then
        SUGGEST_OPTIONS="$SUGGEST_OPTIONS -r .ngma/analysis-report.json"
    fi
    
    ngma suggest $SUGGEST_OPTIONS || {
        log_warning "Failed to generate suggestions"
    }
    
    if [ -f ".ngma/migration-suggestions.md" ]; then
        log_success "Migration suggestions saved to .ngma/migration-suggestions.md"
    fi
fi

# Step 6: Generate Jenkins artifacts summary
if [ -n "$JENKINS_HOME" ] && [ "$EXPORT_REPORTS" = true ]; then
    log ""
    log_info "Generating Jenkins summary..."
    
    cat > .ngma/jenkins-summary.txt << EOF
Angular Migration Analysis Summary
==================================

Project: $PWD
Analysis Date: $(date)
Threshold: $THRESHOLD

Results:
- Current Version: Angular ${FROM_VERSION:-unknown}
- Target Version: Angular ${TO_VERSION:-unknown}
- Files Impacted: ${FILES_IMPACTED:-0}
- Breaking Changes: ${BREAKING_CHANGES:-0}
- Exit Code: $SCAN_EXIT_CODE

Artifacts Generated:
- analysis-report.json: Detailed analysis results
- migration-plan.md: Step-by-step migration plan
- migration-summary.md: Executive summary
- migration-suggestions.md: Detailed suggestions

Next Steps:
1. Review the migration suggestions in .ngma/migration-suggestions.md
2. Apply the recommended changes to your codebase
3. Run the actual Angular migration:
   ng update @angular/core@${TO_VERSION:-next} @angular/cli@${TO_VERSION:-next}
EOF

    log_success "Jenkins summary saved to .ngma/jenkins-summary.txt"
fi

# Step 7: Generate migration commands
log ""
log_info "Generating migration commands..."

cat > .ngma/migration-commands.sh << 'EOF'
#!/bin/bash
# Auto-generated Angular migration commands
# Review and run these commands after applying the suggested changes

echo "=== Angular Migration Commands ==="
echo ""

# Check current versions
echo "1. Current package versions:"
npm list @angular/core @angular/cli

# Backup current state
echo ""
echo "2. Create backup branch:"
echo "   git checkout -b migration-backup-$(date +%Y%m%d)"

# Update Angular CLI globally (if needed)
echo ""
echo "3. Update Angular CLI globally:"
echo "   npm install -g @angular/cli@latest"

# Run Angular update
echo ""
echo "4. Run Angular update:"
EOF

# Add appropriate update command based on analysis
if [ -f ".ngma/analysis-report.json" ] && grep -q '"conflicts":\[[^]]' .ngma/analysis-report.json 2>/dev/null; then
    cat >> .ngma/migration-commands.sh << EOF
echo "   # Note: Peer dependency conflicts detected, using --legacy-peer-deps"
echo "   npm install --legacy-peer-deps"
echo "   ng update @angular/core@${TO_VERSION:-next} @angular/cli@${TO_VERSION:-next} --force"
EOF
else
    cat >> .ngma/migration-commands.sh << EOF
echo "   ng update @angular/core@${TO_VERSION:-next} @angular/cli@${TO_VERSION:-next}"
EOF
fi

cat >> .ngma/migration-commands.sh << 'EOF'

# Post-migration steps
echo ""
echo "5. Post-migration steps:"
echo "   npm install"
echo "   npm run build"
echo "   npm test"

echo ""
echo "6. Validate migration:"
echo "   ngma validate"

echo ""
echo "Review and run these commands when ready."
EOF

chmod +x .ngma/migration-commands.sh
log_success "Migration commands saved to .ngma/migration-commands.sh"

# Final summary
log ""
log "=== Migration Analysis Complete ==="

if [ $SCAN_EXIT_CODE -eq 0 ]; then
    log_success "Your project is ready for migration!"
    log_info "No $THRESHOLD or higher issues found."
else
    log_warning "Your project has migration issues that need attention."
    log_info "Review the reports in the .ngma/ directory before proceeding."
fi

log ""
log "Next steps:"
log "1. Review analysis reports in .ngma/"
log "2. Apply suggested changes to your codebase"
log "3. Run .ngma/migration-commands.sh when ready"

# Exit with the scan exit code for Jenkins
exit $SCAN_EXIT_CODE