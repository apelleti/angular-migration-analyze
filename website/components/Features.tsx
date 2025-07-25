'use client'

import { motion } from 'framer-motion'
import { 
  Shield, 
  Zap, 
  Package, 
  GitBranch, 
  Globe, 
  FileJson,
  CheckCircle2,
  AlertCircle,
  Gauge,
  Code2
} from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Analyse de sécurité',
    description: 'Détection des vulnérabilités CVE et des packages obsolètes pour garder votre projet sécurisé.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  {
    icon: Zap,
    title: 'Performance optimisée',
    description: 'Analyse parallélisée avec p-limit pour des résultats rapides même sur de gros projets.',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10'
  },
  {
    icon: Package,
    title: 'Peer Dependencies',
    description: 'Détection complète des dépendances manquantes et des conflits de versions.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  {
    icon: GitBranch,
    title: 'Support Monorepo',
    description: 'Analysez plusieurs projets simultanément dans vos workspaces Nx ou Lerna.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  {
    icon: Globe,
    title: 'Mode Offline',
    description: 'Fonctionne sans connexion internet grâce au cache intelligent.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  {
    icon: FileJson,
    title: 'Rapports détaillés',
    description: 'Exportez en HTML, JSON ou Markdown pour une intégration facile.',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10'
  }
]

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Fonctionnalités puissantes
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour analyser et migrer vos projets Angular en toute sérénité
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Additional features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 bg-card rounded-lg p-8 shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 flex items-center">
                <Gauge className="w-6 h-6 mr-2 text-angular-red" />
                Score de santé intelligent
              </h3>
              <p className="text-muted-foreground mb-4">
                Notre algorithme analyse votre projet sous tous les angles et génère un score de santé global.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                  <span>Analyse des dépendances</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                  <span>Détection des vulnérabilités</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                  <span>Compatibilité des versions</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                  <span>Performance du bundle</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4 flex items-center">
                <Code2 className="w-6 h-6 mr-2 text-angular-red" />
                Mode Dry-Run sécurisé
              </h3>
              <p className="text-muted-foreground mb-4">
                Prévisualisez tous les changements avant de les appliquer. Aucun risque, aucune surprise.
              </p>
              <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono">
                <div className="text-gray-400">$ ng-migrate fix --dry-run</div>
                <div className="mt-2 text-green-400">✅ npm install @angular/animations@^17.0.0</div>
                <div className="text-yellow-400">🔄 ng update @angular/core@18</div>
                <div className="text-blue-400">📦 npm audit fix</div>
                <div className="mt-2 text-gray-500">💭 Aucune modification effectuée (dry-run)</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}