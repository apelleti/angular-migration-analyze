# Intégration CI/CD

Ce guide détaille comment intégrer Angular Migration Analyzer dans vos pipelines CI/CD.

## 🎯 Objectifs

- Automatiser l'analyse des dépendances
- Bloquer les builds avec des problèmes critiques
- Générer des rapports automatiques
- Suivre la santé du projet dans le temps

## 🔧 Configuration de base

### Installation dans CI

```yaml
# .github/workflows/analyze.yml
- name: Install Angular Migration Analyzer
  run: npm install -g angular-migration-analyzer

# Ou via package.json
- name: Install dependencies
  run: npm ci
```

### Script npm dédié

```json
// package.json
{
  "scripts": {
    "ci:analyze": "ng-migrate analyze --fail-on-critical",
    "ci:doctor": "ng-migrate doctor --format json --output health.json",
    "ci:security": "ng-migrate analyze --only security --fail-on-high"
  }
}
```

## 📊 GitHub Actions

### Workflow complet

```yaml
name: Dependency Analysis

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Analyse quotidienne à 2h du matin
    - cron: '0 2 * * *'

jobs:
  analyze:
    name: Analyze Dependencies
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Migration Analyzer
        run: npm install -g angular-migration-analyzer
        
      - name: Run Analysis
        id: analysis
        run: |
          ng-migrate analyze --format json --output analysis.json
          echo "score=$(jq '.summary.healthScore' analysis.json)" >> $GITHUB_OUTPUT
          
      - name: Check Critical Issues
        run: ng-migrate doctor --fail-on-critical
        
      - name: Upload Analysis Report
        uses: actions/upload-artifact@v4
        with:
          name: dependency-analysis
          path: analysis.json
          
      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const analysis = JSON.parse(fs.readFileSync('analysis.json', 'utf8'));
            const score = analysis.summary.healthScore;
            const critical = analysis.summary.criticalCount;
            
            const emoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
            const comment = `## ${emoji} Dependency Analysis
            
            **Health Score:** ${score}/100
            **Critical Issues:** ${critical}
            **Warnings:** ${analysis.summary.warningCount}
            
            <details>
            <summary>View detailed report</summary>
            
            \`\`\`json
            ${JSON.stringify(analysis.summary, null, 2)}
            \`\`\`
            </details>`;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Workflow de sécurité

```yaml
name: Security Audit

on:
  schedule:
    - cron: '0 */6 * * *'  # Toutes les 6 heures
  workflow_dispatch:

jobs:
  security:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Security Analysis
        run: |
          npx angular-migration-analyzer analyze \
            --only security \
            --format json \
            --output security.json
            
      - name: Check Vulnerabilities
        id: vuln-check
        run: |
          CRITICAL=$(jq '.vulnerabilities.critical | length' security.json)
          HIGH=$(jq '.vulnerabilities.high | length' security.json)
          echo "critical=$CRITICAL" >> $GITHUB_OUTPUT
          echo "high=$HIGH" >> $GITHUB_OUTPUT
          
          if [ $CRITICAL -gt 0 ]; then
            echo "❌ Found $CRITICAL critical vulnerabilities!"
            exit 1
          fi
          
      - name: Create Issue if Vulnerabilities
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const title = '🚨 Critical Security Vulnerabilities Detected';
            const body = `Security scan found critical vulnerabilities.
            
            **Critical:** ${{ steps.vuln-check.outputs.critical }}
            **High:** ${{ steps.vuln-check.outputs.high }}
            
            Run \`ng-migrate analyze --only security\` locally for details.`;
            
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: title,
              body: body,
              labels: ['security', 'critical']
            });
```

## 🔵 GitLab CI/CD

### .gitlab-ci.yml

```yaml
stages:
  - analyze
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

# Template pour les jobs Node.js
.node_template:
  image: node:${NODE_VERSION}
  before_script:
    - npm ci
    - npm install -g angular-migration-analyzer

dependency-analysis:
  extends: .node_template
  stage: analyze
  script:
    - ng-migrate analyze --format json --output analysis.json
    - ng-migrate doctor --fail-on-critical
  artifacts:
    reports:
      # Rapport personnalisé GitLab
      dependency_scanning: analysis.json
    paths:
      - analysis.json
    expire_in: 30 days
  only:
    - merge_requests
    - main
    - develop

security-scan:
  extends: .node_template
  stage: analyze
  script:
    - ng-migrate analyze --only security --format junit --output security.xml
  artifacts:
    reports:
      junit: security.xml
  allow_failure: false
  only:
    - schedules
    - main

migration-check:
  extends: .node_template
  stage: analyze
  script:
    - |
      echo "Checking migration readiness for Angular 18..."
      ng-migrate analyze --target-version 18 --format json --output migration.json
      
      READY=$(jq '.migrationReady' migration.json)
      if [ "$READY" = "false" ]; then
        echo "❌ Not ready for Angular 18 migration"
        jq '.blockers' migration.json
        exit 1
      fi
  only:
    - merge_requests
  when: manual

