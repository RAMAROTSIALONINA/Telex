#!/bin/bash
# Script de déploiement TELEX sur Simafri

echo "🌍 Déploiement TELEX sur telex.mg"

# 1. Installer les dépendances production
echo "📦 Installation des dépendances..."
npm install --production

# 2. Créer le dossier de logs
mkdir -p logs

# 3. Démarrer avec PM2
echo "🚀 Démarrage du service TELEX..."
pm2 start server.js --name telex --env production

# 4. Sauvegarder la configuration PM2
pm2 save

# 5. Configurer le démarrage automatique
pm2 startup

echo "✅ TELEX déployé sur https://telex.mg"
echo "📊 Status: pm2 status"
echo "📋 Logs: pm2 logs telex"
