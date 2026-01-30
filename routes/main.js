const express = require('express');
const router = express.Router();
const { 
    dbAll, 
    dbGet, 
    dbRun,  // AJOUTÉ
    getPaginatedResults, 
    getSiteStats,
    incrementView,
    getSettings 
} = require('../config/database');

// ========== MIDDLEWARE SPÉCIFIQUE AUX PAGES ==========
router.use(async (req, res, next) => {
    try {
        // Charger les paramètres du site
        const settings = await getSettings();
        res.locals.siteSettings = settings;
        
        // Ajouter l'utilisateur s'il est connecté
        res.locals.user = req.user || null;
        
        // Statistiques pour le footer
        const stats = await getSiteStats();
        res.locals.siteStats = stats;
        
        next();
    } catch (error) {
        console.error('❌ Middleware error:', error.message);
        next();
    }
});

// ========== DÉTECTION DES REQUÊTES AJAX ==========
router.use((req, res, next) => {
    res.locals.isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';
    next();
});

// ========== PAGE D'ACCUEIL ==========
// ========== PAGE PRINCIPALE (TOUTES LES PAGES EN UNE) ==========
router.get('/', async (req, res) => {
    try {
        // Récupérer TOUTES les données nécessaires
        const [latestNews, programs, gallery, newsList, stats] = await Promise.all([
            dbAll('SELECT id, title, content, image_url, created_at FROM news WHERE is_published = 1 ORDER BY created_at DESC LIMIT 4'),
            dbAll('SELECT * FROM programs WHERE is_active = 1 ORDER BY created_at DESC'),
            dbAll('SELECT * FROM gallery ORDER BY created_at DESC LIMIT 12'),
            dbAll('SELECT * FROM news WHERE is_published = 1 ORDER BY created_at DESC'),
            getSiteStats()
        ]);
        
        // Rendre TOUTES les pages dans un seul template
        res.render('layout', {
            title: 'TELEX - La Voix Étudiante',
            page: 'home',
            body: `
                <!-- Page Accueil -->
                <div id="home-page" class="page-content">
                    ${await renderPartial('pages/index', {
                        latestNews,
                        programs: programs.slice(0, 4),
                        stats
                    })}
                </div>
                
                <!-- Page À propos -->
                <div id="about-page" class="page-content">
                    ${await renderPartial('pages/about', { stats })}
                </div>
                
                <!-- Page Mission -->
                <div id="mission-page" class="page-content">
                    ${await renderPartial('pages/mission', {})}
                </div>
                
                <!-- Page Programmes -->
                <div id="programs-page" class="page-content">
                    ${await renderPartial('pages/programs', { programs })}
                </div>
                
                <!-- Page Galerie -->
                <div id="gallery-page" class="page-content">
                    ${await renderPartial('pages/gallery', { gallery })}
                </div>
                
                <!-- Page Actualités -->
                <div id="news-page" class="page-content">
                    ${await renderPartial('pages/news', { news: newsList })}
                </div>
                
                <!-- Page Contact -->
                <div id="contact-page" class="page-content">
                    ${await renderPartial('pages/contact', {})}
                </div>
                
                <!-- Page Réseaux sociaux -->
                <div id="social-page" class="page-content">
                    ${await renderPartial('pages/social', {})}
                </div>
            `
        });
        
    } catch (error) {
        console.error('❌ Erreur page principale:', error);
        res.render('layout', {
            title: 'TELEX',
            page: 'home',
            body: '<div class="alert alert-danger">Erreur de chargement</div>'
        });
    }
});

// Fonction pour rendre des partials
async function renderPartial(template, data) {
    // Cette fonction devrait utiliser un moteur de template pour rendre
    // Pour l'exemple, on retourne un placeholder
    return `<div>Contenu de ${template}</div>`;
}

// ========== PAGES INDIVIDUELLES (pour le SEO et premier accès) ==========
router.get('/about', async (req, res) => {
    res.render('layout', {
        title: 'À propos - TELEX',
        page: 'about',
        body: '<div id="about-page" class="page-content active">' + 
              await renderPartial('pages/about', await getStats()) + 
              '</div>'
    });
});

// Répétez pour chaque route si nécessaire
// ========== À PROPOS ==========
router.get('/about', async (req, res) => {
    try {
        const stats = await getSiteStats();
        
        const templateData = {
            title: 'À propos - TELEX',
            page: 'about',
            stats: stats || {}
        };
        
        if (res.locals.isAjax) {
            res.render('partials/about-content', templateData);
        } else {
            res.render('pages/about', templateData);
        }
        
    } catch (error) {
        console.error('❌ Erreur route /about:', error);
        
        const errorData = {
            title: 'À propos - TELEX',
            page: 'about',
            stats: {}
        };
        
        if (res.locals.isAjax) {
            res.render('partials/about-content', errorData);
        } else {
            res.render('pages/about', errorData);
        }
    }
});

