import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://angular-migration-analyzer.dev'),
  title: 'Angular Migration Analyzer - Analysez et migrez vos projets Angular',
  description: 'Outil puissant pour analyser les dépendances Angular, identifier les problèmes de compatibilité et générer des plans de migration détaillés.',
  keywords: 'angular, migration, analyzer, dependencies, npm, typescript, angular 18, angular 17',
  authors: [{ name: 'Angular Migration Analyzer Team' }],
  openGraph: {
    title: 'Angular Migration Analyzer',
    description: 'Analysez et migrez vos projets Angular en toute confiance',
    type: 'website',
    locale: 'fr_FR',
    url: 'https://angular-migration-analyzer.dev',
    siteName: 'Angular Migration Analyzer',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Angular Migration Analyzer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Angular Migration Analyzer',
    description: 'Analysez et migrez vos projets Angular en toute confiance',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  )
}