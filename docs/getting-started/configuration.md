# Configuration

Ce guide détaille toutes les options de configuration disponibles pour Angular Migration Analyzer.

## 📁 Fichier de configuration

### Création du fichier

Pour générer un fichier de configuration par défaut :

```bash
ng-migrate init
```

Cela crée un fichier `.ng-migrate.json` dans votre projet.

### Structure complète

```json
{
  "registry": "https://registry.npmjs.org",
  "cache": {
    "enabled": true,
    "ttl": 300000,
    "maxSize": 100
  },
  "network": {
    "timeout": 30000,
    "retries": 3,
    "retryDelay": 1000,
    "strictSSL": true,
    "proxy": {
      "enabled": false,
      "host": "proxy.company.com",
      "port": 8080,
      "protocol": "http",
      "auth": {
        "username": "user",
        "password": "pass"
      },
      "noProxy": ["localhost", "127.0.0.1"]
    }
  },
  "analysis": {
    "includeDevDependencies": true,
    "checkVulnerabilities": true,
    "checkLicenses": true,
    "offlineMode": false,
    "excludePackages": [
      "@types/*",
      "eslint-*"
    ],
    "customAnalyzers": []
  },
  "output": {
    "colors": true,
    "emoji": true,
    "verbose": false,
    "quiet": false
  },
  "rules": {
    "peerDependencies": {
      "severity": "error",
      "allowOptional": true
    },
    "versionConflicts": {
      "severity": "warning",
      "strategy": "highest"
    },
    "security": {
      "auditLevel": "moderate",
      "failOnVulnerabilities": false
    },
    "performance": {
      "maxBundleSize": 5000000,
      "warnDuplicates": true
    }
  }
}
```

## 🔧 Options de configuration

### Registry

URL du registre npm à utiliser.

```json
{
  "registry": "https://registry.npmjs.org"
}
```

**Cas d'usage** :
- Registre privé d'entreprise
- Mirror local pour performances

### Cache

Gère la mise en cache des requêtes npm.

```json
{
  "cache": {
    "enabled": true,        // Activer/désactiver le cache
    "ttl": 300000,         // Durée de vie en ms (5 minutes)
    "maxSize": 100         // Nombre max d'entrées
  }
}
```

**Recommandations** :
- Désactiver pour les builds CI/CD
- Augmenter TTL pour les environnements stables

### Network

Configuration réseau et proxy.

```json
{
  "network": {
    "timeout": 30000,      // Timeout en ms
    "retries": 3,          // Nombre de réessais
    "retryDelay": 1000,    // Délai entre réessais
    "strictSSL": true      // Vérification SSL
  }
}
```

#### Configuration proxy

```json
{
  "network": {
    "proxy": {
      "enabled": true,
      "host": "proxy.company.com",
      "port": 8080,
      "protocol": "http",
      "auth": {
        "username": "${PROXY_USER}",     // Variables d'environnement
        "password": "${PROXY_PASSWORD}"
      },
      "noProxy": [
        "localhost",
        "127.0.0.1",
        "*.internal.company.com"
      ]
    }
  }
}
```

### Analysis

Options d'analyse.

```json
{
  "analysis": {
    "includeDevDependencies": true,   // Analyser devDependencies
    "checkVulnerabilities": true,     // Vérifier vulnérabilités
    "checkLicenses": true,           // Vérifier licences
    "offlineMode": false,            // Mode hors ligne
    "excludePackages": [             // Packages à ignorer
      "@types/*",
      "eslint-*",
      "@internal/legacy-*"
    ]
  }
}
```

### Output

Personnalisation de l'affichage.

```json
{
  "output": {
    "colors": true,       // Couleurs dans le terminal
    "emoji": true,        // Emojis dans l'affichage
    "verbose": false,     // Mode verbeux
    "quiet": false        // Mode silencieux
  }
}
```

### Rules

Règles d'analyse personnalisées.

```json
{
  "rules": {
    "peerDependencies": {
      "severity": "error",      // error | warning | info
      "allowOptional": true     // Ignorer les optionnelles
    },
    "versionConflicts": {
      "severity": "warning",
      "strategy": "highest"     // highest | lowest | interactive
    },
    "security": {
      "auditLevel": "moderate", // low | moderate | high | critical
      "failOnVulnerabilities": false
    },
    "performance": {
      "maxBundleSize": 5000000, // 5MB en octets
      "warnDuplicates": true
    }
  }
}
```

## 🌍 Variables d'environnement

Les variables d'environnement ont priorité sur le fichier de configuration.

### Variables disponibles

