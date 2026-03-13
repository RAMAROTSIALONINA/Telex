const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { db, dbAll, dbGet, dbRun } = require('../config/database');
const { sendEmail, createReplyHTML } = require('../services/emailService');

// Route pour la page publique du Baume de la Foi
router.get('/baume-de-la-foi-public', async (req, res) => {
    try {
        // Récupérer les prières publiques
        const prieres = await dbAll(`
            SELECT id, title, content, category, reference_biblique, author, created_at, views, video_url
            FROM baume_prieres 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 6
        `);

        // Récupérer les témoignages approuvés
        const temoignages = await dbAll(`
            SELECT id, author_name, content, created_at
            FROM baume_temoignages 
            WHERE is_approved = 1 
            ORDER BY created_at DESC 
            LIMIT 6
        `);

        // Récupérer les réflexions publiques
        const reflexions = await dbAll(`
            SELECT id, title, content, theme, author, created_at, views, video_url
            FROM baume_reflexions 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 6
        `);

        res.render('pages/baume-de-la-foi', {
            page: 'baume-de-la-foi',
            prieres,
            temoignages,
            reflexions
        });
    } catch (error) {
        console.error('Erreur page Baume de la Foi publique:', error);
        res.status(500).send('Erreur serveur');
    }
});

// ========== CONFIGURATION MULTTER ==========

// Configuration de Multer pour les programmes
const programsStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'programs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const programsUpload = multer({
    storage: programsStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: function (req, file, cb) {
        const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

        if (allowedImageMimes.includes(file.mimetype) || allowedVideoMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images (JPEG, JPG, PNG, GIF, WebP) et vidéos (MP4, WebM, OGG) sont autorisées'));
        }
    }
});

// Configuration de Multer pour les news
const newsStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadDir;
        if (file.mimetype.startsWith('image/')) {
            uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'news');
        } else if (file.mimetype.startsWith('video/')) {
            uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'videos');
        }

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const newsUpload = multer({
    storage: newsStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: function (req, file, cb) {
        const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

        if (allowedImageMimes.includes(file.mimetype) || allowedVideoMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images (JPEG, JPG, PNG, GIF, WebP) et vidéos (MP4, WebM, OGG) sont autorisées'));
        }
    }
});

// Configuration de Multer pour la gallery
const galleryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'gallery');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const galleryUpload = multer({
    storage: galleryStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images (JPEG, JPG, PNG, GIF, WebP) sont autorisées'));
        }
    }
});

// Configuration de Multer pour les vidéos du Baume de la Foi
const baumeStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadDir;
        if (file.mimetype.startsWith('image/')) {
            uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'baume', 'images');
        } else if (file.mimetype.startsWith('video/')) {
            uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'baume', 'videos');
        }

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const baumeUpload = multer({
    storage: baumeStorage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    fileFilter: function (req, file, cb) {
        const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

        if (allowedImageMimes.includes(file.mimetype) || allowedVideoMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images (JPEG, JPG, PNG, GIF, WebP) et vidéos (MP4, WebM, OGG) sont autorisées'));
        }
    }
});

// ========== MIDDLEWARE AUTH ==========
function requireAuth(req, res, next) {
    // Vérifier si la session et l'utilisateur existent
    if (!req.session || !req.session.user || !req.session.user.loggedIn) {
        console.log('⚠️  [Admin Middleware] Utilisateur non connecté');
        return res.redirect('/admin/login');
    }

    // Vérifier si l'utilisateur a le rôle admin (ou superadmin)
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin') {
        console.log('⚠️  [Admin Middleware] Rôle insuffisant:', req.session.user.role);
        req.flash('error', 'Accès non autorisé');
        return res.redirect('/admin/dashboard');
    }

    next();
}

// Middleware d'authentification pour les routes API (renvoie du JSON)
function requireAuthApi(req, res, next) {
    // Vérifier si la session et l'utilisateur existent
    if (!req.session || !req.session.user || !req.session.user.loggedIn) {
        console.log('⚠️  [API Middleware] Utilisateur non connecté');
        return res.status(401).json({ success: false, error: 'Non authentifié' });
    }

    // Vérifier si l'utilisateur a le rôle admin (ou superadmin)
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin') {
        console.log('⚠️  [API Middleware] Rôle insuffisant:', req.session.user.role);
        return res.status(403).json({ success: false, error: 'Accès non autorisé' });
    }

    next();
}

// Pour les routes superadmin seulement
function requireSuperAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.loggedIn) {
        return res.redirect('/admin/login');
    }

    if (req.session.user.role !== 'superadmin') {
        req.flash('error', 'Accès réservé aux super-administrateurs');
        return res.redirect('/admin/dashboard');
    }

    next();
}

// ========== ROUTE RACINE ADMIN ==========
router.get('/', (req, res) => {
    console.log('🔑 Accès admin racine - redirection vers login');

    // Si déjà connecté, rediriger vers dashboard
    if (req.session && req.session.user && req.session.user.loggedIn) {
        console.log('🔑 Déjà connecté, redirection vers dashboard');
        return res.redirect('/admin/dashboard');
    }

    // Sinon rediriger vers login
    res.redirect('/admin/login');
});

// ========== LOGIN ==========
router.get('/login', (req, res) => {
    console.log('🔑 Page login - Session actuelle:', req.session.user || 'none');

    // Si déjà connecté, rediriger vers dashboard
    if (req.session && req.session.user && req.session.user.loggedIn) {
        console.log('🔑 Déjà connecté, redirection vers dashboard');
        return res.redirect('/admin/dashboard');
    }

    res.render('admin/login', {
        title: 'Connexion Admin - TELEX',
        error: req.flash('error')[0] || null,
        success_msg: req.flash('success')
    });
});

router.post('/login', async (req, res) => {
    console.log('🔑 Tentative de connexion:', req.body.username);

    const { username, password } = req.body;

    try {
        // Rechercher l'utilisateur dans la base de données
        const user = await dbGet('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);

        if (user) {
            console.log('🔑 Utilisateur trouvé dans la base:', user.username);

            // Vérifier le mot de passe
            const isValid = await bcrypt.compare(password, user.password);

            if (isValid) {
                console.log('🔑 Mot de passe correct pour:', user.username);

                // Mettre à jour la date de dernière connexion
                await dbRun('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

                // Créer la session
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    loggedIn: true
                };

                // Forcer la sauvegarde de la session
                req.session.save((err) => {
                    if (err) {
                        console.error('❌ Erreur sauvegarde session:', err);
                        req.flash('error', 'Erreur technique lors de la connexion');
                        return res.redirect('/admin/login');
                    }

                    console.log('✅ Session créée pour:', user.username);
                    console.log('✅ Session ID:', req.sessionID);
                    console.log('✅ Session user:', req.session.user);

                    req.flash('success', `Bienvenue ${user.full_name || user.username} !`);
                    return res.redirect('/admin/dashboard');
                });

                return;
            }
        }

        // Fallback pour la compatibilité
        console.log('🔑 Tentative avec identifiants par défaut');
        if ((username === 'admin' && password === 'admin123') ||
            (username === 'telex' && password === 'telex2026')) {

            const role = username === 'admin' ? 'superadmin' : 'admin';

            req.session.user = {
                username: username,
                role: role,
                loggedIn: true
            };

            req.session.save((err) => {
                if (err) {
                    console.error('❌ Erreur sauvegarde session fallback:', err);
                    req.flash('error', 'Erreur technique lors de la connexion');
                    return res.redirect('/admin/login');
                }

                console.log('✅ Session fallback créée pour:', username);
                req.flash('success', `Bienvenue ${username} !`);
                return res.redirect('/admin/dashboard');
            });

            return;
        }

        console.log('❌ Identifiants incorrects pour:', username);
        req.flash('error', 'Identifiants incorrects');
        res.redirect('/admin/login');

    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        req.flash('error', 'Erreur lors de la connexion');
        res.redirect('/admin/login');
    }
});

// ========== LOGOUT ==========
router.get('/logout', (req, res) => {
    console.log('🚪 Déconnexion de:', req.session.user ? req.session.user.username : 'inconnu');

    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Erreur destruction session:', err);
        }
        console.log('✅ Session détruite');
        res.redirect('/admin/login');
    });
});

