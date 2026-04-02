# 📋 Guide Complet de Fonctionnement TELEX

## 🌐 **Fonctionnement des Pages Publiques**

---

### 🏠 **Page d'Accueil (`/` - index.ejs)**

#### **🎯 Fonctionnalités**
- **Présentation TELEX** : Introduction et mission
- **Actualités récentes** : Derniers articles publiés
- **Programmes en vedette** : Émissions mises en avant
- **Carrousel dynamique** : Rotation des contenus
- **Navigation principale** : Accès à toutes les sections

#### **🔧 Fonctionnement Technique**
```javascript
// Route dans routes/index.js
router.get('/', async (req, res) => {
    const news = await dbAll('SELECT * FROM news WHERE is_published = 1 ORDER BY created_at DESC LIMIT 6');
    const programs = await dbAll('SELECT * FROM programs WHERE is_active = 1 ORDER BY created_at DESC LIMIT 3');
    
    res.render('pages/index', {
        title: 'Accueil - TELEX',
        news: news,
        programs: programs,
        page: 'home'
    });
});
```

#### **📊 Données Affichées**
- **Actualités** : Titre, extrait, image, date de publication
- **Programmes** : Titre, description, image, statut actif
- **Statistiques** : Nombre d'articles, programmes, etc.

---

### 📖 **Page À Propos (`/about` - about.ejs)**

#### **🎯 Fonctionnalités**
- **Histoire de TELEX** : Création en 2024, évolution
- **Présentation équipe** : 4 pôles (journalistes, technique, post-production, communication)
- **Mission et valeurs** : Engagement étudiant, formation professionnelle
- **Galerie équipe** : Photos des membres et équipements

#### **🔧 Fonctionnement Technique**
```javascript
// Route dans routes/index.js
router.get('/about', (req, res) => {
    res.render('pages/about', {
        title: 'À propos - TELEX',
        page: 'about'
    });
});
```

#### **📊 Contenu Statique**
- **Textes descriptifs** : Histoire et mission
- **Images équipe** : Photos des différents pôles
- **Compétences** : Tags de compétences par pôle

---

### 📰 **Page Actualités (`/news` - news.ejs)**

#### **🎯 Fonctionnalités**
- **Liste des articles** : Tous les articles publiés
- **Pagination** : Navigation entre les pages
- **Filtres par catégorie** : Culture, tech, sport, etc.
- **Recherche** : Moteur de recherche interne
- **Article détaillé** : Lecture complète avec commentaires

#### **🔧 Fonctionnement Technique**
```javascript
// Liste des actualités
router.get('/news', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;
    
    const news = await dbAll(`
        SELECT * FROM news 
        WHERE is_published = 1 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    res.render('pages/news', {
        title: 'Actualités - TELEX',
        news: news,
        page: page,
        totalPages: Math.ceil(totalNews / limit)
    });
});

