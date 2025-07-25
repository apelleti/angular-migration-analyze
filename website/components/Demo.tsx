'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Terminal, FileJson, FileText, Code } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const demoOutputs = {
  terminal: `$ ng-migrate analyze

🚀 Démarrage de l'analyse complète...
🔍 Analyse des peer dependencies via npm registry...
🔍 Analyse de compatibilité des versions...
🔍 Analyse des packages Angular...
🔍 Analyse de sécurité...
🔍 Analyse de performance...
🔍 Analyse de configuration...
✅ Analyse terminée (2341ms)

📊 RÉSUMÉ DE L'ANALYSE
╔══════════════════════════════════════════════════════╗
║ 🟡 Score de santé: 75/100                            ║
╠══════════════════════════════════════════════════════╣
║ 🚨 Problèmes critiques: 1                            ║
║ ⚠️  Avertissements: 3                                 ║
║ 🅰️  Packages Angular: 12                              ║
║ 💡 Recommandations: 4                                 ║
╚══════════════════════════════════════════════════════╝

❌ Peer Dependencies manquantes:
┌─────────────────────┬──────────────────┬───────────┬───────────┐
│ Package             │ Requis par       │ Version   │ Sévérité  │
├─────────────────────┼──────────────────┼───────────┼───────────┤
│ @angular/animations │ @angular/common  │ ^17.0.0   │ 🚨 Critique│
└─────────────────────┴──────────────────┴───────────┴───────────┘

⚠️  Conflits de versions:
┌─────────────────────┬──────────────────┬───────────┬───────────┐
│ Package             │ Version requise  │ Installée │ Conflit   │
├─────────────────────┼──────────────────┼───────────┼───────────┤
│ rxjs                │ 7.5.0 / 7.8.0    │ 7.5.0     │ Multiple  │
└─────────────────────┴──────────────────┴───────────┴───────────┘

💡 Recommandations:
1. Installer @angular/animations pour résoudre les peer dependencies
   npm install @angular/animations@^17.0.0

2. Mettre à jour rxjs vers la version 7.8.0
   npm install rxjs@7.8.0

3. Mettre à jour @angular/core vers la dernière version stable
   ng update @angular/core@17.3.0

4. Exécuter un audit de sécurité après les mises à jour
   npm audit fix`,

  json: `{
  "summary": {
    "healthScore": 75,
    "criticalCount": 1,
    "warningCount": 3,
    "angularPackages": 12,
    "recommendationCount": 4,
    "analyzedAt": "2024-03-15T10:30:00Z",
    "projectPath": "/my-angular-project",
    "version": "1.0.0"
  },
  "missingPeerDeps": [
    {
      "package": "@angular/animations",
      "requiredBy": "@angular/common",
      "requiredVersion": "^17.0.0",
      "severity": "critical",
      "impact": "Application may fail to compile or run"
    }
  ],
  "versionConflicts": [
    {
      "package": "rxjs",
      "conflicts": [
        {
          "requiredBy": "@angular/common",
          "version": "7.5.0"
        },
        {
          "requiredBy": "@ngrx/store",
          "version": "7.8.0"
        }
      ],
      "installedVersion": "7.5.0",
      "recommendedVersion": "7.8.0"
    }
  ],
  "vulnerabilities": {
    "critical": 0,
    "high": 1,
    "moderate": 2,
    "low": 3,
    "packages": [
      {
        "name": "lodash",
        "severity": "high",
        "cve": "CVE-2021-23337"
      }
    ]
  },
  "recommendations": [
    {
      "type": "install",
      "package": "@angular/animations",
      "version": "^17.0.0",
      "command": "npm install @angular/animations@^17.0.0",
      "priority": "high",
      "effort": "2 minutes"
    },
    {
      "type": "update",
      "package": "rxjs",
      "from": "7.5.0",
      "to": "7.8.0",
      "command": "npm install rxjs@7.8.0",
      "priority": "medium",
      "effort": "5 minutes"
    }
  ]
}`,

  script: `#!/bin/bash
# Script de migration généré par Angular Migration Analyzer
# Date: 2024-03-15
# Score de santé actuel: 75/100
# Objectif: Résoudre tous les problèmes critiques et warnings

set -e  # Arrêter en cas d'erreur

echo "🚀 Début de la migration Angular..."
echo "📋 Ce script va appliquer 4 corrections"
echo ""

# Sauvegarde du projet
echo "💾 Création d'une sauvegarde..."
git add -A
git commit -m "backup: avant migration Angular" || echo "Pas de changements à sauvegarder"

# Étape 1: Installer les peer dependencies manquantes
echo ""
echo "📦 [1/4] Installation des peer dependencies manquantes..."
npm install @angular/animations@^17.0.0
echo "✅ @angular/animations installé"

# Étape 2: Résoudre les conflits de versions
echo ""
echo "🔧 [2/4] Résolution des conflits de versions..."
npm install rxjs@7.8.0
echo "✅ rxjs mis à jour vers 7.8.0"

# Étape 3: Mettre à jour Angular
echo ""
echo "🔄 [3/4] Mise à jour d'Angular..."
ng update @angular/core@17.3.0 @angular/cli@17.3.0
echo "✅ Angular mis à jour vers 17.3.0"

# Étape 4: Corrections de sécurité
echo ""
echo "🛡️  [4/4] Application des corrections de sécurité..."
npm audit fix
echo "✅ Vulnérabilités corrigées"

# Tests finaux
echo ""
echo "🧪 Vérification de l'installation..."
npm test -- --watchAll=false || echo "⚠️  Certains tests échouent, vérification manuelle nécessaire"

echo ""
echo "✅ Migration terminée avec succès!"
echo "📈 Nouveau score de santé estimé: 95/100"
echo ""
echo "Prochaines étapes:"
echo "1. Vérifier que l'application compile: npm start"
echo "2. Lancer les tests: npm test"
echo "3. Commiter les changements: git add -A && git commit -m 'chore: migration Angular 17.3.0'"`,

  fix: `$ ng-migrate fix

🔧 Analyse des corrections possibles...

📋 Corrections suggérées:

1. 🚨 CRITIQUE: Installer @angular/animations
   Commande: npm install @angular/animations@^17.0.0
   Impact: Résout les erreurs de compilation
   Effort: 2 minutes

2. ⚠️  IMPORTANT: Mettre à jour rxjs
   Commande: npm install rxjs@7.8.0
   Impact: Résout les conflits de versions
   Effort: 5 minutes

3. 💡 RECOMMANDÉ: Mettre à jour Angular
   Commande: ng update @angular/core@17.3.0 @angular/cli@17.3.0
   Impact: Corrections de bugs et améliorations
   Effort: 15 minutes

4. 🛡️  SÉCURITÉ: Corriger les vulnérabilités
   Commande: npm audit fix
   Impact: Corrige 6 vulnérabilités
   Effort: 5 minutes

Options disponibles:
  --apply        Appliquer toutes les corrections automatiquement
  --interactive  Mode interactif pour sélectionner les corrections
  --dry-run      Simuler les corrections sans les appliquer
  --script       Générer un script exécutable

Exemple: ng-migrate fix --dry-run`
}

