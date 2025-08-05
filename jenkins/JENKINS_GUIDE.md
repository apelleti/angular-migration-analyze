# Jenkins Integration Guide for Angular Migration Analyzer

This guide provides different ways to integrate `ng-migration-analyzer` into your Jenkins CI/CD pipeline.

## 🚀 Quick Start

### Option 1: Simple Shell Script (Recommended)

Add this to your Jenkins job's "Execute shell" build step:

```bash
#!/bin/bash
npm install -g ng-migration-analyzer@latest
ngma scan --ci --threshold high --export-plan --export-summary
```

### Option 2: Using the Provided Script

```bash
# Download and execute the migration script
curl -O https://raw.githubusercontent.com/your-org/ng-migration-analyzer/main/jenkins/run-migration-analysis.sh
chmod +x run-migration-analysis.sh
./run-migration-analysis.sh
```

## 📋 Jenkins Job Configuration

### Freestyle Project

1. **Source Code Management**: Configure your Git repository
2. **Build Environment**: 
   - Check "Delete workspace before build starts"
   - Add NodeJS installation (if using NodeJS plugin)
3. **Build Steps**:
   - Add "Execute shell" build step
   - Use one of the scripts below
4. **Post-build Actions**:
   - Archive artifacts: `.ngma/**/*`
   - Publish HTML reports: `.ngma/*.md`

### Pipeline Project

Use the provided `Jenkinsfile` or `jenkins-simple-example.groovy`.

## 🔧 Script Examples

### Basic Analysis
```bash
#!/bin/bash
set -e

# Install analyzer
npm install -g ng-migration-analyzer@latest

# Run analysis
ngma scan --ci --threshold high --quiet

# Exit code determines build status
# 0 = pass (no issues above threshold)
# 1 = fail (issues found)
```

### Full Analysis with Reports
```bash
#!/bin/bash
set -e

# Install analyzer
npm install -g ng-migration-analyzer@latest

# Run full analysis
ngma scan --ci --threshold high --export-plan --export-summary --json

# Generate suggestions
ngma suggest --format markdown --output suggestions.md -r .ngma/analysis-report.json

# Create summary for Jenkins
echo "Migration Analysis Complete" > .ngma/summary.txt
echo "Reports available in .ngma/" >> .ngma/summary.txt
```

### Advanced Script with Options
```bash
#!/bin/bash

# Use the provided migration-script.sh
./jenkins/migration-script.sh \
  --project . \
  --threshold high \
  --export \
  --silent
```

## 📊 Build Parameters

Add these parameters to make the job configurable:

```groovy
// In Pipeline
parameters {
    choice(name: 'THRESHOLD', 
           choices: ['critical', 'high', 'medium', 'low'], 
           description: 'Issue threshold for build failure')
    booleanParam(name: 'EXPORT_REPORTS', 
                 defaultValue: true, 
                 description: 'Generate detailed reports')
}
```

For Freestyle projects, add Choice and Boolean parameters in job configuration.

## 📈 Build Status Integration

### Set Build Description
```bash
# Extract version info and set build description
if [ -f .ngma/analysis-report.json ]; then
    FROM=$(grep -o '"fromVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
    TO=$(grep -o '"toVersion":[[:space:]]*"[^"]*"' .ngma/analysis-report.json | cut -d'"' -f4)
    echo "Angular $FROM → $TO"
fi
```

### Jenkins Pipeline
```groovy
script {
    def report = readJSON file: '.ngma/analysis-report.json'
    currentBuild.description = "Angular ${report.fromVersion} → ${report.toVersion}"
}
```

## 🔔 Notifications

### Email Notification
```groovy
post {
    failure {
        emailext (
            to: '${DEFAULT_RECIPIENTS}',
            subject: "Angular Migration Analysis Failed - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
            body: '''Migration analysis detected issues above threshold.
                    
See attached reports for details.
Build: ${BUILD_URL}
            ''',
            attachmentsPattern: '.ngma/*.md'
        )
    }
}
```

### Slack Notification
```bash
# In shell script
if [ "$?" -ne 0 ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"❌ Angular migration analysis failed for '${JOB_NAME}'"}' \
        ${SLACK_WEBHOOK_URL}
fi
```

## 🎯 Best Practices

1. **Schedule Regular Runs**
   - Weekly analysis to catch new deprecations
   - Before each sprint to plan migration work

2. **Use Different Thresholds**
   - `critical` for production branches
   - `high` for develop branch
   - `medium` for feature branches

3. **Archive Reports**
   - Keep historical data for trend analysis
   - Compare efforts across time

4. **Gate Deployments**
   ```groovy
   stage('Migration Check') {
       steps {
           sh 'ngma scan --ci --threshold critical'
       }
   }
   stage('Deploy') {
       when {
           expression { currentBuild.result == null }
       }
       steps {
           // Deploy only if migration check passed
       }
   }
   ```

## 🐳 Docker Integration

### Using Docker Agent
```groovy
pipeline {
    agent {
        docker {
            image 'node:18-alpine'
            args '-v $HOME/.npm:/root/.npm'
        }
    }
    stages {
        stage('Analysis') {
            steps {
                sh '''
                    npm install -g ng-migration-analyzer@latest
                    ngma scan --ci --threshold high
                '''
            }
        }
    }
}
```

### Docker Compose
```yaml
version: '3'
services:
  migration-analysis:
    image: node:18-alpine
    volumes:
      - .:/workspace
    working_dir: /workspace
    command: |
      sh -c "
        npm install -g ng-migration-analyzer@latest &&
        ngma scan --ci --threshold high --export-plan
      "
```

## 📝 Example Output

```
=== Angular Migration Analysis ===
Starting at: Mon Nov 13 10:23:45 UTC 2023

Installing ng-migration-analyzer...
+ ng-migration-analyzer@1.0.0

Running migration analysis...
Detected Angular version: 17
Migration target: Angular 18 (n+1)
Analysis complete!

=== Analysis Summary ===
Current Version: Angular 17
Target Version: Angular 18
Files Impacted: 23
Breaking Changes: 5

=== Generated Artifacts ===
-rw-r--r-- 1 jenkins jenkins 15432 Nov 13 10:24 analysis-report.json
-rw-r--r-- 1 jenkins jenkins  8234 Nov 13 10:24 migration-plan.md
-rw-r--r-- 1 jenkins jenkins  2156 Nov 13 10:24 migration-summary.md
-rw-r--r-- 1 jenkins jenkins 12890 Nov 13 10:24 suggestions.md

Completed at: Mon Nov 13 10:24:12 UTC 2023
```

## 🔗 Next Steps

After analysis passes:
1. Review the generated reports in `.ngma/`
2. Apply suggested changes to your codebase
3. Run the actual Angular migration
4. Re-run analysis to validate

## 💡 Tips

- Use `--quiet` flag for cleaner logs
- Set up a separate view for migration jobs
- Create a dashboard showing migration status across projects
- Use Jenkins shared libraries for reusable migration functions