// ========== DASHBOARD ==========
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        // Statistiques existantes
        const stats = {
            totalNews: (await dbGet('SELECT COUNT(*) as count FROM news WHERE is_published = 1')).count || 0,
            totalPrograms: (await dbGet('SELECT COUNT(*) as count FROM programs WHERE is_active = 1')).count || 0,
            totalContacts: (await dbGet('SELECT COUNT(*) as count FROM contacts')).count || 0,
            totalGallery: (await dbGet('SELECT COUNT(*) as count FROM gallery')).count || 0
        };

        // Ajouter les statistiques de consentements cookies
        try {
            const consentStats = await dbGet(`
                SELECT COUNT(*) as count 
                FROM cookie_consents
            `);
            stats.cookieConsents = consentStats.count || 0;
        } catch (error) {
            // Si la table n'existe pas encore, afficher 0
            stats.cookieConsents = 0;
        }

        // Ajouter les statistiques des vues totales des actualités
        try {
            const newsViewsStats = await dbGet(`
                SELECT SUM(views) as totalViews 
                FROM news 
                WHERE views IS NOT NULL
            `);
            stats.totalNewsViews = newsViewsStats.totalViews || 0;
        } catch (error) {
            // En cas d'erreur, afficher 0
            stats.totalNewsViews = 0;
        }

        // Ajouter les statistiques des vues totales des programmes
        try {
            const programsViewsStats = await dbGet(`
                SELECT SUM(views) as totalViews 
                FROM programs 
                WHERE views IS NOT NULL
            `);
            stats.totalProgramsViews = programsViewsStats.totalViews || 0;
        } catch (error) {
            // En cas d'erreur, afficher 0
            stats.totalProgramsViews = 0;
        }

        // Ajouter les statistiques du Baume de la Foi
        try {
            // Compter les prières publiées
            const prieresCount = await dbGet('SELECT COUNT(*) as count FROM baume_prieres WHERE is_published = 1');
            stats.baumePrieres = prieresCount.count || 0;
            
            // Compter les réflexions publiées
            const reflexionsCount = await dbGet('SELECT COUNT(*) as count FROM baume_reflexions WHERE is_published = 1');
            stats.baumeReflexions = reflexionsCount.count || 0;
            
            // Compter les témoignages approuvés
            const temoignagesCount = await dbGet('SELECT COUNT(*) as count FROM baume_temoignages WHERE is_approved = 1');
            stats.baumeTemoignages = temoignagesCount.count || 0;
            
            // Calculer le total des contenus Baume
            stats.baumeTotalCount = stats.baumePrieres + stats.baumeReflexions + stats.baumeTemoignages;
            
            // Calculer les vues totales (prières + réflexions)
            const baumeViewsStats = await dbGet(`
                SELECT 
                    (SELECT SUM(views) FROM baume_prieres WHERE views IS NOT NULL) +
                    (SELECT SUM(views) FROM baume_reflexions WHERE views IS NOT NULL) as totalViews
            `);
            stats.baumeTotalViews = baumeViewsStats.totalViews || 0;
        } catch (error) {
            // En cas d'erreur, afficher 0
            stats.baumePrieres = 0;
            stats.baumeReflexions = 0;
            stats.baumeTemoignages = 0;
            stats.baumeTotalCount = 0;
            stats.baumeTotalViews = 0;
        }

        res.render('admin/dashboard', {
            title: 'Tableau de bord - TELEX',
            user: req.session.user,
            stats: stats
        });
    } catch (error) {
        console.error('❌ Erreur dashboard:', error);
        res.render('admin/dashboard', {
            title: 'Tableau de bord - TELEX',
            user: req.session.user,
            stats: {
                totalNews: 0,
                totalPrograms: 0,
                totalContacts: 0,
                totalGallery: 0,
                cookieConsents: 0,
                totalNewsViews: 0,
                totalProgramsViews: 0,
                baumePrieres: 0,
                baumeReflexions: 0,
                baumeTemoignages: 0,
                baumeTotalCount: 0,
                baumeTotalViews: 0
            }
        });
    }
});

// ========== NEWS ==========

router.get('/news', requireAuth, async (req, res) => {
    try {
        const newsData = await dbAll('SELECT * FROM news ORDER BY created_at DESC');
        res.render('admin/news', {
            title: 'Gestion des actualités - TELEX',
            user: req.session.user,
            news: newsData || []
        });
    } catch (error) {
        console.error('Erreur chargement actualités:', error);
        res.render('admin/news', {
            title: 'Gestion des actualités - TELEX',
            user: req.session.user,
            news: []
        });
    }
});

router.get('/news/new', requireAuth, (req, res) => {
    res.render('admin/news_edit', {
        title: 'Nouvelle actualité - TELEX',
        user: req.session.user,
        news: null
    });
});

router.get('/news/edit/:id', requireAuth, async (req, res) => {
    try {
        const newsId = req.params.id;
        const newsItem = await dbGet('SELECT * FROM news WHERE id = ?', [newsId]);

        if (!newsItem) {
            req.flash('error', 'Actualité non trouvée');
            return res.redirect('/admin/news');
        }

        res.render('admin/news_edit', {
            title: `Éditer "${newsItem.title}" - TELEX`,
            user: req.session.user,
            news: newsItem
        });
    } catch (error) {
        console.error('Erreur édition:', error);
        req.flash('error', 'Erreur lors du chargement de l\'actualité');
        res.redirect('/admin/news');
    }
});

