'use client'

import { motion } from 'framer-motion'
import { 
  Rocket, 
  Shield, 
  GitBranch, 
  Building2,
  Users,
  Cpu
} from 'lucide-react'

const useCases = [
  {
    icon: Rocket,
    title: 'Migration Angular',
    description: 'Préparez et exécutez vos migrations Angular en toute confiance',
    features: [
      'Analyse de compatibilité complète',
      'Plan de migration étape par étape',
      'Scripts automatisés de migration',
      'Rollback sécurisé'
    ],
    example: 'ng-migrate analyze --target-version 18'
  },
  {
    icon: Shield,
    title: 'Audit de sécurité',
    description: 'Identifiez et corrigez les vulnérabilités dans vos dépendances',
    features: [
      'Scan CVE en temps réel',
      'Rapports de sécurité détaillés',
      'Corrections automatiques',
      'Intégration CI/CD'
    ],
    example: 'ng-migrate analyze --only security --fail-on-high'
  },
  {
    icon: GitBranch,
    title: 'CI/CD Integration',
    description: 'Intégrez l\'analyse dans vos pipelines de déploiement',
    features: [
      'GitHub Actions ready',
      'GitLab CI support',
      'Jenkins compatible',
      'Webhooks et notifications'
    ],
    example: 'ng-migrate doctor --fail-on-critical'
  },
  {
    icon: Building2,
    title: 'Monorepo',
    description: 'Gérez efficacement vos workspaces Nx ou Lerna',
    features: [
      'Analyse multi-projets',
      'Dépendances partagées',
      'Rapports consolidés',
      'Optimisation des builds'
    ],
    example: 'ng-migrate analyze --monorepo'
  },
  {
    icon: Users,
    title: 'Collaboration d\'équipe',
    description: 'Partagez les analyses et coordonnez les mises à jour',
    features: [
      'Rapports HTML partageables',
      'Exports JSON pour tracking',
      'Scripts de migration versionnés',
      'Documentation automatique'
    ],
    example: 'ng-migrate analyze --format html --output report.html'
  },
  {
    icon: Cpu,
    title: 'Optimisation performance',
    description: 'Analysez et optimisez la taille de vos bundles',
    features: [
      'Détection des doublons',
      'Analyse de taille des packages',
      'Suggestions d\'optimisation',
      'Tree-shaking insights'
    ],
    example: 'ng-migrate analyze --only performance'
  }
]

export default function UseCases() {
  return (
    <section id="use-cases" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Cas d'usage
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Découvrez comment Angular Migration Analyzer peut transformer votre workflow de développement
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, index) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-lg p-6 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <useCase.icon className="w-10 h-10 text-angular-red group-hover:scale-110 transition-transform" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Use Case</span>
              </div>

              <h3 className="text-xl font-semibold mb-2">{useCase.title}</h3>
              <p className="text-muted-foreground mb-4">{useCase.description}</p>

              <ul className="space-y-2 mb-4">
                {useCase.features.map((feature) => (
                  <li key={feature} className="flex items-start text-sm">
                    <span className="text-angular-red mr-2">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <p className="text-xs text-muted-foreground mb-2">Exemple :</p>
                <code className="block bg-gray-900 text-gray-300 p-2 rounded text-xs font-mono overflow-x-auto">
                  {useCase.example}
                </code>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Enterprise section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 bg-gradient-to-r from-angular-red/10 to-angular-dark/10 rounded-lg p-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4">
                Solution Enterprise
              </h3>
              <p className="text-muted-foreground mb-6">
                Pour les grandes organisations avec des besoins spécifiques, nous offrons des fonctionnalités avancées et un support dédié.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Shield className="w-5 h-5 mr-3 text-angular-red" />
                  <span>Support des registres npm privés</span>
                </li>
                <li className="flex items-center">
                  <Building2 className="w-5 h-5 mr-3 text-angular-red" />
                  <span>Configuration proxy entreprise</span>
                </li>
                <li className="flex items-center">
                  <Users className="w-5 h-5 mr-3 text-angular-red" />
                  <span>Tableaux de bord centralisés</span>
                </li>
                <li className="flex items-center">
                  <Cpu className="w-5 h-5 mr-3 text-angular-red" />
                  <span>API REST pour intégration custom</span>
                </li>
              </ul>
            </div>
            <div className="bg-card rounded-lg p-6 shadow-lg">
              <h4 className="font-semibold mb-4">Configuration Enterprise</h4>
              <pre className="bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-300 overflow-x-auto">
{`{
  "registry": "https://npm.company.com",
  "network": {
    "proxy": {
      "enabled": true,
      "host": "proxy.company.com",
      "port": 8080
    }
  },
  "analysis": {
    "customAnalyzers": [
      "./analyzers/company-policy.js"
    ]
  }
}`}
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}