// ========== MISSION ==========
router.get('/mission', (req, res) => {
    const templateData = {
        title: 'Mission & Valeurs - TELEX',
        page: 'mission'
    };
    
    if (res.locals.isAjax) {
        res.render('partials/mission-content', templateData);
    } else {
        res.render('pages/mission', templateData);
    }
});

// ========== PROGRAMMES ==========
router.get('/programs', async (req, res) => {
    try {
        const programs = await dbAll(
            'SELECT * FROM programs WHERE is_active = 1 ORDER BY created_at DESC'
        );
        
        const templateData = {
            title: 'Nos Programmes - TELEX',
            page: 'programs',
            programs: programs || []
        };
        
        if (res.locals.isAjax) {
            res.render('partials/programs-content', templateData);
        } else {
            res.render('pages/programs', templateData);
        }
        
    } catch (error) {
        console.error('❌ Erreur route /programs:', error);
        
        const errorData = {
            title: 'Nos Programmes - TELEX',
            page: 'programs',
            programs: []
        };
        
        if (res.locals.isAjax) {
            res.render('partials/programs-content', errorData);
        } else {
            res.render('pages/programs', errorData);
        }
    }
});

// ========== GALERIE ==========
router.get('/gallery', async (req, res) => {
    try {
        const gallery = await dbAll(
            'SELECT * FROM gallery ORDER BY created_at DESC LIMIT 12'
        );
        
        const templateData = {
            title: 'Galerie - TELEX',
            page: 'gallery',
            gallery: gallery || []
        };
        
        if (res.locals.isAjax) {
            res.render('partials/gallery-content', templateData);
        } else {
            res.render('pages/gallery', templateData);
        }
        
    } catch (error) {
        console.error('❌ Erreur route /gallery:', error);
        
        const errorData = {
            title: 'Galerie - TELEX',
            page: 'gallery',
            gallery: []
        };
        
        if (res.locals.isAjax) {
            res.render('partials/gallery-content', errorData);
        } else {
            res.render('pages/gallery', errorData);
        }
    }
});

// ========== ACTUALITÉS (liste) ==========
router.get('/news', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        
        const [news, recommendedNews, total] = await Promise.all([
            dbAll(
                `SELECT * FROM news 
                 WHERE is_published = 1 
                 ORDER BY created_at DESC 
                 LIMIT ? OFFSET ?`,
                [limit, (page - 1) * limit]
            ),
            dbAll(
                `SELECT id, title, category, image_url, created_at 
                 FROM news 
                 WHERE is_published = 1 
                 ORDER BY created_at DESC 
                 LIMIT 6`
            ),
            dbGet('SELECT COUNT(*) as count FROM news WHERE is_published = 1')
        ]);
        
        const templateData = {
            title: 'Actualités TELEX',
            page: 'news',
            news: news || [],
            recommendedNews: recommendedNews || [],
            pagination: {
                page,
                limit,
                total: total.count,
                pages: Math.ceil(total.count / limit)
            }
        };
        
        if (res.locals.isAjax) {
            res.render('partials/news-content', templateData);
        } else {
            res.render('pages/news', templateData);
        }
        
    } catch (error) {
        console.error('Erreur /news:', error);
        
        const errorData = {
            title: 'Actualités TELEX',
            page: 'news',
            news: [],
            recommendedNews: [],
            pagination: {
                page: 1,
                limit: 12,
                total: 0,
                pages: 1
            }
        };
        
        if (res.locals.isAjax) {
            res.render('partials/news-content', errorData);
        } else {
            res.render('pages/news', errorData);
        }
    }
});

// ========== PAGE D'UNE ACTUALITÉ ==========
router.get('/news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const news = await dbGet(
            'SELECT * FROM news WHERE id = ? AND is_published = 1',
            [id]
        );
        
        if (!news) {
            return res.status(404).render('pages/404', {
                title: 'Actualité non trouvée'
            });
        }
        
        // Incrémenter les vues
        await dbRun(
            'UPDATE news SET views = COALESCE(views, 0) + 1 WHERE id = ?',
            [id]
        );
        
        const relatedNews = await dbAll(
            `SELECT id, title, category, image_url, created_at 
             FROM news 
             WHERE is_published = 1 
               AND category = ? 
               AND id != ?
             ORDER BY created_at DESC 
             LIMIT 3`,
            [news.category, id]
        );
        
        const templateData = {
            title: news.title,
            news: news,
            relatedNews: relatedNews || [],
            page: 'news'
        };
        
        if (res.locals.isAjax) {
            res.render('partials/news-single-content', templateData);
        } else {
            res.render('pages/news-single', templateData);
        }
        
    } catch (error) {
        console.error('Erreur /news/:id:', error);
        res.status(500).render('pages/error', {
            title: 'Erreur serveur',
            message: 'Une erreur est survenue'
        });
    }
});

