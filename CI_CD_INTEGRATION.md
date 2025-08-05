# CI/CD Integration Guide

This guide shows how to integrate `ng-migration-analyzer` into your CI/CD pipeline.

## 🚀 Quick Commands

### Basic CI Command
```bash
ngma scan --ci --threshold high --quiet
```

### Full Analysis with Reports
```bash
ngma scan --ci --threshold high --export-plan --export-summary --json
```

## 📋 CI Mode Options

- `--ci`: Enable CI mode (fails build if issues found)
- `--threshold <level>`: Set failure threshold (critical, high, medium, low)
- `--quiet`: Suppress console output (only errors)
- `--json`: Output JSON format for parsing

## 🔧 Jenkins Integration

### Using Jenkinsfile
```groovy
stage('Angular Migration Analysis') {
    steps {
        sh 'npm install -g ng-migration-analyzer'
        sh 'ngma scan --ci --threshold high --export-plan'
    }
    post {
        always {
            archiveArtifacts artifacts: '.ngma/**/*'
        }
    }
}
```

### Full Pipeline Example
See `jenkins/Jenkinsfile` for a complete pipeline with:
- Angular version detection
- Conditional thresholds
- HTML report generation
- Slack notifications

## 🐳 Docker Integration

### Simple Docker Command
```bash
docker run --rm -v $(pwd):/app -w /app node:18-alpine sh -c "
  npm install -g ng-migration-analyzer
  ngma scan --ci --threshold high
"
```

### Docker Compose
```yaml
version: '3'
services:
  ng-analysis:
    image: node:18-alpine
    volumes:
      - .:/app
    working_dir: /app
    command: |
      sh -c "
        npm install -g ng-migration-analyzer &&
        ngma scan --ci --threshold high --export-plan
      "
```

## 🦊 GitLab CI Integration

```yaml
angular-migration-check:
  stage: test
  image: node:18
  script:
    - npm install -g ng-migration-analyzer
    - ngma scan --ci --threshold high
  artifacts:
    when: always
    paths:
      - .ngma/
```

See `jenkins/gitlab-ci.yml` for advanced features.

## 🐙 GitHub Actions Integration

```yaml
- name: Angular Migration Analysis
  run: |
    npm install -g ng-migration-analyzer
    ngma scan --ci --threshold high
```

See `jenkins/github-actions.yml` for PR comments and artifacts.

## 📊 Exit Codes

- `0`: Success - No issues above threshold
- `1`: Failure - Issues found above threshold or analysis error

## 🔍 Parsing Results

### Using jq
```bash
# Get version info
ngma scan --json --quiet | jq '.fromVersion'

# Check if critical issues exist
ngma scan --json --quiet | jq '.patterns[] | select(.severity == "error")'

# Count total issues
ngma scan --json --quiet | jq '.summary.filesImpacted'
```

### Python Example
```python
import json
import subprocess

result = subprocess.run(
    ['ngma', 'scan', '--json', '--quiet'],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    report = json.loads(result.stdout)
    print(f"Angular {report['fromVersion']} → {report['toVersion']}")
    print(f"Issues: {report['summary']['filesImpacted']}")
```

## 🎯 Best Practices

1. **Set Appropriate Thresholds**
   - `critical`: Block deployment
   - `high`: Block merge to main
   - `medium`: Warning for feature branches
   - `low`: Information only

2. **Archive Reports**
   - Always save `.ngma/` directory as artifacts
   - Keep reports for trend analysis

3. **Incremental Adoption**
   - Start with `--threshold low`
   - Gradually increase as issues are fixed

4. **Scheduled Runs**
   - Run weekly to catch new deprecations
   - Monitor Angular release cycles

## 🔗 Integration Examples

All integration examples are in the `jenkins/` directory:
- `Jenkinsfile` - Complete Jenkins pipeline
- `gitlab-ci.yml` - GitLab CI configuration
- `github-actions.yml` - GitHub Actions workflow
- `jenkins-docker-example.sh` - Docker-based execution