// Article détaillé
router.get('/news/:id', async (req, res) => {
    const article = await dbGet('SELECT * FROM news WHERE id = ? AND is_published = 1', [req.params.id]);
    
    // Incrémenter les vues
    await dbRun('UPDATE news SET views = views + 1 WHERE id = ?', [req.params.id]);
    
    res.render('pages/news-single', {
        title: article.title + ' - TELEX',
        article: article
    });
});
```

#### **📊 Données Affichées**
- **Articles** : Titre, contenu, image, auteur, date, vues
- **Méta-données** : Catégories, tags, auteur
- **Navigation** : Articles précédents/suivants

---

### 📺 **Page Programmes (`/programs` - programs.ejs)**

#### **🎯 Fonctionnalités**
- **Grille des programmes** : Liste des émissions
- **Détails programme** : Description, horaires, équipe
- **Filtres par type** : Info, culture, sport, etc.
- **Planning** : Calendrier des diffusions

#### **🔧 Fonctionnement Technique**
```javascript
router.get('/programs', async (req, res) => {
    const programs = await dbAll(`
        SELECT * FROM programs 
        WHERE is_active = 1 
        ORDER BY title ASC
    `);
    
    res.render('pages/programs', {
        title: 'Programmes - TELEX',
        programs: programs
    });
});
```

#### **📊 Données Affichées**
- **Programmes** : Titre, description, image, type, statut
- **Planning** : Jours et heures de diffusion

---

### 🖼️ **Page Galerie (`/gallery` - gallery.ejs)**

#### **🎯 Fonctionnalités**
- **Galerie photos** : Images des événements
- **Filtres par catégorie** : Événements, portraits, etc.
- **Visionneuse** : Affichage plein écran
- **Téléchargement** : Options de partage

#### **🔧 Fonctionnement Technique**
```javascript
router.get('/gallery', async (req, res) => {
    const gallery = await dbAll(`
        SELECT * FROM gallery 
        WHERE is_active = 1 
        ORDER BY created_at DESC
    `);
    
    res.render('pages/gallery', {
        title: 'Galerie - TELEX',
        gallery: gallery
    });
});
```

---

### 📧 **Page Contact (`/contact` - contact.ejs)**

#### **🎯 Fonctionnalités**
- **Formulaire de contact** : Envoi de messages
- **Newsletter** : Abonnement aux news
- **Coordonnées** : Informations de contact
- **Carte** : Localisation géographique

#### **🔧 Fonctionnement Technique**
```javascript
router.post('/contact', async (req, res) => {
    const { name, email, subject, message, newsletter } = req.body;
    
    await dbRun(`
        INSERT INTO contacts (name, email, subject, message, newsletter, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, email, subject, message, newsletter ? 1 : 0, req.ip, req.get('User-Agent')]);
    
    req.flash('success', 'Message envoyé avec succès !');
    res.redirect('/contact');
});
```

---

## 👥 **Fonctionnement de l'Administration**

---

### 🔐 **Connexion Administration (`/admin/login`)**

#### **🎯 Fonctionnalités**
- **Formulaire d'authentification** : Username/password
- **Session sécurisée** : Gestion des sessions
- **Rôles et permissions** : Admin, éditeur, contributeur
- **Mot de passe oublié** : Récupération sécurisée

#### **🔧 Fonctionnement Technique**
```javascript
// Connexion
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Vérification en base de données
    const user = await dbGet('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            loggedIn: true
        };
        
        req.flash('success', `Bienvenue ${user.username} !`);
        res.redirect('/admin/dashboard');
    } else {
        req.flash('error', 'Identifiants incorrects');
        res.redirect('/admin/login');
    }
});

// Middleware d'authentification
function requireAuth(req, res, next) {
    if (!req.session || !req.session.user || !req.session.user.loggedIn) {
        return res.redirect('/admin/login');
    }
    next();
}
```

---

### 📊 **Dashboard Administration (`/admin/dashboard`)**

#### **🎯 Fonctionnalités**
- **Statistiques en temps réel** : Articles, programmes, contacts, galerie
- **Graphiques** : Évolution des données
- **Activité récente** : Dernières actions
- **Actions rapides** : Raccourcis vers les fonctions principales

#### **🔧 Fonctionnement Technique**
```javascript
router.get('/dashboard', requireAuth, async (req, res) => {
    const stats = {
        totalNews: (await dbGet('SELECT COUNT(*) as count FROM news WHERE is_published = 1')).count || 0,
        totalPrograms: (await dbGet('SELECT COUNT(*) as count FROM programs WHERE is_active = 1')).count || 0,
        totalContacts: (await dbGet('SELECT COUNT(*) as count FROM contacts')).count || 0,
        totalGallery: (await dbGet('SELECT COUNT(*) as count FROM gallery')).count || 0
    };
    
    res.render('admin/dashboard', {
        title: 'Tableau de bord - TELEX',
        user: req.session.user,
        stats: stats
    });
});
```

#### **📊 Données Affichées**
- **Compteurs** : Nombre d'articles, programmes, contacts, médias
- **Activité** : Derniers articles publiés, messages reçus
- **Actions rapides** : Nouvel article, nouveau programme, etc.

---

### 📝 **Gestion des Actualités (`/admin/news`)**

#### **🎯 Fonctionnalités**
- **Liste des articles** : Tableau avec tous les articles
- **CRUD complet** : Créer, lire, modifier, supprimer
- **Upload d'images** : Gestion des fichiers médias
- **Statut de publication** : Brouillon/published
- **Catégorisation** : Tags et catégories

#### **🔧 Fonctionnement Technique**
```javascript
// Liste des actualités
router.get('/news', requireAuth, async (req, res) => {
    const news = await dbAll('SELECT * FROM news ORDER BY created_at DESC');
    
    res.render('admin/news', {
        title: 'Gestion des actualités - TELEX',
        user: req.session.user,
        news: news
    });
});

// Création d'un article
router.get('/news/new', requireAuth, (req, res) => {
    res.render('admin/news_edit', {
        title: 'Nouvelle actualité - TELEX',
        user: req.session.user,
        news: null
    });
});

// Sauvegarde d'un article
router.post('/news/save', requireAuth, upload.single('image'), async (req, res) => {
    const { title, excerpt, content, category, is_published } = req.body;
    const image_url = req.file ? '/uploads/news/' + req.file.filename : null;
    
    if (req.body.id) {
        // Mise à jour
        await dbRun(`
            UPDATE news SET title = ?, excerpt = ?, content = ?, category = ?, 
            image_url = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [title, excerpt, content, category, image_url, is_published, req.body.id]);
    } else {
        // Création
        await dbRun(`
            INSERT INTO news (title, excerpt, content, category, image_url, is_published, author)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [title, excerpt, content, category, image_url, is_published, req.session.user.username]);
    }
    
    req.flash('success', 'Actualité sauvegardée avec succès !');
    res.redirect('/admin/news');
});
```

#### **📊 Champs Gérés**
- **Titre** : Texte obligatoire
- **Extrait** : Résumé de l'article
- **Contenu** : Texte complet (éditeur riche)
- **Image** : Upload automatique
- **Catégorie** : Liste déroulante
- **Statut** : Brouillon/Publié
- **Auteur** : Utilisateur connecté

---

### 📺 **Gestion des Programmes (`/admin/programs`)**

#### **🎯 Fonctionnalités**
- **Liste des programmes** : Tableau des émissions
- **CRUD complet** : Gestion des programmes
- **Upload d'images** : Affiches des programmes
- **Planning** : Gestion des horaires
- **Types de programmes** : Catégorisation

#### **🔧 Fonctionnement Technique**
```javascript
router.get('/programs', requireAuth, async (req, res) => {
    const programs = await dbAll('SELECT * FROM programs ORDER BY created_at DESC');
    
    res.render('admin/programs', {
        title: 'Gestion des programmes - TELEX',
        user: req.session.user,
        programs: programs
    });
});

router.post('/programs/save', requireAuth, upload.single('image'), async (req, res) => {
    const { title, description, is_active } = req.body;
    const image_url = req.file ? '/uploads/programs/' + req.file.filename : null;
    
    if (req.body.id) {
        await dbRun(`
            UPDATE programs SET title = ?, description = ?, image_url = ?, is_active = ?
            WHERE id = ?
        `, [title, description, image_url, is_active, req.body.id]);
    } else {
        await dbRun(`
            INSERT INTO programs (title, description, image_url, is_active)
            VALUES (?, ?, ?, ?)
        `, [title, description, image_url, is_active]);
    }
    
    req.flash('success', 'Programme sauvegardé avec succès !');
    res.redirect('/admin/programs');
});
```

---

### 🖼️ **Gestion de la Galerie (`/admin/gallery`)**

#### **🎯 Fonctionnalités**
- **Liste des médias** : Tableau des images
- **Upload multiple** : Ajout de plusieurs images
- **Catégorisation** : Organisation par thèmes
- **Gestion des métadonnées** : Titres, descriptions
- **Suppression** : Gestion des fichiers

#### **🔧 Fonctionnement Technique**
```javascript
router.get('/gallery', requireAuth, async (req, res) => {
    const gallery = await dbAll('SELECT * FROM gallery ORDER BY created_at DESC');
    
    res.render('admin/gallery', {
        title: 'Gestion de la galerie - TELEX',
        user: req.session.user,
        gallery: gallery
    });
});

router.post('/gallery/save', requireAuth, upload.array('images', 10), async (req, res) => {
    const { title, description, category } = req.body;
    
    if (req.files && req.files.length > 0) {
        for (const file of req.files) {
            await dbRun(`
                INSERT INTO gallery (title, description, image_url, category)
                VALUES (?, ?, ?, ?)
            `, [title, description, '/uploads/gallery/' + file.filename, category]);
        }
    }
    
    req.flash('success', 'Images ajoutées avec succès !');
    res.redirect('/admin/gallery');
});
```

---

### 📧 **Gestion des Contacts (`/admin/contacts`)**

#### **🎯 Fonctionnalités**
- **Liste des messages** : Tableau des contacts
- **Filtres** : Messages lus/non lus
- **Réponse** : Système de réponse aux messages
- **Newsletter** : Gestion des abonnés
- **Export** : Exportation des données

#### **🔧 Fonctionnement Technique**
```javascript
router.get('/contacts', requireAuth, async (req, res) => {
    const contacts = await dbAll(`
        SELECT * FROM contacts 
        ORDER BY created_at DESC
    `);
    
    const unreadCount = contacts.filter(c => !c.is_read).length;
    const readCount = contacts.filter(c => c.is_read).length;
    
    res.render('admin/contacts', {
        title: 'Messages de contact - TELEX',
        user: req.session.user,
        contacts: contacts,
        unreadCount: unreadCount,
        readCount: readCount
    });
});

router.post('/contacts/mark-read/:id', requireAuth, async (req, res) => {
    await dbRun('UPDATE contacts SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});
```

---

### 👥 **Gestion des Utilisateurs (`/admin/users`)**

#### **🎯 Fonctionnalités**
- **Liste des utilisateurs** : Tableau des comptes
- **CRUD complet** : Gestion des comptes
- **Rôles et permissions** : Administration des droits
- **Statut** : Actif/inactif
- **Sécurité** : Gestion des mots de passe

#### **🔧 Fonctionnement Technique**
```javascript
router.get('/users', requireSuperAdmin, async (req, res) => {
    const users = await dbAll('SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC');
    
    res.render('admin/users', {
        title: 'Gestion des utilisateurs - TELEX',
        user: req.session.user,
        users: users
    });
});

router.post('/users/save', requireSuperAdmin, async (req, res) => {
    const { username, email, full_name, role, is_active } = req.body;
    const password = req.body.password;
    
    if (req.body.id) {
        // Mise à jour
        const updates = [username, email, full_name, role, is_active, req.body.id];
        let sql = 'UPDATE users SET username = ?, email = ?, full_name = ?, role = ?, is_active = ?';
        
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            sql += ', password = ?';
            updates.splice(-1, 0, hashedPassword);
        }
        
        sql += ' WHERE id = ?';
        await dbRun(sql, updates);
    } else {
        // Création
        const hashedPassword = await bcrypt.hash(password, 10);
        await dbRun(`
            INSERT INTO users (username, email, full_name, role, password, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [username, email, full_name, role, hashedPassword, is_active]);
    }
    
    req.flash('success', 'Utilisateur sauvegardé avec succès !');
    res.redirect('/admin/users');
});
```

---

### ⚙️ **Configuration du Site (`/admin/settings`)**

#### **🎯 Fonctionnalités**
- **Paramètres généraux** : Nom du site, description
- **Configuration footer** : Liens réseaux sociaux
- **Méta-données** : SEO, analytics
- **Sauvegarde** : Export/import configuration

#### **🔧 Fonctionnement Technique**
```javascript
router.get('/settings', requireAuth, async (req, res) => {
    const settings = await dbAll('SELECT * FROM footer_settings ORDER BY setting_key');
    
    res.render('admin/settings', {
        title: 'Paramètres - TELEX',
        user: req.session.user,
        settings: settings
    });
});