# Job de performance
bundle-size-check:
  extends: .node_template
  stage: analyze
  script:
    - npm run build -- --stats-json
    - ng-migrate analyze --only performance --baseline dist/stats-baseline.json
  artifacts:
    paths:
      - performance-report.html
```

## 🟦 Azure DevOps

### azure-pipelines.yml

```yaml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - package.json
      - angular.json

pool:
  vmImage: 'ubuntu-latest'

variables:
  NODE_VERSION: '18.x'
  ANALYZER_VERSION: 'latest'

stages:
  - stage: Analysis
    displayName: 'Dependency Analysis'
    jobs:
      - job: Analyze
        displayName: 'Run Analysis'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(NODE_VERSION)
            displayName: 'Install Node.js'
            
          - script: npm ci
            displayName: 'Install dependencies'
            
          - script: npm install -g angular-migration-analyzer@$(ANALYZER_VERSION)
            displayName: 'Install Analyzer'
            
          - script: |
              ng-migrate analyze --format json --output $(Build.ArtifactStagingDirectory)/analysis.json
              ng-migrate analyze --format html --output $(Build.ArtifactStagingDirectory)/report.html
            displayName: 'Run Analysis'
            
          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: '$(Build.ArtifactStagingDirectory)'
              ArtifactName: 'analysis-reports'
            displayName: 'Publish Reports'
            
          - script: |
              SCORE=$(jq '.summary.healthScore' $(Build.ArtifactStagingDirectory)/analysis.json)
              echo "##vso[task.setvariable variable=healthScore]$SCORE"
              
              if [ $SCORE -lt 60 ]; then
                echo "##vso[task.logissue type=error]Health score is too low: $SCORE/100"
                exit 1
              fi
            displayName: 'Check Health Score'
            
          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/test-results.xml'
            condition: always()

  - stage: SecurityScan
    displayName: 'Security Scanning'
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - job: Security
        steps:
          - template: templates/node-setup.yml
          
          - script: |
              ng-migrate analyze --only security --fail-on-high
            displayName: 'Security Scan'
            continueOnError: false
```

### Template réutilisable

```yaml
# templates/dependency-check.yml
parameters:
  - name: failOnCritical
    type: boolean
    default: true
  - name: targetVersion
    type: string
    default: 'latest'

steps:
  - script: |
      ng-migrate analyze \
        ${{ if parameters.failOnCritical }}--fail-on-critical${{ endif }} \
        --target-version ${{ parameters.targetVersion }}
    displayName: 'Dependency Check'