type OutputType = keyof typeof demoOutputs

export default function Demo() {
  const [selectedOutput, setSelectedOutput] = useState<OutputType>('terminal')
  const [isPlaying, setIsPlaying] = useState(false)

  const outputs = [
    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'json', label: 'JSON', icon: FileJson },
    { id: 'script', label: 'Script', icon: Code },
    { id: 'fix', label: 'Corrections', icon: FileText },
  ]

  const handlePlay = () => {
    setIsPlaying(true)
    setTimeout(() => setIsPlaying(false), 2000)
  }

  return (
    <section id="demo" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Démo interactive
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Découvrez Angular Migration Analyzer en action avec des exemples réels
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-lg shadow-lg overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex items-center justify-between border-b bg-muted/30 px-4">
            <div className="flex space-x-1">
              {outputs.map((output) => (
                <button
                  key={output.id}
                  onClick={() => setSelectedOutput(output.id as OutputType)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                    selectedOutput === output.id
                      ? 'border-angular-red text-angular-red'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <output.icon className="w-4 h-4" />
                  <span>{output.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handlePlay}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isPlaying
                  ? 'bg-green-500 text-white'
                  : 'bg-angular-red text-white hover:bg-angular-dark'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>{isPlaying ? 'En cours...' : 'Exécuter'}</span>
            </button>
          </div>

          {/* Output */}
          <div className="p-0">
            {selectedOutput === 'terminal' ? (
              <div className="bg-gray-900 p-6 font-mono text-sm">
                <pre className="text-gray-300 whitespace-pre-wrap">
                  {isPlaying ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {demoOutputs[selectedOutput]}
                    </motion.span>
                  ) : (
                    demoOutputs[selectedOutput]
                  )}
                </pre>
              </div>
            ) : (
              <SyntaxHighlighter
                language={selectedOutput === 'json' ? 'json' : 'bash'}
                style={atomDark}
                customStyle={{
                  margin: 0,
                  padding: '1.5rem',
                  fontSize: '0.875rem',
                }}
              >
                {demoOutputs[selectedOutput]}
              </SyntaxHighlighter>
            )}
          </div>
        </motion.div>

        {/* Features highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="bg-card p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-angular-red mb-1">2.3s</div>
            <div className="text-sm text-muted-foreground">Temps d'analyse</div>
          </div>
          <div className="bg-card p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-angular-red mb-1">6</div>
            <div className="text-sm text-muted-foreground">Analyzers parallèles</div>
          </div>
          <div className="bg-card p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-angular-red mb-1">100%</div>
            <div className="text-sm text-muted-foreground">Précision</div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}