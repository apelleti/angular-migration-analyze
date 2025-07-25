'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, Terminal, Package, Zap } from 'lucide-react'

const installMethods = [
  {
    id: 'npm-global',
    title: 'Installation globale (recommandé)',
    icon: Package,
    command: 'npm install -g angular-migration-analyzer',
    description: 'Installez l\'outil globalement pour l\'utiliser sur tous vos projets'
  },
  {
    id: 'npm-local',
    title: 'Installation locale',
    icon: Package,
    command: 'npm install --save-dev angular-migration-analyzer',
    description: 'Ajoutez l\'outil aux dépendances de développement de votre projet'
  },
  {
    id: 'npx',
    title: 'Utilisation avec npx',
    icon: Zap,
    command: 'npx angular-migration-analyzer analyze',
    description: 'Utilisez directement sans installation (nécessite npm 5.2+)'
  }
]

export default function Installation() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <section id="installation" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Installation rapide
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Commencez à analyser vos projets Angular en moins de 30 secondes
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {installMethods.map((method, index) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-lg p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <method.icon className="w-8 h-8 text-angular-red" />
                <span className="text-sm text-muted-foreground">Option {index + 1}</span>
              </div>
              
              <h3 className="text-xl font-semibold mb-2">{method.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{method.description}</p>
              
              <div className="relative">
                <div className="bg-gray-900 rounded-lg p-3 pr-12 font-mono text-sm text-gray-300 overflow-x-auto">
                  {method.command}
                </div>
                <button
                  onClick={() => copyToClipboard(method.command, method.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-800 rounded transition-colors"
                >
                  {copiedId === method.id ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick start guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-lg p-8 shadow-sm"
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center">
            <Terminal className="w-6 h-6 mr-2 text-angular-red" />
            Démarrage rapide
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold mb-3">1. Naviguer vers votre projet</h4>
              <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm text-gray-300 mb-6">
                cd /chemin/vers/mon-projet-angular
              </div>

              <h4 className="font-semibold mb-3">2. Lancer l'analyse</h4>
              <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm text-gray-300 mb-6">
                ng-migrate analyze
              </div>

              <h4 className="font-semibold mb-3">3. Appliquer les corrections</h4>
              <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm text-gray-300">
                ng-migrate fix --dry-run
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Options utiles</h4>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-angular-red mr-2">•</span>
                  <div>
                    <code className="bg-muted px-2 py-1 rounded text-sm">--format html</code>
                    <span className="text-muted-foreground ml-2">Générer un rapport HTML</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-angular-red mr-2">•</span>
                  <div>
                    <code className="bg-muted px-2 py-1 rounded text-sm">--fail-on-critical</code>
                    <span className="text-muted-foreground ml-2">Échouer si problèmes critiques</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-angular-red mr-2">•</span>
                  <div>
                    <code className="bg-muted px-2 py-1 rounded text-sm">--only security</code>
                    <span className="text-muted-foreground ml-2">Analyse de sécurité uniquement</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-angular-red mr-2">•</span>
                  <div>
                    <code className="bg-muted px-2 py-1 rounded text-sm">--monorepo</code>
                    <span className="text-muted-foreground ml-2">Mode monorepo</span>
                  </div>
                </li>
              </ul>

              <div className="mt-6 p-4 bg-angular-red/10 rounded-lg border border-angular-red/20">
                <p className="text-sm">
                  <strong className="text-angular-red">💡 Astuce :</strong> Utilisez <code className="bg-gray-800 px-1 rounded">ng-migrate --help</code> pour voir toutes les options disponibles
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}