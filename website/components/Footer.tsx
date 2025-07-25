'use client'

import Link from 'next/link'
import { Github, Twitter, MessageCircle, Mail, Heart } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: [
      { label: 'Fonctionnalités', href: '#features' },
      { label: 'Démo', href: '#demo' },
      { label: 'Installation', href: '#installation' },
      { label: 'Cas d\'usage', href: '#use-cases' }
    ],
    resources: [
      { label: 'Documentation', href: 'https://github.com/your-org/angular-migration-analyzer/blob/main/docs/index.md' },
      { label: 'Guide de démarrage', href: 'https://github.com/your-org/angular-migration-analyzer/blob/main/docs/getting-started/quick-start.md' },
      { label: 'API Reference', href: 'https://github.com/your-org/angular-migration-analyzer/blob/main/docs/api/index.md' },
      { label: 'Exemples', href: 'https://github.com/your-org/angular-migration-analyzer/tree/main/examples' }
    ],
    community: [
      { label: 'GitHub', href: 'https://github.com/your-org/angular-migration-analyzer' },
      { label: 'Discussions', href: 'https://github.com/your-org/angular-migration-analyzer/discussions' },
      { label: 'Issues', href: 'https://github.com/your-org/angular-migration-analyzer/issues' },
      { label: 'Contributing', href: 'https://github.com/your-org/angular-migration-analyzer/blob/main/CONTRIBUTING.md' }
    ],
    company: [
      { label: 'À propos', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Carrières', href: '#' },
      { label: 'Contact', href: 'mailto:support@angular-migration-analyzer.dev' }
    ]
  }

  const socialLinks = [
    { icon: Github, href: 'https://github.com/your-org/angular-migration-analyzer', label: 'GitHub' },
    { icon: Twitter, href: 'https://twitter.com/angular', label: 'Twitter' },
    { icon: MessageCircle, href: 'https://discord.gg/angular', label: 'Discord' },
    { icon: Mail, href: 'mailto:support@angular-migration-analyzer.dev', label: 'Email' }
  ]

  return (
    <footer className="bg-background border-t">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-angular-red rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="font-bold text-xl">Migration Analyzer</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              L'outil de référence pour analyser et migrer vos projets Angular
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  aria-label={link.label}
                >
                  <link.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-3">Produit</h3>
              <ul className="space-y-2">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Ressources</h3>
              <ul className="space-y-2">
                {footerLinks.resources.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Communauté</h3>
              <ul className="space-y-2">
                {footerLinks.community.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Entreprise</h3>
              <ul className="space-y-2">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-muted-foreground mb-4 md:mb-0">
              © {currentYear} Angular Migration Analyzer. Tous droits réservés.
            </p>
            <p className="text-sm text-muted-foreground flex items-center">
              Fait avec <Heart className="w-4 h-4 mx-1 text-angular-red fill-angular-red" /> par la communauté Angular
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}