| Variable | Description | Exemple |
|----------|-------------|----------|
| `NG_MIGRATE_REGISTRY` | URL du registre | `https://registry.npmjs.org` |
| `NG_MIGRATE_CACHE` | Activer le cache | `true` / `false` |
| `NG_MIGRATE_TIMEOUT` | Timeout réseau (ms) | `60000` |
| `HTTP_PROXY` | Proxy HTTP | `http://proxy:8080` |
| `HTTPS_PROXY` | Proxy HTTPS | `https://proxy:8443` |
| `NO_PROXY` | Exclusions proxy | `localhost,127.0.0.1` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Vérif SSL | `0` / `1` |

### Utilisation

```bash
# Désactiver le cache temporairement
NG_MIGRATE_CACHE=false ng-migrate analyze

# Utiliser un proxy
HTTP_PROXY=http://proxy:8080 ng-migrate analyze

# Mode débogage avec timeout étendu
NG_MIGRATE_TIMEOUT=120000 ng-migrate analyze --verbose
```

## 🏭 Configurations par environnement

### Développement

```json
{
  "cache": {
    "enabled": true,
    "ttl": 600000
  },
  "output": {
    "verbose": true,
    "colors": true,
    "emoji": true
  }
}
```

### CI/CD

```json
{
  "cache": {
    "enabled": false
  },
  "output": {
    "colors": false,
    "emoji": false,
    "quiet": true
  },
  "rules": {
    "security": {
      "failOnVulnerabilities": true
    }
  }
}
```

### Production

```json
{
  "analysis": {
    "checkVulnerabilities": true,
    "checkLicenses": true
  },
  "rules": {
    "peerDependencies": {
      "severity": "error"
    },
    "security": {
      "auditLevel": "high",
      "failOnVulnerabilities": true
    }
  }
}
```

## 🔌 Configurations spécifiques

### Monorepo

```json
{
  "analysis": {
    "workspaces": true,
    "excludePackages": [
      "@internal/*"
    ]
  },
  "output": {
    "groupByWorkspace": true
  }
}
```

### Registre privé

```json
{
  "registry": "https://npm.company.com",
  "network": {
    "strictSSL": false,
    "auth": {
      "token": "${NPM_TOKEN}"
    }
  },
  "scopes": {
    "@company": {
      "registry": "https://npm.company.com"
    }
  }
}
```

### Mode offline

```json
{
  "analysis": {
    "offlineMode": true
  },
  "cache": {
    "enabled": true,
    "ttl": 86400000  // 24 heures
  }
}
```

## 🛠️ Configuration avancée

### Analyzers personnalisés

```json
{
  "analysis": {
    "customAnalyzers": [
      {
        "name": "company-policy",
        "path": "./analyzers/company-policy.js",
        "enabled": true
      }
    ]
  }
}
```

### Hooks

```json
{
  "hooks": {
    "preAnalysis": "./scripts/pre-analysis.sh",
    "postAnalysis": "./scripts/post-analysis.sh",
    "onError": "./scripts/on-error.sh"
  }
}
```

### Templates de rapport

```json
{
  "output": {
    "templates": {
      "html": "./templates/custom-report.hbs",
      "markdown": "./templates/custom-report.md"
    }
  }
}
```

## 🔔 Bonnes pratiques

1. **Versionner la configuration**
   ```bash
   git add .ng-migrate.json
   git commit -m "chore: add migration analyzer config"
   ```

2. **Utiliser des variables d'environnement pour les secrets**
   ```json
   {
     "network": {
       "proxy": {
         "auth": {
           "password": "${PROXY_PASSWORD}"
         }
       }
     }
   }
   ```

3. **Configurations multiples**
   ```bash
   # Développement
   ng-migrate analyze --config .ng-migrate.dev.json
   
   # Production
   ng-migrate analyze --config .ng-migrate.prod.json
   ```

4. **Validation de configuration**
   ```bash
   ng-migrate config validate
   ```

## 🔄 Migration de configuration

Pour migrer depuis une ancienne version :

```bash
ng-migrate config migrate
```

Cela met à jour automatiquement votre configuration vers le format actuel.

## Exemples de configurations

- [Configuration basique](../examples/basic-analysis/config.json)
- [Configuration entreprise](../examples/enterprise-setup/config.json)
- [Configuration CI/CD](../examples/ci-cd/config.json)

## Prochaines étapes

- [Guide de migration Angular](../guides/angular-17-to-18.md)
- [Intégration CI/CD](../guides/ci-cd-integration.md)
- [Analyzers personnalisés](../examples/custom-analyzers/README.md)