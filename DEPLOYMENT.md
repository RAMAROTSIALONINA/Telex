# 🚀 Guide de Déploiement TELEX

## 1️⃣ Déploiement sur Heroku (Recommandé)

### Prérequis
- Compte Heroku gratuit
- Git installé
- CLI Heroku installé

### Étapes

1. **Installer Heroku CLI**
```bash
# Windows
npm install -g heroku

# macOS
brew install heroku/brew/heroku

# Linux
sudo snap install heroku --classic
```

2. **Se connecter à Heroku**
```bash
heroku login
```

3. **Initialiser Git**
```bash
cd f:\PROJET\TELEX
git init
git add .
git commit -m "Initial commit - TELEX Site"
```

4. **Créer l'application Heroku**
```bash
heroku create telex-site
# ou avec un nom personnalisé
heroku create votre-nom-telex
```

5. **Configurer les variables d'environnement**
```bash
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=votre-secret-unique-ici
heroku config:set SITE_URL=https://votre-app.herokuapp.com
```

6. **Déployer**
```bash
git push heroku main
# ou master selon votre branche
```

7. **Ouvrir l'application**
```bash
heroku open
```

---

## 2️⃣ Déploiement sur Vercel (Alternatives)

### Étapes

1. **Installer Vercel CLI**
```bash
npm install -g vercel
```

2. **Se connecter**
```bash
vercel login
```

3. **Déployer**
```bash
cd f:\PROJET\TELEX
vercel
```

---

## 3️⃣ Déploiement sur Render.com

1. **Créer un compte** sur [render.com](https://render.com)
2. **Connecter votre repository** GitHub
3. **Configurer le service web** :
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node

---

## 4️⃣ Déploiement sur VPS (Avancé)

### Prérequis
- Serveur Ubuntu/Debian
- Domaine (optionnel)
- Node.js installé

### Étapes

1. **Installer Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Installer PM2**
```bash
npm install -g pm2
```

3. **Cloner votre projet**
```bash
git clone votre-repo
cd telex
npm install
```

4. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

5. **Démarrer avec PM2**
```bash
pm2 start server.js --name telex
pm2 startup
pm2 save
```

---

## 🔧 Configuration Production

### Variables d'environnement obligatoires
- `NODE_ENV=production`
- `SESSION_SECRET=votre-secret-unique`
- `PORT=80` (ou 443 pour HTTPS)
- `SITE_URL=https://votredomaine.com`

### Base de données SQLite
- Copier votre fichier `.db` dans `database/`
- Ou utiliser une base de données externe (PostgreSQL, MySQL)

### HTTPS avec Let's Encrypt (VPS)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votredomaine.com
```

---

## 📊 Monitoring

### Logs Heroku
```bash
heroku logs --tail
```

### Logs PM2
```bash
pm2 logs telex
```

---

## 🚨 Dépannage

### Problèmes courants
1. **Port 3000 déjà utilisé** → Utiliser `process.env.PORT`
2. **Session non persistante** → Configurer Redis en production
3. **Images ne s'affichent pas** → Vérifier les chemins statiques
4. **Database locked** → Utiliser une base de données externe

### Support
- Documentation Heroku: https://devcenter.heroku.com
- Community TELEX: Créer une issue sur GitHub

---

## 🎉 Après déploiement

1. **Tester toutes les fonctionnalités**
2. **Configurer les backups automatiques**
3. **Mettre en place le monitoring**
4. **Partager votre site !**

Votre site TELEX sera accessible en ligne ! 🌟
