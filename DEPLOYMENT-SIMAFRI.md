# 🌍 Déploiement TELEX sur Simafri - telex.mg

## 🔧 Configuration pour Simafri

### 1. Variables d'environnement
```
PORT=80
NODE_ENV=production
SESSION_SECRET=telex-simafri-secret-2024
SITE_URL=https://telex.mg
```

### 2. Mettre à jour .env
```
PORT=80
NODE_ENV=production
SESSION_SECRET=telex-simafri-secret-2024
SITE_NAME=TELEX
SITE_URL=https://telex.mg
```

## 📤 Déploiement

### Option A: Interface Web Simafri
1. Connecter au panel Simafri
2. Créer site "TELEX"
3. Domaine: telex.mg
4. Type: Node.js
5. Upload fichiers TELEX
6. Start: npm start

### Option B: FTP/SFTP
1. Compresser TELEX (sans node_modules)
2. Upload sur ftp.simafri.mg
3. Installer: npm install --production
4. Démarrer: pm2 start server.js

## 🚀 Lancement
```bash
npm install --production
pm2 start server.js --name telex
pm2 save
```

## ✅ Vérification
- Visiter https://telex.mg
- Tester toutes les pages
- Vérifier les images
