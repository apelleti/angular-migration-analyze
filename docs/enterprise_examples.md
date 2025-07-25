# 🌐 Configuration Proxy d'entreprise

## 📋 Exemples de configuration

### 1. Configuration via .ng-migrate.json

```json
{
  "registry": "https://registry.npmjs.org",
  "network": {
    "proxy": {
      "enabled": true,
      "host": "proxy.company.com",
      "port": 8080,
      "protocol": "http",
      "bypassList": [
        "localhost",
        "*.company.com",
        "internal-registry.local"
      ]
    },
    "strictSSL": false,
    "timeout": 30000
  },
  "cache": {
    "enabled": true,
    "ttl": 600000
  }
}
```

### 2. Configuration via variables d'environnement

```bash
# Proxy configuration
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTPS_PROXY="http://proxy.company.com:8080"
export NO_PROXY="localhost,*.company.com,internal-registry.local"

# Registry alternatif (ex: Artifactory en tant que proxy)
export NPM_CONFIG_REGISTRY="https://artifactory.company.com/artifactory/api/npm/npm/"

# SSL pour certificats auto-signés
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Spécifique à ng-migrate
export NG_MIGRATE_REGISTRY="https://artifactory.company.com/artifactory/api/npm/npm/"
export NG_MIGRATE_OFFLINE=false
export NG_MIGRATE_PROXY_BYPASS="internal-registry.local,*.company.com"
```

### 3. Configuration automatique depuis les variables système

L'outil détecte automatiquement :
- `HTTP_PROXY` / `HTTPS_PROXY`
- `NO_PROXY` pour la liste de bypass
- `NPM_CONFIG_REGISTRY` pour un registry alternatif
- `NODE_TLS_REJECT_UNAUTHORIZED` pour SSL

## 🚀 Utilisation

### Analyse avec proxy d'entreprise

```bash
# L'outil détecte automatiquement la configuration proxy
ng-migrate analyze

# Test de connexion
ng-migrate doctor --verbose

# Diagnostic réseau
ng-migrate diagnose
```

### Test de connectivité

```bash
# Test de connexion au registry
ng-migrate test-connection

# Mode verbeux pour debug proxy
ng-migrate analyze --verbose
```

### Mode hors ligne pour environnements déconnectés

```bash
# Mode hors ligne - analyse basée sur les fichiers locaux uniquement
ng-migrate analyze --offline

# Ou via configuration
export NG_MIGRATE_OFFLINE=true
ng-migrate analyze
```

## 🔧 Configurations typiques

### Proxy HTTP simple

```json
{
  "network": {
    "proxy": {
      "enabled": true,
      "host": "proxy.company.com",
      "port": 8080,
      "protocol": "http"
    }
  }
}
```

### Proxy HTTPS avec bypass

```json
{
  "network": {
    "proxy": {
      "enabled": true,
      "host": "secure-proxy.company.com",
      "port": 443,
      "protocol": "https",
      "bypassList": [
        "localhost",
        "127.0.0.1",
        "*.internal.company.com",
        "registry.internal"
      ]
    },
    "strictSSL": false
  }
}
```

### Registry Artifactory en proxy

```json
{
  "registry": "https://artifactory.company.com/artifactory/api/npm/npm/",
  "network": {
    "proxy": {
      "enabled": true,
      "host": "proxy.company.com",
      "port": 8080,
      "protocol": "http",
      "bypassList": ["artifactory.company.com"]
    },
    "timeout": 30000
  }
}
```

## 🔍 Dépannage

### Diagnostic automatique

```bash
ng-migrate diagnose
```

Sortie exemple :
```
🔍 DIAGNOSTIC DE CONNEXION

✅ Configuration proxy détectée
🌐 Proxy: proxy.company.com:8080 (HTTP)
🔗 Registry: https://registry.npmjs.org
🔒 SSL: Permissif
📋 Bypass: localhost, *.company.com

❌ PROBLÈMES DÉTECTÉS:
   - Timeout de connexion via proxy
   - Package @angular/core non accessible

💡 SUGGESTIONS:
   - Testez la connectivité proxy: curl -x http://proxy.company.com:8080 https://registry.npmjs.org
   - Vérifiez la liste NO_PROXY
   - Essayez en mode hors ligne: ng-migrate analyze --offline
```

### Erreurs courantes et solutions

#### Proxy timeout / ECONNRESET
```bash
# Tester le proxy manuellement
curl -x http://proxy.company.com:8080 https://registry.npmjs.org

# Vérifier la connectivité au proxy
telnet proxy.company.com 8080

# Augmenter le timeout
export NG_MIGRATE_TIMEOUT=60000
```

