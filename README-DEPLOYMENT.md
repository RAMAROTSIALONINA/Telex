# 🌐 Lancement de TELEX en ligne - Guide Rapide

## 🚀 Option 1: Heroku (Plus simple)

### 1. Installation rapide
```bash
# Installer Heroku CLI
npm install -g heroku

# Se connecter
heroku login
```

### 2. Préparer le projet
```bash
cd f:\PROJET\TELEX

# Initialiser Git
git init
git add .
git commit -m "TELEX prêt pour le déploiement"
```

### 3. Déployer
```bash
# Créer l'app
heroku create telex-votre-nom

# Configurer
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=secret-unique-2024

# Lancer
git push heroku main

# Ouvrir
heroku open
```

---

## 🚀 Option 2: Vercel

### 1. Installation
```bash
npm install -g vercel
vercel login
```

### 2. Déployer
```bash
cd f:\PROJET\TELEX
vercel --prod
```

---

## 🚀 Option 3: Render.com

1. Aller sur [render.com](https://render.com)
2. Connecter GitHub
3. Créer "Web Service"
4. Configurer:
   - Build: `npm install`
   - Start: `npm start`

---

## ✅ Vérifications après déploiement

1. **Tester l'accès** : Votre site doit être accessible
2. **Vérifier les images** : Les actualités doivent s'afficher
3. **Tester le formulaire** : Contact doit fonctionner
4. **Admin** : Vérifier `/admin`

---

## 🔧 Si problème

### Erreur 500
```bash
heroku logs --tail
```

### Images ne s'affichent pas
- Vérifier les chemins dans `/public/`
- Tester avec une image simple

### Session ne fonctionne pas
- Configurer `SESSION_SECRET` unique
- Vérifier `NODE_ENV=production`

---

## 🎉 Félicitations !

Votre site TELEX est maintenant en ligne ! 🌟

URL typique: `https://telex-votre-nom.herokuapp.com`
