#!/bin/bash

# Script pour corriger rapidement les erreurs de build

echo "🔧 Correction des erreurs de build..."

# 1. Corriger les types any dans CommandGenerator.ts
sed -i 's/dep)/dep: any)/g' src/utils/CommandGenerator.ts
sed -i 's/pkg)/pkg: any)/g' src/utils/CommandGenerator.ts
sed -i 's/p)/p: any)/g' src/utils/CommandGenerator.ts

# 2. Corriger les valeurs par défaut dans ConfigurationManager.ts
sed -i 's/ttl?: number/ttl: number = 300000/g' src/utils/ConfigurationManager.ts
sed -i 's/maxSize?: number/maxSize: number = 100/g' src/utils/ConfigurationManager.ts
sed -i 's/timeout?: number/timeout: number = 30000/g' src/utils/ConfigurationManager.ts
sed -i 's/strictSSL?: boolean/strictSSL: boolean = true/g' src/utils/ConfigurationManager.ts

echo "✅ Corrections appliquées"

# Relancer le build
echo "🏗️ Relancement du build..."
npm run build