#### DNS resolution pour le proxy
```bash
# Vérifier la résolution DNS
nslookup proxy.company.com

# Utiliser IP directement si nécessaire
export HTTP_PROXY="http://10.0.0.100:8080"
```

#### SSL Certificate errors avec Artifactory
```bash
# Option 1: Désactiver SSL temporairement
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Option 2: Ajouter le certificat CA de l'entreprise
export NODE_EXTRA_CA_CERTS="/etc/ssl/certs/company-ca.crt"

# Option 3: Configuration dans ng-migrate
{
  "network": {
    "strictSSL": false
  }
}
```

#### Registry Artifactory non accessible
```bash
# Tester l'accès direct
curl https://artifactory.company.com/artifactory/api/npm/npm/@angular/core

# Vérifier si Artifactory est dans la liste bypass
export NO_PROXY="$NO_PROXY,artifactory.company.com"
```

## 📊 Monitoring et logs

### Mode debug

```bash
# Debug réseau
ng-migrate analyze --verbose

# Test de connexion détaillé
ng-migrate test-connection --verbose
```

### Métriques de performance

```bash
ng-migrate analyze --verbose
```

Sortie :
```
📊 INFORMATIONS RÉSEAU

🌐 Configuration:
   - Registry: https://registry.npmjs.org
   - Proxy: proxy.company.com:8080 (HTTP)
   - SSL strict: Non
   - Timeout: 30s

📈 Performance:
   - Requêtes totales: 25
   - Succès via proxy: 23 (92%)
   - Échecs: 2
   - Temps moyen: 2.1s

💾 Cache:
   - Hits: 8 (32%)
   - Misses: 17
   - Taille: 23 packages
```

## 🔄 Scripts d'installation

### Configuration automatique proxy

```bash
#!/bin/bash
# setup-proxy.sh

echo "🌐 Configuration proxy pour Angular Migration Analyzer"

# Détection proxy système
if [ ! -z "$HTTP_PROXY" ]; then
    echo "Proxy détecté: $HTTP_PROXY"
    PROXY_URL=$HTTP_PROXY
else
    read -p "URL du proxy (ex: http://proxy.company.com:8080): " PROXY_URL
fi

# Extraction host/port
PROXY_HOST=$(echo $PROXY_URL | sed 's|.*://||' | cut -d: -f1)
PROXY_PORT=$(echo $PROXY_URL | sed 's|.*://||' | cut -d: -f2 | cut -d/ -f1)
PROXY_PROTOCOL=$(echo $PROXY_URL | cut -d: -f1)

# Génération config
cat > .ng-migrate.json << EOF
{
  "network": {
    "proxy": {
      "enabled": true,
      "host": "$PROXY_HOST",
      "port": $PROXY_PORT,
      "protocol": "$PROXY_PROTOCOL",
      "bypassList": ["localhost", "127.0.0.1", "*.local"]
    },
    "strictSSL": false,
    "timeout": 30000
  },
  "cache": {
    "enabled": true,
    "ttl": 600000
  }
}
EOF

echo "✅ Configuration créée: .ng-migrate.json"
echo "🧪 Test de connexion..."

ng-migrate test-connection

if [ $? -eq 0 ]; then
    echo "✅ Configuration proxy opérationnelle!"
else
    echo "❌ Erreur de configuration. Essayez en mode hors ligne:"
    echo "    ng-migrate analyze --offline"
fi
```

### Test de connectivité avancé

```bash
#!/bin/bash
# test-connectivity.sh

echo "🔍 Test de connectivité avancé"

# Test proxy direct
if [ ! -z "$HTTP_PROXY" ]; then
    echo "Test proxy: $HTTP_PROXY"
    curl -x "$HTTP_PROXY" -I https://registry.npmjs.org --connect-timeout 10
fi

# Test registry npm
echo "Test registry npm..."
curl -I https://registry.npmjs.org --connect-timeout 10

# Test package spécifique
echo "Test package Angular..."
curl -x "$HTTP_PROXY" https://registry.npmjs.org/@angular/core --connect-timeout 10 | head -20

# Test avec ng-migrate
echo "Test ng-migrate..."
ng-migrate test-connection --verbose
```

Cette configuration simplifiée permet de gérer efficacement les proxies d'entreprise sans la complexité de l'authentification ! 🚀

### 2. Configuration via .npmrc

