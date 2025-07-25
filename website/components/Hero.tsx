'use client'

import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Zap, Shield } from 'lucide-react'
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-angular-red/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl" />
      </div>

      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center space-x-2 bg-angular-red/10 text-angular-red px-4 py-2 rounded-full mb-6">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Nouveau : Support Angular 18 🚀</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-angular-red to-angular-dark bg-clip-text text-transparent">
            Angular Migration Analyzer
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Analysez, optimisez et migrez vos projets Angular en toute confiance avec notre outil puissant et intelligent
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="#demo"
              className="flex items-center space-x-2 bg-angular-red text-white px-6 py-3 rounded-lg hover:bg-angular-dark transition-colors group"
            >
              <span>Voir la démo</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="#installation"
              className="flex items-center space-x-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <span>Installation rapide</span>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card p-6 rounded-lg shadow-sm"
            >
              <div className="text-3xl font-bold text-angular-red mb-2">90%+</div>
              <div className="text-muted-foreground">Couverture de tests</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card p-6 rounded-lg shadow-sm"
            >
              <div className="text-3xl font-bold text-angular-red mb-2">5x</div>
              <div className="text-muted-foreground">Plus rapide</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card p-6 rounded-lg shadow-sm"
            >
              <div className="text-3xl font-bold text-angular-red mb-2">1000+</div>
              <div className="text-muted-foreground">Projets analysés</div>
            </motion.div>
          </div>

          {/* Terminal Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <div className="bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center space-x-2 px-4 py-3 bg-gray-800">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-gray-400 text-sm ml-2">Terminal</span>
              </div>
              <div className="p-4 text-sm font-mono">
                <div className="text-gray-400">$ ng-migrate analyze</div>
                <div className="mt-2">
                  <span className="text-green-400">🚀 Démarrage de l'analyse complète...</span>
                </div>
                <div className="mt-1">
                  <span className="text-blue-400">🔍 Analyse des peer dependencies...</span>
                </div>
                <div className="mt-1">
                  <span className="text-green-400">✅ Analyse terminée (2341ms)</span>
                </div>
                <div className="mt-4">
                  <span className="text-yellow-400">🟡 Score de santé: 75/100</span>
                </div>
                <div className="mt-1">
                  <span className="text-red-400">🚨 Problèmes critiques: 1</span>
                </div>
                <div className="mt-1">
                  <span className="text-orange-400">⚠️  Avertissements: 3</span>
                </div>
                <div className="mt-1">
                  <span className="text-blue-400">💡 Recommandations: 4</span>
                </div>
                <span className="terminal-cursor"></span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}