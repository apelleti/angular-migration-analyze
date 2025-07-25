# Guide de déploiement du site web

## Options d'hébergement gratuit

### 1. Vercel (Recommandé)

**Déploiement en 3 étapes:**

1. Installez Vercel CLI:
```bash
npm i -g vercel
```

2. Dans le dossier `/website`, exécutez:
```bash
vercel
```

3. Suivez les instructions:
   - Connectez-vous à votre compte Vercel
   - Choisissez un nom de projet
   - Confirmez les paramètres par défaut

**Déploiement automatique depuis GitHub:**
1. Allez sur https://vercel.com/new
2. Importez votre repository GitHub
3. Configurez le root directory: `website`
4. Déployez!

### 2. Netlify

**Déploiement manuel:**
```bash
cd website
npm run build
npm run export  # Si configuré
# Glissez-déposez le dossier 'out' sur Netlify
```

**Déploiement depuis Git:**
1. Connectez votre repo sur app.netlify.com
2. Configuration:
   - Base directory: `website`
   - Build command: `npm run build`
   - Publish directory: `.next`

### 3. GitHub Pages

**Configuration:**
1. Ajoutez dans `website/next.config.js`:
```javascript
const isProd = process.env.NODE_ENV === 'production'
module.exports = {
  assetPrefix: isProd ? '/angular-migration-analyze/' : '',
  basePath: isProd ? '/angular-migration-analyze' : '',
}
```

2. Créez un workflow GitHub Actions:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd website && npm ci
      - run: cd website && npm run build
      - run: cd website && npm run export
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./website/out
```

### 4. Cloudflare Pages

1. Connectez-vous à https://pages.cloudflare.com
2. Créez un nouveau projet depuis Git
3. Configuration:
   - Root directory: `website`
   - Build command: `npm run build`
   - Build output: `.next`

## Variables d'environnement

Si nécessaire, créez `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_GA_ID=UA-XXXXXXXXX-X
```

## Domaine personnalisé

### Vercel
1. Dashboard → Settings → Domains
2. Ajoutez votre domaine
3. Configurez les DNS

### Netlify
1. Site settings → Domain management
2. Add custom domain
3. Suivez les instructions DNS

## Optimisations recommandées

1. **Images**: Utilisez `next/image` pour l'optimisation automatique
2. **Fonts**: Chargez les fonts avec `next/font`
3. **Analytics**: Ajoutez Vercel Analytics (gratuit)
4. **Monitoring**: Utilisez Vercel Speed Insights

## Commandes utiles

```bash
# Build local
cd website
npm run build

# Preview production
npm run start

# Analyser le bundle
npm run analyze
```

## Checklist pré-déploiement

- [ ] Supprimer les console.log
- [ ] Vérifier les liens morts
- [ ] Tester sur mobile
- [ ] Optimiser les images
- [ ] Configurer les meta tags SEO
- [ ] Ajouter favicon
- [ ] Tester les formulaires
- [ ] Vérifier HTTPS