```bash
# .npmrc
registry=https://artifactory.company.com/artifactory/api/npm/npm-virtual/
_authToken=eyJ2ZXIiOiIyIiwidHlwIjoiSldUIiwiYWxnIj...

# Scoped registries
@company:registry=https://artifactory.company.com/artifactory/api/npm/company-npm/
@company:_authToken=eyJ2ZXIiOiIyIiwidHlwIjoiSldUIiwiYWxnIj...

# Proxy configuration
proxy=http://proxy.company.com:8080
https-proxy=http://proxy.company.com:8080

# SSL configuration
strict-ssl=false
ca=-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/heBjcOuMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV
...
-----END CERTIFICATE-----
```

### 3. Configuration via variables d'environnement

```bash
# Registry et auth
export NPM_CONFIG_REGISTRY="https://artifactory.company.com/artifactory/api/npm/npm-virtual/"
export NPM_TOKEN="eyJ2ZXIiOiIyIiwidHlwIjoiSldUIiwiYWxnIj..."

# Ou avec username/password
export NPM_USERNAME="john.doe"
export NPM_PASSWORD="my-password"

# Proxy
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTPS_PROXY="http://proxy.company.com:8080"

# SSL
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Spécifique à ng-migrate
export NG_MIGRATE_REGISTRY="https://artifactory.company.com/artifactory/api/npm/npm-virtual/"
export NG_MIGRATE_OFFLINE=false
```

## 🚀 Utilisation

### Analyse standard avec Artifactory

```bash
# L'outil détecte automatiquement la configuration enterprise
ng-migrate analyze

# Test de connexion
ng-migrate doctor --verbose

# Mode verbeux pour debug
ng-migrate analyze --verbose
```

### Test de connectivité

```bash
# Test de connexion au registry
ng-migrate test-connection

# Diagnostic complet
ng-migrate diagnose
```

### Mode hors ligne pour environnements ultra-sécurisés

```bash
# Mode hors ligne - analyse basée sur les fichiers locaux uniquement
ng-migrate analyze --offline

# Ou via configuration
export NG_MIGRATE_OFFLINE=true
ng-migrate analyze
```

## 🔧 Configuration par type d'entreprise

### JFrog Artifactory

```json
{
  "enterprise": {
    "enabled": true,
    "registryUrl": "https://company.jfrog.io/artifactory/api/npm/npm/",
    "token": "cmVmdGtuOjAxOjE3MTA4...",
    "customHeaders": {
      "X-JFrog-Art-Api": "your-api-key"
    }
  }
}
```

### Nexus Repository

```json
{
  "enterprise": {
    "enabled": true,
    "registryUrl": "https://nexus.company.com/repository/npm-group/",
    "username": "deployment",
    "password": "deployment123",
    "customHeaders": {
      "X-Nexus-UI": "true"
    }
  }
}
```

### Verdaccio (Self-hosted)

```json
{
  "enterprise": {
    "enabled": true,
    "registryUrl": "https://npm.company.com/",
    "token": "verdaccio-token",
    "strictSSL": false
  }
}
```

## 🛡️ Gestion des certificats

### Certificats auto-signés

```bash
# Option 1: Désactiver SSL (non recommandé en production)
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Option 2: Ajouter le certificat CA
export NODE_EXTRA_CA_CERTS="/path/to/company-ca.crt"

# Option 3: Configuration dans .ng-migrate.json
{
  "enterprise": {
    "strictSSL": false,
    "certPath": "/path/to/client.crt"
  }
}
```

## 🔍 Dépannage

### Diagnostic automatique

```bash
ng-migrate diagnose
```

Sortie exemple :
```
🔍 DIAGNOSTIC DE CONNEXION ENTERPRISE

✅ Configuration enterprise détectée
🔗 Registry: https://artifactory.company.com/artifactory/api/npm/npm-virtual/
🔐 Auth: Token configuré
🌐 Proxy: proxy.company.com:8080
🔒 SSL: Permissif

❌ PROBLÈMES DÉTECTÉS:
   - Erreur 401: Authentication failed
   - Proxy timeout

💡 SUGGESTIONS:
   - Vérifiez que le token n'a pas expiré
   - Testez la connectivité proxy: curl -x proxy.company.com:8080 https://artifactory.company.com
   - Vérifiez les credentials proxy
```

### Erreurs courantes et solutions

#### 401 Unauthorized
```bash
# Vérifier le token
curl -H "Authorization: Bearer $NPM_TOKEN" https://artifactory.company.com/artifactory/api/npm/npm-virtual/@angular/core

# Régénérer le token sur Artifactory
# Profile -> Authentication Tokens -> Generate
```