router.post('/news/save', requireAuth, newsUpload.fields([{ name: 'image_file', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res) => {
    try {
        const { id, title, excerpt, content, author, program_type, image_url, video_url, is_published, remove_image, remove_video, media_type } = req.body;

        if (!title || !content) {
            req.flash('error', 'Le titre et le contenu sont obligatoires');
            return res.redirect(id ? `/admin/news/edit/${id}` : '/admin/news/new');
        }

        let finalImageUrl = null;
        let finalVideoUrl = null;

        // Logique de choix exclusif entre image et vidéo
        if (media_type === 'image') {
            // Priorité à l'image, suppression de la vidéo
            finalVideoUrl = null; // Toujours null pour le mode image

            // Gestion de l'image
            if (req.files && req.files.image_file && req.files.image_file[0]) {
                finalImageUrl = `/uploads/news/${req.files.image_file[0].filename}`;
            } else if (image_url && image_url.trim() !== '') {
                finalImageUrl = image_url.trim();
            }

            // Suppression forcée de la vidéo existante
            if (id && remove_video !== '1') {
                const currentNews = await dbGet('SELECT video_url FROM news WHERE id = ?', [id]);
                if (currentNews && currentNews.video_url) {
                    if (currentNews.video_url.includes('/uploads/videos/')) {
                        const filename = path.basename(currentNews.video_url);
                        const filePath = path.join(__dirname, '..', 'public', 'uploads', 'videos', filename);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                    finalVideoUrl = null; // Forcer la suppression en base
                }
            }

        } else if (media_type === 'video') {
            // Priorité à la vidéo, suppression de l'image
            finalImageUrl = null; // Toujours null pour le mode vidéo

            // Gestion de la vidéo
            if (req.files && req.files.video_file && req.files.video_file[0]) {
                finalVideoUrl = `/uploads/videos/${req.files.video_file[0].filename}`;
            } else if (video_url && video_url.trim() !== '') {
                finalVideoUrl = video_url.trim();
            }

            // Suppression forcée de l'image existante
            if (id && remove_image !== '1') {
                const currentNews = await dbGet('SELECT image_url FROM news WHERE id = ?', [id]);
                if (currentNews && currentNews.image_url) {
                    if (currentNews.image_url.includes('/uploads/news/')) {
                        const filename = path.basename(currentNews.image_url);
                        const filePath = path.join(__dirname, '..', 'public', 'uploads', 'news', filename);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                    finalImageUrl = null; // Forcer la suppression en base
                }
            }
        }

        // Gestion des suppressions explicites (champs remove_*)
        if (remove_image === '1') {
            finalImageUrl = null;
            if (id) {
                const currentNews = await dbGet('SELECT image_url FROM news WHERE id = ?', [id]);
                if (currentNews && currentNews.image_url && currentNews.image_url.includes('/uploads/news/')) {
                    const filename = path.basename(currentNews.image_url);
                    const filePath = path.join(__dirname, '..', 'public', 'uploads', 'news', filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            }
        }

        if (remove_video === '1') {
            finalVideoUrl = null;
            if (id) {
                const currentNews = await dbGet('SELECT video_url FROM news WHERE id = ?', [id]);
                if (currentNews && currentNews.video_url && currentNews.video_url.includes('/uploads/videos/')) {
                    const filename = path.basename(currentNews.video_url);
                    const filePath = path.join(__dirname, '..', 'public', 'uploads', 'videos', filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            }
        }

        if (id) {
            await dbRun(
                `UPDATE news SET 
                 title = ?, excerpt = ?, content = ?, author = ?, 
                 program_type = ?, image_url = ?, video_url = ?, is_published = ?, 
                 updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [title.trim(),
                excerpt?.trim() || '',
                content.trim(),
                author?.trim() || 'TELEX',
                program_type?.trim() || 'Actualité',
                    finalImageUrl,
                    finalVideoUrl,
                is_published ? 1 : 0,
                    id]
            );
            req.flash('success', 'Actualité mise à jour avec succès');
        } else {
            await dbRun(
                `INSERT INTO news (title, excerpt, content, author, program_type, image_url, video_url, is_published) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [title.trim(),
                excerpt?.trim() || '',
                content.trim(),
                author?.trim() || 'TELEX',
                program_type?.trim() || 'Actualité',
                    finalImageUrl,
                    finalVideoUrl,
                is_published ? 1 : 0]
            );
            req.flash('success', 'Actualité créée avec succès');
        }

        res.redirect('/admin/news');
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        req.flash('error', 'Erreur lors de la sauvegarde: ' + error.message);
        res.redirect('/admin/news');
    }
});

router.get('/news/delete/:id', requireAuth, async (req, res) => {
    try {
        const newsId = req.params.id;
        const newsItem = await dbGet('SELECT title, image_url, video_url FROM news WHERE id = ?', [newsId]);

        if (!newsItem) {
            req.flash('error', 'Actualité non trouvée');
            return res.redirect('/admin/news');
        }

        // Supprimer l'image si elle existe
        if (newsItem.image_url && newsItem.image_url.includes('/uploads/news/')) {
            const filename = path.basename(newsItem.image_url);
            const filePath = path.join(__dirname, '..', 'public', 'uploads', 'news', filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Supprimer la vidéo si elle existe
        if (newsItem.video_url && newsItem.video_url.includes('/uploads/videos/')) {
            const filename = path.basename(newsItem.video_url);
            const filePath = path.join(__dirname, '..', 'public', 'uploads', 'videos', filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await dbRun('DELETE FROM news WHERE id = ?', [newsId]);

        req.flash('success', `Actualité "${newsItem.title}" supprimée avec succès`);
        res.redirect('/admin/news');
    } catch (error) {
        console.error('Erreur suppression:', error);
        req.flash('error', 'Erreur lors de la suppression de l\'actualité');
        res.redirect('/admin/news');
    }
});

// ========== PROGRAMS ==========
router.get('/programs', requireAuth, async (req, res) => {
    try {
        const programs = await dbAll('SELECT * FROM programs ORDER BY created_at DESC');
        
        // Calculer les statistiques pour la page programmes
        const stats = {
            totalProgramsViews: 0
        };
        try {
            const programsViewsStats = await dbGet(`
                SELECT SUM(views) as totalViews 
                FROM programs 
                WHERE views IS NOT NULL
            `);
            stats.totalProgramsViews = programsViewsStats.totalViews || 0;
        } catch (error) {
            stats.totalProgramsViews = 0;
        }
        
        res.render('admin/programs', {
            title: 'Programmes - TELEX',
            user: req.session.user,
            programs: programs || [],
            stats: stats
        });
    } catch (error) {
        console.error('Erreur programmes:', error);
        res.render('admin/programs', {
            title: 'Programmes - TELEX',
            user: req.session.user,
            programs: [],
            stats: { totalProgramsViews: 0 }
        });
    }
});

// Route pour afficher le formulaire de création de programme
router.get('/programs/new', requireAuth, (req, res) => {
    res.render('admin/programs_new', {
        title: 'Nouveau Programme - TELEX',
        user: req.session.user,
        success_msg: req.flash('success'),
        error_msg: req.flash('error')
    });
});

router.post('/programs/save', requireAuth, programsUpload.fields([{ name: 'image_file', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res) => {
    try {
        console.log('🔍 DEBUG programs/save - req.body:', req.body);
        console.log('🔍 DEBUG programs/save - req.files:', req.files);

        const { title, description, presenter, schedule_time, program_type, duration, program_date, broadcast_type, is_active, image_url, video_url } = req.body;

        console.log('🔍 DEBUG - Variables extraites:', { title, description, presenter, video_url, image_url, broadcast_type, is_active });

        // Validation basique
        if (!title || !description) {
            req.flash('error', 'Le titre et la description sont obligatoires');
            return res.redirect('/admin/programs/new');
        }

        // Validation du type de diffusion
        if (!broadcast_type || !['announcement', 'scheduled', 'replay'].includes(broadcast_type)) {
            req.flash('error', 'Le type de diffusion est obligatoire');
            return res.redirect('/admin/programs/new');
        }

        // Validation des champs obligatoires selon le type
        if (broadcast_type === 'scheduled' && (!program_date || !schedule_time)) {
            req.flash('error', 'La date et l\'heure sont obligatoires pour un programme planifié');
            return res.redirect('/admin/programs/new');
        }

        // Préparer les URLs des médias
        let finalImageUrl = image_url?.trim() || '';
        let finalVideoUrl = video_url?.trim() || '';

        // Gérer les fichiers uploadés
        if (req.files && req.files.image_file && req.files.image_file.length > 0) {
            const imageFile = req.files.image_file[0];
            finalImageUrl = `/uploads/programs/${imageFile.filename}`;
        }

        if (req.files && req.files.video_file && req.files.video_file.length > 0) {
            const videoFile = req.files.video_file[0];
            finalVideoUrl = `/uploads/programs/${videoFile.filename}`;
        }

        // Insérer dans la base de données
        const result = await dbRun(
            `INSERT INTO programs (title, description, presenter, schedule_time, program_type, duration, program_date, broadcast_type, is_active, image_url, video_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                description.trim(),
                presenter?.trim() || 'TELEX',
                schedule_time?.trim() || 'À déterminer',
                program_type?.trim() || 'Actualités',
                duration?.trim() || '30 min',
                program_date?.trim() || null,
                broadcast_type.trim(),
                is_active ? 1 : 0,
                finalImageUrl,
                finalVideoUrl
            ]
        );

        req.flash('success', `Programme "${title}" créé avec succès !`);
        res.redirect('/admin/programs');

    } catch (error) {
        console.error('❌ Erreur création programme:', error);
        res.redirect('/admin/programs/new');
    }
});

// Route pour afficher la page d'édition d'un programme
router.get('/programs/edit/:id', requireAuth, async (req, res) => {
    try {
        const programId = req.params.id;
        const program = await dbGet('SELECT * FROM programs WHERE id = ?', [programId]);

        if (!program) {
            req.flash('error', 'Programme non trouvé');
            return res.redirect('/admin/programs');
        }

        res.render('admin/programs_edit', {
            title: `Éditer "${program.title}" - TELEX`,
            user: req.session.user,
            program: program,
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });

    } catch (error) {
        console.error('❌ Erreur chargement programme:', error);
        req.flash('error', 'Erreur lors du chargement du programme');
        return res.redirect('/admin/programs');
    }
});

// Route pour mettre à jour un programme
router.post('/programs/update/:id', requireAuth, programsUpload.fields([{ name: 'image_file', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res) => {
    try {
        const { title, description, presenter, schedule_time, program_type, duration, program_date, broadcast_type, is_active, image_url, video_url, media_type, remove_image, remove_video } = req.body;
        const id = req.params.id;

        // Fonction utilitaire pour éviter le crash sur trim()
        const safeTrim = (str) => (str && typeof str === 'string') ? str.trim() : '';
        const safeValue = (str) => (str && typeof str === 'string') ? str.trim() : str;

        // Validation basique
        if (!title || !description) {
            req.flash('error', 'Le titre et la description sont obligatoires');
            return res.redirect(`/admin/programs/edit/${id}`);
        }

        // Validation du type de diffusion
        if (!broadcast_type || !['announcement', 'scheduled', 'replay'].includes(broadcast_type)) {
            req.flash('error', 'Le type de diffusion est obligatoire');
            return res.redirect(`/admin/programs/edit/${id}`);
        }

        // Récupérer le programme actuel pour gérer les suppressions de fichiers
        const currentProgram = await dbGet('SELECT * FROM programs WHERE id = ?', [id]);
        if (!currentProgram) {
            req.flash('error', 'Programme non trouvé');
            return res.redirect('/admin/programs');
        }

        // Préparer les URLs des médias
        let finalImageUrl = safeTrim(image_url) || currentProgram.image_url;
        let finalVideoUrl = safeTrim(video_url) || currentProgram.video_url;

        // Si le formulaire renvoie une valeur vide explicite (ex: champ vidé ou masqué), on garde l'ancien sauf si remove flag est mis.
        // MAIS attention : le formulaire envoie image_url via input hidden populate avec l'ancienne valeur.
        // Donc safeTrim(image_url) est probablement l'ancienne valeur.

        // Logique de suppression de fichier physique
        const deleteFile = (filePathUrl) => {
            if (filePathUrl && filePathUrl.startsWith('/uploads/')) {
                const filename = path.basename(filePathUrl);
                // Déterminer le dossier parent en fonction du type (programs, news, etc) - ici c'est programs
                // Attention, programsUpload met tout dans public/uploads/programs
                const fullPath = path.join(__dirname, '..', 'public', 'uploads', 'programs', filename);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                        console.log(`Fichier supprimé : ${fullPath}`);
                    } catch (err) {
                        console.error(`Erreur suppression fichier ${fullPath}:`, err);
                    }
                }
            }
        };

        // Gérer les nouveaux uploads (prioritaires)
        if (req.files && req.files.image_file && req.files.image_file.length > 0) {
            // Supprimer l'ancienne image si elle existe
            if (currentProgram.image_url) deleteFile(currentProgram.image_url);

            const imageFile = req.files.image_file[0];
            finalImageUrl = `/uploads/programs/${imageFile.filename}`;
            // Si on upload une image, on s'assure que remove_image n'est pas pris en compte pour annuler l'upload
        }

        if (req.files && req.files.video_file && req.files.video_file.length > 0) {
            // Supprimer l'ancienne vidéo si elle existe
            if (currentProgram.video_url) deleteFile(currentProgram.video_url);

            const videoFile = req.files.video_file[0];
            finalVideoUrl = `/uploads/programs/${videoFile.filename}`;
        }

        // Gérer les suppressions explicites (flags du frontend)
        if (remove_image === '1' && (!req.files || !req.files.image_file)) {
            if (currentProgram.image_url) deleteFile(currentProgram.image_url);
            finalImageUrl = null;
        }

        if (remove_video === '1' && (!req.files || !req.files.video_file)) {
            if (currentProgram.video_url) deleteFile(currentProgram.video_url);
            finalVideoUrl = null;
        }

        // Gestion de l'exclusivité via media_type (si utilisé)
        // Le frontend envoie media_type = 'image' ou 'video'
        if (media_type === 'image') {
            // Si mode image, on s'assure que la vidéo est nulle (si c'est la volonté du design)
            // MAIS attention, si l'utilisateur veut juste changer l'image sans toucher à la vidéo (si le design permet les deux),
            // il ne faut pas supprimer la vidéo.
            // Vu le design avec radio buttons "Image" OU "Vidéo", c'est exclusif.
            // Donc si on passe en mode image, on supprime la vidéo existante.
            if (finalVideoUrl) {
                deleteFile(finalVideoUrl);
                finalVideoUrl = null;
            }
        } else if (media_type === 'video') {
            // Si mode vidéo, on supprime l'image
            if (finalImageUrl) {
                deleteFile(finalImageUrl);
                finalImageUrl = null;
            }
        }

        // Pour la vidéo par URL (champ texte), si modifié :
        if (!req.files?.video_file && video_url && video_url.trim() !== currentProgram.video_url) {
            // Si l'utilisateur a changé l'URL manuellement et qu'il y avait un fichier avant, on supprime le fichier
            if (currentProgram.video_url && currentProgram.video_url.startsWith('/uploads/')) {
                deleteFile(currentProgram.video_url);
            }
            finalVideoUrl = video_url.trim();
        }

        // Mettre à jour dans la base de données
        await dbRun(
            `UPDATE programs SET 
             title = ?, description = ?, presenter = ?, schedule_time = ?, 
             program_type = ?, duration = ?, program_date = ?, broadcast_type = ?, is_active = ?, image_url = ?, video_url = ? 
             WHERE id = ?`,
            [
                safeTrim(title),
                safeTrim(description),
                safeTrim(presenter) || 'TELEX',
                safeTrim(schedule_time) || 'À déterminer',
                safeTrim(program_type) || 'Actualités',
                safeTrim(duration) || '30 min',
                safeValue(program_date) || null,
                safeTrim(broadcast_type),
                is_active ? 1 : 0,
                finalImageUrl,
                finalVideoUrl,
                id
            ]
        );

        req.flash('success', `Programme "${safeTrim(title)}" mis à jour avec succès !`);
        res.redirect('/admin/programs');

    } catch (error) {
        console.error('❌ Erreur mise à jour programme:', error);
        req.flash('error', 'Erreur lors de la mise à jour du programme: ' + error.message);
        res.redirect(`/admin/programs/edit/${req.params.id}`);
    }
});

// Route pour supprimer un programme (GET pour matcher le lien frontend)
router.get('/programs/delete/:id', requireAuth, async (req, res) => {
    try {
        const programId = req.params.id;

        // Récupérer le programme pour avoir son titre
        const program = await dbGet('SELECT title FROM programs WHERE id = ?', [programId]);

        if (!program) {
            req.flash('error', 'Programme non trouvé');
            return res.redirect('/admin/programs');
        }

        // Supprimer le programme
        await dbRun('DELETE FROM programs WHERE id = ?', [programId]);

        req.flash('success', `Programme "${program.title}" supprimé avec succès`);
        res.redirect('/admin/programs');

    } catch (error) {
        console.error('❌ Erreur suppression programme:', error);
        req.flash('error', 'Erreur lors de la suppression du programme');
        res.redirect('/admin/programs');
    }
});

router.get('/contacts-improved', requireAuth, async (req, res) => {
    try {
        const contacts = await dbAll(`
            SELECT id, name, email, subject, message, 
                   created_at, is_read, newsletter,
                   ip_address
            FROM contacts 
            ORDER BY created_at DESC
        `);

        const unreadCount = contacts.filter(c => !c.is_read).length;
        const readCount = contacts.filter(c => c.is_read).length;

        res.render('admin/contacts-improved', {
            title: 'Messages de Contact - Administration TELEX',
            user: req.session.user,
            contacts: contacts || [],
            unreadCount: unreadCount,
            readCount: readCount,
            totalCount: contacts.length
        });
    } catch (error) {
        console.error('❌ Erreur chargement contacts améliorés:', error);
        res.render('admin/contacts-improved', {
            title: 'Messages de Contact - Administration TELEX',
            user: req.session.user,
            contacts: [],
            unreadCount: 0,
            readCount: 0,
            totalCount: 0
        });
    }
});

router.get('/contacts', requireAuth, async (req, res) => {
    try {
        const contacts = await dbAll(`
            SELECT id, name, email, subject, message, 
                   created_at, is_read, newsletter 
            FROM contacts 
            ORDER BY created_at DESC
        `);

        const unreadCount = contacts.filter(c => !c.is_read).length;
        const readCount = contacts.filter(c => c.is_read).length;

        res.render('admin/contacts-improved', {
            title: 'Messages de contact - TELEX',
            user: req.session.user,
            contacts: contacts || [],
            unreadCount: unreadCount,
            readCount: readCount,
            totalCount: contacts.length
        });
    } catch (error) {
        console.error('❌ Erreur chargement contacts:', error);
        res.render('admin/contacts-improved', {
            title: 'Messages de contact - TELEX',
            user: req.session.user,
            contacts: [],
            unreadCount: 0,
            readCount: 0,
            totalCount: 0
        });
    }
});

router.get('/contacts/view/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await dbGet('SELECT * FROM contacts WHERE id = ?', [id]);

        if (!contact) {
            return res.status(404).render('pages/error', {
                title: 'Message non trouvé - TELEX',
                message: 'Le message demandé n\'existe pas ou a été supprimé.'
            });
        }

        if (!contact.is_read) {
            await dbRun(
                'UPDATE contacts SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );
        }

        res.render('admin/contact-view', {
            title: `Message de ${contact.name} - Admin TELEX`,
            contact: contact
        });

    } catch (error) {
        console.error('❌ Erreur vue message:', error);
        res.status(500).render('pages/error', {
            title: 'Erreur - TELEX',
            message: 'Une erreur est survenue lors du chargement du message.'
        });
    }
});

router.post('/contacts/mark-read/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await dbRun(
            'UPDATE contacts SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
        res.json({ success: true, message: 'Message marqué comme lu' });
    } catch (error) {
        console.error('❌ Erreur marquer comme lu:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/contacts/reply/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reply_message, reply_subject, include_original, full_message, send_directly } = req.body;
        
        console.log('📧 Sauvegarde de la réponse pour le contact:', id);
        
        // Vérifier que le contact existe
        const contact = await dbGet('SELECT * FROM contacts WHERE id = ?', [id]);
        if (!contact) {
            return res.status(404).json({ success: false, error: 'Contact non trouvé' });
        }
        
        // Insérer la réponse dans la base de données
        const result = await dbRun(`
            INSERT INTO contact_replies (contact_id, reply_message, reply_subject, include_original, full_message, sent_via_mailto)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, reply_message, reply_subject, include_original ? 1 : 0, full_message, send_directly ? 0 : 1]);
        
        console.log('✅ Réponse sauvegardée avec ID:', result.id);
        
        // Envoyer l'email directement si demandé
        if (send_directly === 'true' && sendEmail && createReplyHTML) {
            console.log('📨 Envoi direct de l\'email à:', contact.email);
            
            const emailHTML = createReplyHTML(contact.name, reply_message, include_original ? contact : null);
            const emailText = `Bonjour ${contact.name},\n\n${reply_message}${
                include_original ? '\n\n--- Message original ---\n' + 
                `De: ${contact.name} <${contact.email}>\n` +
                `Date: ${new Date(contact.created_at).toLocaleString('fr-FR')}\n` +
                `Sujet: ${contact.subject || 'Sans objet'}\n\n` +
                contact.message : ''
            }`;
            
            const emailResult = await sendEmail(
                contact.email,
                reply_subject,
                emailHTML,
                emailText
            );
            
            if (emailResult.success) {
                console.log('✅ Email envoyé directement avec succès');
                return res.json({ 
                    success: true, 
                    message: 'Réponse sauvegardée et email envoyé directement!',
                    reply_id: result.id,
                    email_sent: true
                });
            } else {
                console.error('❌ Erreur envoi email:', emailResult.error);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Erreur lors de l\'envoi de l\'email: ' + emailResult.error
                });
            }
        } else {
            // Fallback vers mailto (toujours fonctionnel)
            console.log('📧 Fallback vers client email...');
            const mailtoLink = 'mailto:' + encodeURIComponent(contact.email) + 
                             '?subject=' + encodeURIComponent(reply_subject) + 
                             '&body=' + encodeURIComponent(full_message);
            
            console.log('🔗 Lien mailto généré:', mailtoLink);
            
            try {
                window.open(mailtoLink, '_blank');
                console.log('✅ Client email ouvert');
            } catch (error) {
                console.error('❌ Erreur lors de l\'ouverture du client email:', error);
                showNotification('Erreur lors de l\'ouverture du client email', 'danger');
                return;
            }
            
            // Vider le formulaire
            document.getElementById('replyMessage').value = '';
            
            // Afficher une confirmation
            showNotification('Réponse sauvegardée, ouverture du client email...', 'info');
        }
        
        res.json({ 
            success: true, 
            message: 'Réponse sauvegardée avec succès',
            reply_id: result.id,
            email_sent: false
        });
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde réponse:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/contacts/replies/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Récupérer toutes les réponses pour ce contact
        const replies = await dbAll(`
            SELECT * FROM contact_replies 
            WHERE contact_id = ? 
            ORDER BY created_at ASC
        `, [id]);
        
        res.json({ 
            success: true, 
            replies: replies
        });
        
    } catch (error) {
        console.error('❌ Erreur chargement réponses:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/contacts/delete/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await dbGet('SELECT * FROM contacts WHERE id = ?', [id]);

        if (!contact) {
            req.flash('error', 'Message non trouvé');
            return res.redirect('/admin/contacts');
        }

        await dbRun('DELETE FROM contacts WHERE id = ?', [id]);

        req.flash('success', `Message de ${contact.name} supprimé avec succès`);
        res.redirect('/admin/contacts');
    } catch (error) {
        console.error('❌ Erreur suppression message:', error);
        req.flash('error', 'Erreur lors de la suppression du message');
        res.redirect('/admin/contacts');
    }
});

// ========== GALLERY ==========
router.get('/gallery', requireAuth, async (req, res) => {
    try {
        const gallery = await dbAll('SELECT * FROM gallery ORDER BY created_at DESC');

        const categoriesCount = gallery ?
            [...new Set(gallery.map(item => item.program_type))].length : 0;

        const totalSize = gallery ?
            (gallery.length * 1.2).toFixed(1) : '0';

        res.render('admin/gallery', {
            title: 'Galerie - TELEX',
            user: req.session.user,
            gallery: gallery || [],
            categoriesCount: categoriesCount,
            totalSize: totalSize
        });
    } catch (error) {
        console.error('❌ Erreur galerie:', error);
        res.render('admin/gallery', {
            title: 'Galerie - TELEX',
            user: req.session.user,
            gallery: [],
            categoriesCount: 0,
            totalSize: '0'
        });
    }
});

// Route pour éditer une image
router.get('/gallery/edit/:id', requireAuth, async (req, res) => {
    try {
        const imageId = req.params.id;

        // Récupérer l'image à éditer
        const image = await dbGet('SELECT * FROM gallery WHERE id = ?', [imageId]);

        if (!image) {
            req.flash('error', 'Image non trouvée');
            return res.redirect('/admin/gallery');
        }

        res.render('admin/gallery_edit', {
            title: `Éditer "${image.title}" - TELEX`,
            user: req.session.user,
            image: image,
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });

    } catch (error) {
        console.error('❌ Erreur chargement image pour édition:', error);
        req.flash('error', 'Erreur lors du chargement de l\'image');
        res.redirect('/admin/gallery');
    }
});

// Route pour uploader des images dans la galerie
router.post('/gallery/upload', requireAuth, galleryUpload.array('images', 10), async (req, res) => {
    try {
        console.log('🔍 DEBUG gallery/upload - req.files:', req.files);
        console.log('🔍 DEBUG gallery/upload - req.body:', req.body);
        
        const { category, tags } = req.body;
        
        if (!req.files || req.files.length === 0) {
            req.flash('error', 'Veuillez sélectionner au moins une image');
            return res.redirect('/admin/gallery');
        }
        
        // Traiter chaque image uploadée
        const uploadPromises = req.files.map(async (file) => {
            try {
                // Insérer dans la base de données
                const result = await dbRun(
                    `INSERT INTO gallery (title, image_url, category, description, created_at) 
                     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [
                        file.originalname,
                        `/uploads/gallery/${file.filename}`,
                        category || 'autres',
                        tags || ''
                    ]
                );
                
                console.log('✅ Image uploadée:', file.originalname, 'ID:', result.lastID);
                return { success: true, filename: file.filename, id: result.lastID };
                
            } catch (error) {
                console.error('❌ Erreur upload image:', error);
                return { success: false, error: error.message };
            }
        });
        
        const results = await Promise.all(uploadPromises);
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        if (successful.length > 0) {
            req.flash('success', `${successful.length} image(s) uploadée(s) avec succès !`);
        }
        
        if (failed.length > 0) {
            req.flash('error', `${failed.length} image(s) n'ont pas pu être uploadée(s)`);
        }
        
        res.redirect('/admin/gallery');
        
    } catch (error) {
        console.error('❌ Erreur upload galerie:', error);
        req.flash('error', 'Erreur lors de l\'upload: ' + error.message);
        res.redirect('/admin/gallery');
    }
});

// Route pour mettre à jour une image
router.post('/gallery/update/:id', requireAuth, async (req, res) => {
    try {
        const imageId = req.params.id;
        const { title, description, program_type } = req.body;

        // Vérifier si l'image existe
        const existingImage = await dbGet('SELECT * FROM gallery WHERE id = ?', [imageId]);
        if (!existingImage) {
            req.flash('error', 'Image non trouvée');
            return res.redirect('/admin/gallery');
        }

        // Validation
        if (!title) {
            req.flash('error', 'Le titre est obligatoire');
            return res.redirect(`/admin/gallery/edit/${imageId}`);
        }

        // Mettre à jour dans la base de données
        await dbRun(
            `UPDATE gallery 
             SET title = ?, description = ?, program_type = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [
                title.trim(),
                description?.trim() || '',
                program_type?.trim() || 'autres',
                imageId
            ]
        );

        req.flash('success', `Image "${title}" mise à jour avec succès !`);
        res.redirect('/admin/gallery');

    } catch (error) {
        console.error('❌ Erreur mise à jour image:', error);
        req.flash('error', 'Erreur lors de la mise à jour: ' + error.message);
        res.redirect(`/admin/gallery/edit/${req.params.id}`);
    }
});

// Route pour supprimer une image
router.get('/gallery/delete/:id', requireAuth, async (req, res) => {
    try {
        const imageId = req.params.id;

        // Récupérer l'image pour avoir son URL
        const image = await dbGet('SELECT * FROM gallery WHERE id = ?', [imageId]);

        if (!image) {
            req.flash('error', 'Image non trouvée');
            return res.redirect('/admin/gallery');
        }

        // Supprimer le fichier physique
        if (image.image_url && image.image_url.includes('/uploads/gallery/')) {
            const filename = path.basename(image.image_url);
            const filePath = path.join(__dirname, '..', 'public', 'uploads', 'gallery', filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Supprimer de la base de données
        await dbRun('DELETE FROM gallery WHERE id = ?', [imageId]);

        req.flash('success', `Image "${image.title}" supprimée avec succès`);
        res.redirect('/admin/gallery');

    } catch (error) {
        console.error('❌ Erreur suppression image:', error);
        req.flash('error', 'Erreur lors de la suppression de l\'image');
        res.redirect('/admin/gallery');
    }
});

// ========== FOOTER SETTINGS ==========
router.get('/footer', requireAuth, async (req, res) => {
    try {
        const footerSettings = await dbAll('SELECT * FROM footer_settings ORDER BY setting_key');

        const settings = {};
        footerSettings.forEach(setting => {
            settings[setting.setting_key] = setting.setting_value;
        });

        res.render('admin/footer', {
            title: 'Paramètres Footer - TELEX',
            user: req.session.user,
            settings: settings,
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });
    } catch (error) {
        console.error('❌ Erreur chargement footer:', error);
        req.flash('error', 'Erreur lors du chargement des paramètres du footer');
        res.redirect('/admin/dashboard');
    }
});

router.post('/footer/update', requireAuth, async (req, res) => {
    try {
        const {
            contact_email, contact_phone, contact_address,
            contact_phone_2, contact_phone_3,
            youtube_url, instagram_url, facebook_url, tiktok_url, twitter_url,
            footer_logo, footer_description
        } = req.body;

        const settings = {
            contact_email, contact_phone, contact_address,
            contact_phone_2, contact_phone_3,
            youtube_url, instagram_url, facebook_url, tiktok_url, twitter_url,
            footer_logo, footer_description
        };

        for (const [key, value] of Object.entries(settings)) {
            await dbRun(
                `UPDATE footer_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?`,
                [value || '', key]
            );
        }

        req.flash('success', 'Paramètres du footer mis à jour avec succès !');
        res.redirect('/admin/footer');

    } catch (error) {
        console.error('❌ Erreur mise à jour footer:', error);
        req.flash('error', 'Erreur lors de la mise à jour des paramètres');
        res.redirect('/admin/footer');
    }
});

// ========== SETTINGS ==========

router.get('/settings', requireAuth, (req, res) => {
    res.render('admin/settings', {
        title: 'Paramètres - TELEX',
        user: req.session.user,
        success_msg: req.flash('success'),
        error_msg: req.flash('error')
    });
});

router.post('/update-password', requireAuth, async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;

        if (!current_password || !new_password || !confirm_password) {
            req.flash('error', 'Tous les champs sont obligatoires');
            return res.redirect('/admin/settings');
        }

        if (new_password.length < 6) {
            req.flash('error', 'Le nouveau mot de passe doit contenir au moins 6 caractères');
            return res.redirect('/admin/settings');
        }

        if (new_password !== confirm_password) {
            req.flash('error', 'Les mots de passe ne correspondent pas');
            return res.redirect('/admin/settings');
        }

        const user = await dbGet('SELECT password FROM users WHERE id = ?', [req.session.user.id]);

        if (!user) {
            req.flash('error', 'Utilisateur non trouvé');
            return res.redirect('/admin/settings');
        }

        const isValid = await bcrypt.compare(current_password, user.password);
        if (!isValid) {
            req.flash('error', 'Mot de passe actuel incorrect');
            return res.redirect('/admin/settings');
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await dbRun(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, req.session.user.id]
        );

        req.flash('success', 'Mot de passe mis à jour avec succès');
        res.redirect('/admin/settings');
    } catch (error) {
        console.error('❌ Erreur mise à jour mot de passe:', error);
        req.flash('error', 'Erreur lors de la mise à jour du mot de passe');
        res.redirect('/admin/settings');
    }
});

// ========== SCHEDULE ==========

// Afficher la grille des programmes
router.get('/schedule', requireAuth, async function(req, res) {
    try {
        const programs = await dbAll(`
            SELECT 
                ps.id,
                CASE ps.day_of_week
                    WHEN 1 THEN 'Lundi'
                    WHEN 2 THEN 'Mardi'
                    WHEN 3 THEN 'Mercredi'
                    WHEN 4 THEN 'Jeudi'
                    WHEN 5 THEN 'Vendredi'
                    WHEN 6 THEN 'Samedi'
                    WHEN 7 THEN 'Dimanche'
                    ELSE 'Inconnu'
                END as day,
                ps.start_time as time,
                ps.is_active,
                p.title as program_name,
                p.program_type,
                p.presenter,
                p.description,
                p.image_url,
                p.video_url
            FROM program_schedule ps
            LEFT JOIN programs p ON ps.program_id = p.id
            WHERE ps.is_active = 1 
            ORDER BY ps.day_of_week, ps.start_time
        `);

        res.render('admin/schedule', {
            title: 'Grille des Programmes - TELEX',
            user: req.session.user,
            programs: programs,
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });
    } catch (error) {
        console.error('❌ Erreur chargement grille:', error);
        req.flash('error', 'Erreur lors du chargement de la grille des programmes');
        res.redirect('/admin/dashboard');
    }
});

// Ajouter un programme à la grille
router.post('/schedule/add', requireAuth, async (req, res) => {
    try {
        const { day, time, program_name, program_type } = req.body;

        if (!day || !time || !program_name || !program_type) {
            req.flash('error', 'Tous les champs sont obligatoires');
            return res.redirect('/admin/schedule');
        }

        // Valider le format de l'heure
        if (!/^\d{2}:\d{2}$/.test(time)) {
            req.flash('error', 'L\'heure doit être au format HH:MM');
            return res.redirect('/admin/schedule');
        }

        // Convertir le jour en numéro
        const dayMap = {
            'Lundi': 1, 'Mardi': 2, 'Mercredi': 3, 'Jeudi': 4,
            'Vendredi': 5, 'Samedi': 6, 'Dimanche': 7
        };
        
        const dayOfWeek = dayMap[day];
        if (!dayOfWeek) {
            req.flash('error', 'Jour invalide');
            return res.redirect('/admin/schedule');
        }

        // D'abord créer ou trouver le programme
        const existingProgram = await dbGet('SELECT id FROM programs WHERE title = ?', [program_name]);
        let programId;
        
        if (existingProgram) {
            programId = existingProgram.id;
        } else {
            // Créer un nouveau programme
            const result = await dbRun(
                'INSERT INTO programs (title, program_type, is_active) VALUES (?, ?, 1)',
                [program_name, program_type]
            );
            programId = result.lastID;
        }

        // Ajouter à la grille
        await dbRun(
            'INSERT INTO program_schedule (program_id, day_of_week, start_time, is_active) VALUES (?, ?, ?, 1)',
            [programId, dayOfWeek, time]
        );

        req.flash('success', 'Programme ajouté à la grille avec succès !');
        res.redirect('/admin/schedule');

    } catch (error) {
        console.error('❌ Erreur ajout programme:', error);
        req.flash('error', 'Erreur lors de l\'ajout du programme');
        res.redirect('/admin/schedule');
    }
});

// Mettre à jour un programme
router.post('/schedule/update/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { day, time, program_name, program_type } = req.body;

        if (!day || !time || !program_name || !program_type) {
            req.flash('error', 'Tous les champs sont obligatoires');
            return res.redirect('/admin/schedule');
        }

        // Valider le format de l'heure
        if (!/^\d{2}:\d{2}$/.test(time)) {
            req.flash('error', 'L\'heure doit être au format HH:MM');
            return res.redirect('/admin/schedule');
        }

        // Convertir le jour en numéro
        const dayMap = {
            'Lundi': 1, 'Mardi': 2, 'Mercredi': 3, 'Jeudi': 4,
            'Vendredi': 5, 'Samedi': 6, 'Dimanche': 7
        };
        
        const dayOfWeek = dayMap[day];
        if (!dayOfWeek) {
            req.flash('error', 'Jour invalide');
            return res.redirect('/admin/schedule');
        }

        // D'abord créer ou trouver le programme
        const existingProgram = await dbGet('SELECT id FROM programs WHERE title = ?', [program_name]);
        let programId;
        
        if (existingProgram) {
            programId = existingProgram.id;
        } else {
            // Créer un nouveau programme
            const result = await dbRun(
                'INSERT INTO programs (title, program_type, is_active) VALUES (?, ?, 1)',
                [program_name, program_type]
            );
            programId = result.lastID;
        }

        // Mettre à jour la grille
        await dbRun(
            'UPDATE program_schedule SET program_id = ?, day_of_week = ?, start_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [programId, dayOfWeek, time, id]
        );

        req.flash('success', 'Programme mis à jour avec succès !');
        res.redirect('/admin/schedule');

    } catch (error) {
        console.error('❌ Erreur mise à jour programme:', error);
        req.flash('error', 'Erreur lors de la mise à jour du programme');
        res.redirect('/admin/schedule');
    }
});

// Supprimer un programme
router.post('/schedule/delete/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await dbRun('UPDATE program_schedule SET is_active = 0 WHERE id = ?', [id]);

        req.flash('success', 'Programme supprimé de la grille avec succès !');
        res.redirect('/admin/schedule');

    } catch (error) {
        console.error('❌ Erreur suppression programme:', error);
        req.flash('error', 'Erreur lors de la suppression du programme');
        res.redirect('/admin/schedule');
    }
});

// ========== BAUME DE LA FOI ADMIN ==========

// Page d'administration du Baume de la Foi
router.get('/baume-de-la-foi', requireAuth, async (req, res) => {
    try {
        // Récupérer les statistiques
        const stats = await dbAll(`
            SELECT 
                (SELECT COUNT(*) FROM baume_prieres WHERE is_published = 1) as prieres_count,
                (SELECT COUNT(*) FROM baume_temoignages WHERE is_approved = 1) as temoignages_approuves,
                (SELECT COUNT(*) FROM baume_temoignages WHERE status = 'pending') as temoignages_en_attente,
                (SELECT COUNT(*) FROM baume_reflexions WHERE is_published = 1) as reflexions_count,
                (SELECT SUM(views) FROM baume_prieres) + (SELECT SUM(views) FROM baume_reflexions) as total_views
        `);

        // Récupérer l'activité récente
        const recentActivity = await dbAll(`
            SELECT 'prières' as type, title as content, created_at, author, 'published' as status 
            FROM baume_prieres 
            WHERE created_at >= datetime('now', '-7 days')
            UNION ALL
            SELECT 'témoignages' as type, content, created_at, author_name as author, status 
            FROM baume_temoignages 
            WHERE created_at >= datetime('now', '-7 days')
            UNION ALL
            SELECT 'réflexions' as type, title as content, created_at, author, 'published' as status 
            FROM baume_reflexions 
            WHERE created_at >= datetime('now', '-7 days')
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        // Récupérer les prières existantes
        const prieres = await dbAll(`
            SELECT id, title, content, category, created_at, is_published, video_url, views
            FROM baume_prieres 
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        // Récupérer les réflexions existantes
        const reflexions = await dbAll(`
            SELECT id, title, content, theme, created_at, is_published, image_url, video_url, media_type, views
            FROM baume_reflexions 
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        res.render('admin/baume-de-la-foi-admin', {
            title: 'Administration - Baume de la Foi',
            stats: stats[0] || {},
            recentActivity,
            prieres,
            reflexions,
            user: req.session.user,
            success_msg: null,
            error_msg: null
        });
    } catch (error) {
        console.error('❌ Erreur chargement admin Baume de la Foi:', error);
        res.redirect('/admin');
    }
});

// Sauvegarder une prière avec média (image ou vidéo)
router.post('/baume-de-la-foi/priere/save', requireAuth, baumeUpload.single('media_file'), async (req, res) => {
    try {
        const { title, content, category, reference_biblique, author, is_published } = req.body;

        if (!title || !content) {
            req.flash('error', 'Le titre et le contenu sont obligatoires');
            return res.redirect('/admin/baume-de-la-foi');
        }

        let mediaUrl = null;
        
        // Gérer l'upload du média (image ou vidéo)
        if (req.file) {
            const isImage = req.file.mimetype.startsWith('image/');
            const subfolder = isImage ? 'images' : 'videos';
            mediaUrl = `/uploads/baume/${subfolder}/${req.file.filename}`;
        }

        // Insérer la prière
        await dbRun(`
            INSERT INTO baume_prieres (title, content, category, reference_biblique, author, is_published, video_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            title.trim(),
            content.trim(),
            category || 'comfort',
            reference_biblique?.trim() || null,
            author?.trim() || 'Baume de la Foi',
            is_published ? 1 : 0,
            mediaUrl
        ]);

        req.flash('success', 'Prière créée avec succès');
        res.redirect('/admin/baume-de-la-foi');

    } catch (error) {
        console.error('❌ Erreur sauvegarde prière:', error);
        req.flash('error', 'Erreur lors de la sauvegarde de la prière');
        res.redirect('/admin/baume-de-la-foi');
    }
});

// Sauvegarder une réflexion avec média (image ou vidéo)
router.post('/baume-de-la-foi/reflexion/save', requireAuth, baumeUpload.single('media_file'), async (req, res) => {
    try {
        const { title, content, theme, publication_date, author, is_published } = req.body;

        if (!title || !content) {
            req.flash('error', 'Le titre et le contenu sont obligatoires');
            return res.redirect('/admin/baume-de-la-foi');
        }

        // Gérer l'upload du média (image ou vidéo)
        let imageUrl = null;
        let videoUrl = null;
        let mediaType = null;
        
        if (req.file) {
            const isImage = req.file.mimetype.startsWith('image/');
            const subfolder = isImage ? 'images' : 'videos';
            const mediaUrl = `/uploads/baume/${subfolder}/${req.file.filename}`;
            
            if (isImage) {
                imageUrl = mediaUrl;
                mediaType = 'image';
            } else {
                videoUrl = mediaUrl;
                mediaType = 'video';
            }
        }

        // Insérer la réflexion
        await dbRun(`
            INSERT INTO baume_reflexions (title, content, theme, publication_date, author, image_url, video_url, is_published, reference_biblique, media_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title.trim(),
            content.trim(),
            theme || 'faith',
            publication_date || new Date().toISOString().split('T')[0],
            author?.trim() || 'Baume de la Foi',
            imageUrl,
            videoUrl,
            is_published ? 1 : 0,
            null,
            mediaType
        ]);

        req.flash('success', 'Réflexion créée avec succès');
        res.redirect('/admin/baume-de-la-foi');

    } catch (error) {
        console.error('❌ Erreur sauvegarde réflexion:', error);
        req.flash('error', 'Erreur lors de la sauvegarde de la réflexion');
        res.redirect('/admin/baume-de-la-foi');
    }
});

// Supprimer une prière
router.post('/baume-de-la-foi/priere/delete/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Récupérer la prière pour supprimer la vidéo si nécessaire
        const priere = await dbGet('SELECT video_url FROM baume_prieres WHERE id = ?', [id]);
        
        if (priere && priere.video_url) {
            const videoPath = path.join(__dirname, '..', 'public', priere.video_url);
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
            }
        }

        // Supprimer la prière
        await dbRun('DELETE FROM baume_prieres WHERE id = ?', [id]);

        req.flash('success', 'Prière supprimée avec succès');
        res.redirect('/admin/baume-de-la-foi');

    } catch (error) {
        console.error('❌ Erreur suppression prière:', error);
        req.flash('error', 'Erreur lors de la suppression de la prière');
        res.redirect('/admin/baume-de-la-foi');
    }
});

// Supprimer une réflexion
router.post('/baume-de-la-foi/reflexion/delete/:id', requireAuthApi, async (req, res) => {
    try {
        const { id } = req.params;

        // Récupérer la réflexion pour supprimer les médias si nécessaire
        const reflexion = await dbGet('SELECT image_url, video_url FROM baume_reflexions WHERE id = ?', [id]);
        
        if (reflexion) {
            // Supprimer l'image si elle existe
            if (reflexion.image_url) {
                const imagePath = path.join(__dirname, '..', 'public', reflexion.image_url);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            
            // Supprimer la vidéo si elle existe
            if (reflexion.video_url) {
                const videoPath = path.join(__dirname, '..', 'public', reflexion.video_url);
                if (fs.existsSync(videoPath)) {
                    fs.unlinkSync(videoPath);
                }
            }
        }

        // Supprimer la réflexion
        await dbRun('DELETE FROM baume_reflexions WHERE id = ?', [id]);

        res.json({ success: true, message: 'Réflexion supprimée avec succès' });

    } catch (error) {
        console.error('❌ Erreur suppression réflexion:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression de la réflexion' });
    }
});

// API pour récupérer plus de témoignages
router.get('/api/baume/temoignages', async (req, res) => {
    try {
        const { page = 1, limit = 6 } = req.query;
        const offset = (page - 1) * limit;
        const temoignages = await dbAll(`
            SELECT id, author_name, content, created_at
            FROM baume_temoignages 
            WHERE is_approved = 1 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `, [parseInt(limit), offset]);
        
        res.json({ success: true, data: temoignages });
    } catch (error) {
        console.error('❌ Erreur API témoignages:', error);
        res.status(500).json({ success: false, error: 'Erreur lors du chargement' });
    }
});

// API pour les statistiques du Baume de la Foi
router.get('/baume-de-la-foi/stats', requireAuth, async (req, res) => {
    try {
        const stats = await dbAll(`
            SELECT 
                (SELECT COUNT(*) FROM baume_prieres WHERE is_published = 1) as prieres_count,
                (SELECT COUNT(*) FROM baume_temoignages WHERE is_approved = 1) as temoignages_approuves,
                (SELECT COUNT(*) FROM baume_temoignages WHERE status = 'pending') as temoignages_en_attente,
                (SELECT COUNT(*) FROM baume_reflexions WHERE is_published = 1) as reflexions_count,
                (SELECT SUM(views) FROM baume_prieres) + (SELECT SUM(views) FROM baume_reflexions) as total_views
        `);

        res.json({ 
            success: true, 
            data: stats[0] || {} 
        });
    } catch (error) {
        console.error('❌ Erreur stats Baume de la Foi:', error);
        res.status(500).json({ success: false, error: 'Erreur lors du chargement des statistiques' });
    }
});

// API pour incrémenter les vues
router.post('/api/baume/view/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        
        let table;
        if (type === 'priere') {
            table = 'baume_prieres';
        } else if (type === 'reflexion') {
            table = 'baume_reflexions';
        } else {
            return res.status(400).json({ success: false, error: 'Type invalide' });
        }
        
        await dbRun(`UPDATE ${table} SET views = views + 1 WHERE id = ?`, [id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erreur incrément vues:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour' });
    }
});

// ========== ROUTES POUR LES TÉMOIGNAGES (ADMIN) ==========

// GET - Récupérer tous les témoignages pour l'administration
router.get('/baume-de-la-foi/temoignages', requireAuth, async (req, res) => {
    try {
        const { status } = req.query;
        let sql = 'SELECT * FROM baume_temoignages WHERE 1=1';
        const params = [];

        if (status && status !== 'all') {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC';

        const temoignages = await dbAll(sql, params);
        res.json({ success: true, data: temoignages });
    } catch (error) {
        console.error('❌ Erreur récupération témoignages:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération des témoignages' });
    }
});

// GET - Récupérer un témoignage spécifique
router.get('/baume-de-la-foi/temoignage/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const temoignage = await dbGet('SELECT * FROM baume_temoignages WHERE id = ?', [id]);

        if (!temoignage) {
            return res.status(404).json({ success: false, error: 'Témoignage non trouvé' });
        }

        res.json({ success: true, data: temoignage });
    } catch (error) {
        console.error('❌ Erreur récupération témoignage:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération du témoignage' });
    }
});

// POST - Approuver ou rejeter un témoignage
router.post('/baume-de-la-foi/temoignage/:id/approve', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;

        await dbRun(`
            UPDATE baume_temoignages 
            SET is_approved = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [
            approved ? 1 : 0,
            approved ? 'approved' : 'rejected',
            id
        ]);

        res.json({ 
            success: true, 
            message: approved ? 'Témoignage approuvé avec succès' : 'Témoignage rejeté avec succès'
        });
    } catch (error) {
        console.error('❌ Erreur approbation témoignage:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour du témoignage' });
    }
});

// DELETE - Supprimer un témoignage
router.delete('/baume-de-la-foi/temoignage/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await dbRun('DELETE FROM baume_temoignages WHERE id = ?', [id]);

        res.json({ 
            success: true, 
            message: 'Témoignage supprimé avec succès'
        });
    } catch (error) {
        console.error('❌ Erreur suppression témoignage:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression du témoignage' });
    }
});

// ========== EXPORT ==========
module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireAuthApi = requireAuthApi;
module.exports.requireSuperAdmin = requireSuperAdmin;