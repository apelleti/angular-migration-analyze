'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Code2, 
  Shield, 
  Zap, 
  Package, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Terminal,
  FileJson,
  Globe,
  Gauge,
  GitBranch,
  Download
} from 'lucide-react'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import Demo from '@/components/Demo'
import Installation from '@/components/Installation'
import UseCases from '@/components/UseCases'
import Footer from '@/components/Footer'
import Navigation from '@/components/Navigation'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <main>
        <Hero />
        <Features />
        <Demo />
        <Installation />
        <UseCases />
      </main>

      <Footer />
    </div>
  )
}