#### 403 Forbidden
```bash
# Vérifier les permissions sur le repository
# Artifactory -> Permissions -> Edit permissions
```

#### ENOTFOUND / DNS
```bash
# Vérifier la résolution DNS
nslookup artifactory.company.com

# Ajouter au /etc/hosts si nécessaire
echo "10.0.0.100 artifactory.company.com" >> /etc/hosts
```

#### Proxy timeout
```bash
# Tester le proxy
curl -x http://proxy.company.com:8080 https://registry.npmjs.org

# Vérifier les credentials proxy
export HTTP_PROXY="http://username:password@proxy.company.com:8080"
```

#### SSL Certificate errors
```bash
# Option 1: Récupérer le certificat
openssl s_client -connect artifactory.company.com:443 -showcerts

# Option 2: Désactiver temporairement
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Option 3: Configurer le CA bundle
export NODE_EXTRA_CA_CERTS="/etc/ssl/certs/company-ca-bundle.crt"
```

## 📊 Monitoring et logs

### Mode debug

```bash
# Debug complet
DEBUG=ng-migrate:* ng-migrate analyze

# Debug réseau uniquement
DEBUG=ng-migrate:network ng-migrate analyze

# Logs détaillés
ng-migrate analyze --verbose --log-level debug
```

### Métriques de performance

```bash
ng-migrate analyze --metrics
```

Sortie :
```
📊 MÉTRIQUES DE PERFORMANCE

🌐 Réseau:
   - Requêtes totales: 45
   - Cache hits: 12 (26.7%)
   - Temps moyen: 1.2s
   - Timeouts: 0
   - Erreurs: 2

💾 Cache:
   - Taille: 23 packages
   - Hit rate: 68%
   - Évictions: 0

⏱️  Temps total: 15.3s
```

## 🔄 Migration de configuration

### Depuis npm standard vers Artifactory

```bash
# 1. Backup configuration actuelle
cp .npmrc .npmrc.backup

# 2. Configurer Artifactory
echo "registry=https://artifactory.company.com/artifactory/api/npm/npm-virtual/" > .npmrc
echo "_authToken=YOUR_TOKEN" >> .npmrc

# 3. Tester
npm whoami
ng-migrate test-connection

# 4. Migrer le cache
ng-migrate migrate-cache --from=npm --to=artifactory
```

### Script d'installation enterprise

```bash
#!/bin/bash
# setup-enterprise.sh

echo "🏢 Configuration Angular Migration Analyzer pour l'entreprise"

# Détection automatique
if command -v npm whoami &> /dev/null; then
    CURRENT_REGISTRY=$(npm config get registry)
    echo "Registry actuel: $CURRENT_REGISTRY"
fi

# Configuration interactive
read -p "URL Artifactory: " ARTIFACTORY_URL
read -p "Token/API Key: " -s TOKEN
echo

# Génération de la config
cat > .ng-migrate.json << EOF
{
  "enterprise": {
    "enabled": true,
    "registryUrl": "$ARTIFACTORY_URL",
    "token": "$TOKEN",
    "strictSSL": false
  },
  "cache": {
    "enabled": true,
    "ttl": 600000
  }
}
EOF

echo "✅ Configuration créée: .ng-migrate.json"
echo "🧪 Test de connexion..."

ng-migrate test-connection

if [ $? -eq 0 ]; then
    echo "✅ Configuration enterprise opérationnelle!"
else
    echo "❌ Erreur de configuration. Utilisez 'ng-migrate diagnose' pour plus de détails."
fi
```

## 📚 Intégration CI/CD

### GitHub Actions avec Artifactory

```yaml
name: Angular Migration Check

on: [push, pull_request]

jobs:
  migration-analysis:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        registry-url: https://artifactory.company.com/artifactory/api/npm/npm-virtual/
    
    - name: Configure npm
      run: |
        echo "registry=https://artifactory.company.com/artifactory/api/npm/npm-virtual/" > .npmrc
        echo "_authToken=\${NPM_TOKEN}" >> .npmrc
      env:
        NPM_TOKEN: ${{ secrets.ARTIFACTORY_TOKEN }}
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run migration analysis
      run: |
        npx angular-migration-analyzer analyze --format json --output migration-report.json
        npx angular-migration-analyzer doctor
      env:
        NPM_TOKEN: ${{ secrets.ARTIFACTORY_TOKEN }}
        NODE_TLS_REJECT_UNAUTHORIZED: '0'
```

Cette configuration enterprise permet à la librairie de fonctionner dans tous les environnements d'entreprise, même les plus restrictifs ! 🚀