router.post('/settings/save', requireAuth, async (req, res) => {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
        await dbRun(`
            INSERT OR REPLACE INTO footer_settings (setting_key, setting_value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `, [key, value]);
    }
    
    req.flash('success', 'Paramètres sauvegardés avec succès !');
    res.redirect('/admin/settings');
});
```

---

## 🔄 **Workflow Global**

### **📊 Flux de Données**
1. **Utilisateur** → **Page publique** → **Formulaire** → **Base de données**
2. **Admin** → **Interface admin** → **CRUD** → **Base de données** → **Page publique**

### **🔐 Sécurité**
- **Sessions** : Gestion sécurisée des connexions
- **Permissions** : Rôles et droits d'accès
- **Validation** : Protection contre les injections
- **Upload** : Sécurisation des fichiers

### **⚡ Performance**
- **Cache** : Mise en cache des données fréquentes
- **Pagination** : Gestion des grandes listes
- **Optimisation** : Requêtes SQL optimisées
- **CDN** : Assets statiques optimisés

---

## 🎯 **Conclusion**

TELEX est un **écosystème complet** qui combine :
- **Interface publique** : Navigation et consultation
- **Administration** : Gestion et modération
- **Base de données** : Stockage structuré
- **Sécurité** : Protection des données
- **Performance** : Optimisation continue

Chaque page et chaque fonctionnalité est conçue pour offrir une **expérience utilisateur optimale** tout en maintenant une **gestion administrative efficace**. 🎯✨🚀
