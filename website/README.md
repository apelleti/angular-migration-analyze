# Angular Migration Analyzer Website

This is the official website for Angular Migration Analyzer, built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- 🎨 Modern, responsive design
- 🌙 Dark mode support
- ⚡ Fast performance with Next.js 14
- 🎭 Smooth animations with Framer Motion
- 📱 Mobile-friendly
- 🔍 SEO optimized
- 📊 Interactive demo
- 💻 Syntax highlighting for code examples

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the website.

### Build for Production

```bash
# Create production build
npm run build

# Start production server
npm start
```

## Project Structure

```
website/
├── app/                # Next.js app directory
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page
├── components/        # React components
│   ├── Hero.tsx      # Hero section
│   ├── Features.tsx  # Features section
│   ├── Demo.tsx      # Interactive demo
│   └── ...
├── lib/              # Utility functions
│   └── utils.ts      # Helper functions
└── public/           # Static assets
```

## Components

### Hero
The main landing section with animated terminal preview and call-to-action buttons.

### Features
Grid layout showcasing the main features of Angular Migration Analyzer.

### Demo
Interactive demo with multiple output formats (Terminal, JSON, Script, Fix commands).

### Installation
Different installation methods with copy-to-clipboard functionality.

### UseCases
Real-world use cases and enterprise features.

### Testimonials
User testimonials and statistics.

## Customization

### Colors
Edit the color scheme in `tailwind.config.ts`:

```typescript
colors: {
  angular: {
    red: '#dd0031',
    dark: '#c3002f',
  },
  // ... other colors
}
```

### Content
All content is directly in the components. To update:
- Edit component files in `/components`
- Update metadata in `app/layout.tsx`

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Deploy with default settings

### Other Platforms

```bash
# Build static export
npm run build

# The output will be in the .next folder
```

## Environment Variables

No environment variables required for basic functionality.

For analytics or other services, create `.env.local`:

```
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT