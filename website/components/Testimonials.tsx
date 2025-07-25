'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Marie Dubois',
    role: 'Lead Developer',
    company: 'TechCorp France',
    content: 'Angular Migration Analyzer nous a fait gagner des semaines de travail lors de notre migration vers Angular 17. L\'analyse des dépendances est incroyablement précise.',
    rating: 5,
    image: '/avatars/avatar1.jpg'
  },
  {
    name: 'Thomas Bernard',
    role: 'DevOps Engineer',
    company: 'StartupXYZ',
    content: 'Le mode dry-run est génial ! On peut tester toutes les modifications sans risque. L\'intégration CI/CD fonctionne parfaitement avec notre pipeline GitLab.',
    rating: 5,
    image: '/avatars/avatar2.jpg'
  },
  {
    name: 'Sophie Martin',
    role: 'Architecte Logiciel',
    company: 'BigCorp International',
    content: 'Nous gérons plus de 50 projets Angular dans notre monorepo. Cet outil est devenu indispensable pour maintenir la cohérence et la sécurité de nos dépendances.',
    rating: 5,
    image: '/avatars/avatar3.jpg'
  }
]

const stats = [
  { value: '10k+', label: 'Téléchargements npm' },
  { value: '500+', label: 'Entreprises' },
  { value: '98%', label: 'Satisfaction' },
  { value: '4.9/5', label: 'Note moyenne' }
]

export default function Testimonials() {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ce que disent nos utilisateurs
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Des développeurs du monde entier font confiance à Angular Migration Analyzer
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-angular-red mb-2">
                {stat.value}
              </div>
              <div className="text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-lg p-6 shadow-sm relative"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-muted/20" />
              
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>

              <p className="text-muted-foreground mb-6 relative z-10">
                "{testimonial.content}"
              </p>

              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-angular-red to-angular-dark rounded-full flex items-center justify-center text-white font-bold">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="ml-3">
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role} • {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-lg text-muted-foreground mb-6">
            Rejoignez des milliers de développeurs qui utilisent Angular Migration Analyzer
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#installation"
              className="bg-angular-red text-white px-6 py-3 rounded-lg hover:bg-angular-dark transition-colors"
            >
              Commencer maintenant
            </a>
            <a
              href="https://github.com/your-org/angular-migration-analyzer/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Rejoindre la communauté
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}