```

## 🟨 Jenkins

### Jenkinsfile

```groovy
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        ANALYZER_REPORT = 'dependency-analysis.json'
    }
    
    stages {
        stage('Setup') {
            steps {
                nodejs(nodeVersion: env.NODE_VERSION) {
                    sh 'npm ci'
                    sh 'npm install -g angular-migration-analyzer'
                }
            }
        }
        
        stage('Analysis') {
            steps {
                nodejs(nodeVersion: env.NODE_VERSION) {
                    script {
                        def analysisResult = sh(
                            script: "ng-migrate analyze --format json --output ${env.ANALYZER_REPORT}",
                            returnStatus: true
                        )
                        
                        if (analysisResult != 0) {
                            error("Dependency analysis failed")
                        }
                        
                        // Parse and check results
                        def analysis = readJSON file: env.ANALYZER_REPORT
                        def healthScore = analysis.summary.healthScore
                        
                        if (healthScore < 60) {
                            unstable("Health score is low: ${healthScore}/100")
                        }
                        
                        // Add badge
                        addBadge(
                            icon: healthScore >= 80 ? 'success.gif' : 'warning.gif',
                            text: "Health: ${healthScore}/100"
                        )
                    }
                }
            }
        }
        
        stage('Security Check') {
            when {
                branch 'main'
            }
            steps {
                nodejs(nodeVersion: env.NODE_VERSION) {
                    sh 'ng-migrate analyze --only security --format checkstyle --output security.xml'
                    
                    recordIssues(
                        enabledForFailure: true,
                        tool: checkStyle(pattern: 'security.xml'),
                        qualityGates: [[threshold: 1, type: 'TOTAL_ERROR', unstable: false]]
                    )
                }
            }
        }
        
        stage('Generate Reports') {
            steps {
                nodejs(nodeVersion: env.NODE_VERSION) {
                    sh 'ng-migrate analyze --format html --output report.html'
                    
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: '.',
                        reportFiles: 'report.html',
                        reportName: 'Dependency Analysis Report',
                        reportTitles: ''
                    ])
                }
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: '*.json,*.html,*.xml', fingerprint: true
        }
        
        failure {
            emailext(
                subject: "Dependency Analysis Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: '''The dependency analysis has failed. 
                         Check the report at: ${BUILD_URL}Dependency_20Analysis_20Report/''',
                to: "${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}
```

## 🐋 Docker Integration

### Dockerfile pour CI

```dockerfile
FROM node:18-alpine

# Install Angular Migration Analyzer
RUN npm install -g angular-migration-analyzer

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Run analysis
CMD ["ng-migrate", "analyze", "--format", "json"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  analyzer:
    build:
      context: .
      dockerfile: Dockerfile.analyzer
    volumes:
      - ./reports:/app/reports
    environment:
      - OUTPUT_DIR=/app/reports
    command: >
      sh -c "
        ng-migrate analyze --format html --output /app/reports/analysis.html &&
        ng-migrate doctor --format json --output /app/reports/health.json
      "
```

## 📈 Métriques et Dashboard

### Prometheus Metrics

```typescript
// metrics-exporter.js
const { register, Gauge } = require('prom-client');
const { execSync } = require('child_process');

const healthScore = new Gauge({
  name: 'angular_health_score',
  help: 'Angular project health score'
});

const criticalIssues = new Gauge({
  name: 'angular_critical_issues',
  help: 'Number of critical issues'
});

const vulnerabilities = new Gauge({
  name: 'angular_vulnerabilities',
  help: 'Number of security vulnerabilities',
  labelNames: ['severity']
});

function collectMetrics() {
  const analysis = JSON.parse(
    execSync('ng-migrate analyze --format json', { encoding: 'utf8' })
  );
  
  healthScore.set(analysis.summary.healthScore);
  criticalIssues.set(analysis.summary.criticalCount);
  
  Object.entries(analysis.vulnerabilities || {}).forEach(([severity, count]) => {
    vulnerabilities.labels(severity).set(count);
  });
}

// Export metrics endpoint
app.get('/metrics', (req, res) => {
  collectMetrics();
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Angular Project Health",
    "panels": [
      {
        "title": "Health Score",
        "targets": [
          {
            "expr": "angular_health_score"
          }
        ],
        "type": "gauge",
        "options": {
          "thresholds": {
            "steps": [
              { "value": 0, "color": "red" },
              { "value": 60, "color": "yellow" },
              { "value": 80, "color": "green" }
            ]
          }
        }
      },
      {
        "title": "Critical Issues Trend",
        "targets": [
          {
            "expr": "angular_critical_issues"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

## 🔔 Notifications

### Slack Integration

```yaml
# GitHub Action avec Slack
- name: Notify Slack
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: |
      Dependency Analysis Failed!
      Health Score: ${{ steps.analysis.outputs.score }}/100
      Critical Issues: ${{ steps.analysis.outputs.critical }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Email Template

```html
<!-- email-template.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        .status-good { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-critical { color: #dc3545; }
    </style>
</head>
<body>
    <h2>Angular Dependency Analysis Report</h2>
    
    <table>
        <tr>
            <td>Project:</td>
            <td>{{ project.name }}</td>
        </tr>
        <tr>
            <td>Health Score:</td>
            <td class="status-{{ status }}">{{ summary.healthScore }}/100</td>
        </tr>
        <tr>
            <td>Critical Issues:</td>
            <td>{{ summary.criticalCount }}</td>
        </tr>
    </table>
    
    <h3>Actions Required</h3>
    <ul>
        {% for action in recommendations %}
        <li>{{ action.description }}</li>
        {% endfor %}
    </ul>
    
    <p>
        <a href="{{ buildUrl }}">View Full Report</a>
    </p>
</body>
</html>
```

## 🏆 Best Practices

### 1. Fail Fast Strategy

```yaml
# Arrêter dès qu'un problème critique est détecté
- run: ng-migrate doctor --fail-on-critical --stop-on-first
```

### 2. Incremental Analysis

```yaml
# Analyser seulement les changements
- run: |
    CHANGED_FILES=$(git diff --name-only HEAD~1)
    if echo "$CHANGED_FILES" | grep -q "package.json"; then
      ng-migrate analyze --incremental
    fi
```

### 3. Parallel Execution

```yaml
# Exécuter plusieurs analyses en parallèle
jobs:
  analyze:
    strategy:
      matrix:
        check: [dependencies, security, performance]
    steps:
      - run: ng-migrate analyze --only ${{ matrix.check }}
```

### 4. Cache Strategy

```yaml
# GitHub Actions
- uses: actions/cache@v3
  with:
    path: ~/.ng-migrate-cache
    key: ${{ runner.os }}-analyze-${{ hashFiles('**/package-lock.json') }}
```

## 📚 Ressources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [Azure Pipelines Documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/)
- [Jenkins Pipeline Documentation](https://www.jenkins.io/doc/book/pipeline/)

## Prochaines étapes

- [Monitoring et métriques](../monitoring/setup.md)
- [Automatisation avancée](../automation/advanced.md)
- [Intégration avec les outils de qualité](../quality/integration.md)