// ========== CONTACT ==========
router.get('/contact', (req, res) => {
    const templateData = {
        title: 'Contact - TELEX',
        page: 'contact'
    };
    
    if (res.locals.isAjax) {
        res.render('partials/contact-content', templateData);
    } else {
        res.render('pages/contact', templateData);
    }
});

// ========== POST CONTACT ==========
router.post('/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tous les champs sont obligatoires.' 
            });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Veuillez entrer un email valide.' 
            });
        }
        
        await dbRun(
            'INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)',
            [name.trim(), email.trim(), subject.trim(), message.trim()]
        );
        
        console.log('📧 Message reçu de:', name, email);
        
        res.json({ 
            success: true, 
            message: 'Message envoyé avec succès! Nous vous répondrons dans les plus brefs délais.' 
        });
        
    } catch (error) {
        console.error('❌ Erreur POST /contact:', error);
        
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ 
                success: false, 
                message: 'Erreur de validation des données.' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur. Veuillez réessayer plus tard.' 
        });
    }
});

// ========== RÉSEAUX SOCIAUX ==========
router.get('/social', (req, res) => {
    const templateData = {
        title: 'Réseaux sociaux - TELEX',
        page: 'social'
    };
    
    if (res.locals.isAjax) {
        res.render('partials/social-content', templateData);
    } else {
        res.render('pages/social', templateData);
    }
});

// ========== NEWSLETTER ==========
router.post('/newsletter/subscribe', async (req, res) => {
    try {
        const { email, name } = req.body;
        
        if (!email) {
            return res.json({ success: false, message: 'Email requis' });
        }
        
        // Vérifier si l'email existe déjà
        const existing = await dbGet('SELECT * FROM subscribers WHERE email = ?', [email]);
        
        if (existing) {
            return res.json({ success: false, message: 'Vous êtes déjà inscrit à la newsletter' });
        }
        
        // Nouvelle inscription
        await dbRun(
            'INSERT INTO subscribers (email, name, source) VALUES (?, ?, ?)',
            [email, name || null, 'website']
        );
        
        res.json({ success: true, message: 'Inscription réussie à la newsletter' });
        
    } catch (error) {
        console.error('❌ Erreur newsletter:', error.message);
        res.json({ success: false, message: 'Une erreur est survenue' });
    }
});

// ========== PAGE RECHERCHE ==========
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        
        if (!query || query.trim().length < 2) {
            return res.render('pages/search', {
                title: 'Recherche - TELEX',
                page: 'search',
                query: '',
                results: [],
                message: 'Veuillez entrer au moins 2 caractères pour la recherche.'
            });
        }
        
        const searchTerm = `%${query}%`;
        
        const newsResults = await dbAll(
            `SELECT id, title, content, image_url, author, category, created_at, 'news' as type 
             FROM news 
             WHERE is_published = 1 
               AND (title LIKE ? OR content LIKE ?)
             ORDER BY created_at DESC 
             LIMIT 10`,
            [searchTerm, searchTerm]
        );
        
        const programResults = await dbAll(
            `SELECT id, title, description, image_url, category, created_at, 'program' as type 
             FROM programs 
             WHERE is_active = 1 
               AND (title LIKE ? OR description LIKE ?)
             ORDER BY created_at DESC 
             LIMIT 10`,
            [searchTerm, searchTerm]
        );
        
        const allResults = [...newsResults, ...programResults];
        
        const templateData = {
            title: `Recherche: ${query} - TELEX`,
            page: 'search',
            query: query,
            results: allResults,
            message: allResults.length === 0 ? 'Aucun résultat trouvé pour votre recherche.' : null
        };
        
        if (res.locals.isAjax) {
            res.render('partials/search-content', templateData);
        } else {
            res.render('pages/search', templateData);
        }
        
    } catch (error) {
        console.error('❌ Erreur recherche:', error.message);
        res.status(500).render('pages/error', {
            title: 'Erreur recherche - TELEX',
            message: 'Une erreur est survenue lors de la recherche.',
            code: 500
        });
    }
});

// ========== PAGES LÉGALES ==========
router.get('/privacy', (req, res) => {
    const templateData = {
        title: 'Politique de confidentialité - TELEX',
        page: 'privacy'
    };
    
    if (res.locals.isAjax) {
        res.render('partials/privacy-content', templateData);
    } else {
        res.render('pages/privacy', templateData);
    }
});

router.get('/terms', (req, res) => {
    const templateData = {
        title: 'Conditions d\'utilisation - TELEX',
        page: 'terms'
    };
    
    if (res.locals.isAjax) {
        res.render('partials/terms-content', templateData);
    } else {
        res.render('pages/terms', templateData);
    }
});

// ========== PAGE 404 ==========
router.get('*', (req, res) => {
    res.status(404).render('pages/404', {
        title: 'Page non trouvée - TELEX',
        page: '404'
    });
});

module.exports = router;