const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../config/database');

// ========== ACCUEIL ==========
// ========== ACCUEIL ==========
router.get('/', async (req, res) => {
    try {
        // CORRECTION : Remplacer 'excerpt' par 'content' ou supprimer
        const latestNews = await dbAll(
            'SELECT id, title, content, image_url, created_at FROM news WHERE is_published = 1 ORDER BY created_at DESC LIMIT 4'
            // OU : 'SELECT id, title, image_url, created_at FROM news WHERE is_published = 1 ORDER BY created_at DESC LIMIT 4'
        );
        
        // Récupérer les programmes
        const programs = await dbAll(
            'SELECT id, title, description FROM programs WHERE is_active = 1 ORDER BY created_at DESC LIMIT 4'
        );
        
        // Récupérer les paramètres du footer
        const footerSettings = await dbAll('SELECT setting_key, setting_value FROM footer_settings');
        const footerData = {};
        footerSettings.forEach(setting => {
            footerData[setting.setting_key] = setting.setting_value;
        });
        
        res.render('pages/index', {
            title: 'Accueil - TELEX',
            page: 'home',
            latestNews,
            programs,
            footer: footerData
        });
    } catch (error) {
        console.error('❌ Erreur route /:', error);
        res.render('pages/index', {
            title: 'Accueil - TELEX',
            page: 'home',
            latestNews: [],
            programs: [],
            footer: {}
        });
    }
});

// ========== À PROPOS ==========
router.get('/about', async (req, res) => {
    try {
        const stats = {
            totalNews: (await dbGet('SELECT COUNT(*) as count FROM news WHERE is_published = 1')).count || 0,
            totalPrograms: (await dbGet('SELECT COUNT(*) as count FROM programs WHERE is_active = 1')).count || 0
        };
        
        res.render('pages/about', {
            title: 'À propos - TELEX',
            page: 'about',
            stats
        });
    } catch (error) {
        console.error('❌ Erreur route /about:', error);
        res.render('pages/about', {
            title: 'À propos - TELEX',
            page: 'about',
            stats: {}
        });
    }
});

// ========== MISSION ==========
router.get('/mission', (req, res) => {
    res.render('pages/mission', {
        title: 'Mission & Valeurs - TELEX',
        page: 'mission'
    });
});

// ========== PROGRAMMES ==========
router.get('/programs', async (req, res) => {
    try {
        const programs = await dbAll(
            'SELECT * FROM programs WHERE is_active = 1 ORDER BY created_at DESC'
        );
        
        // Récupérer la grille des programmes
        const schedule = await dbAll(`
            SELECT * FROM program_schedule 
            WHERE is_active = 1 
            ORDER BY 
                CASE day 
                    WHEN 'Lundi' THEN 1
                    WHEN 'Mardi' THEN 2
                    WHEN 'Mercredi' THEN 3
                    WHEN 'Jeudi' THEN 4
                    WHEN 'Vendredi' THEN 5
                    WHEN 'Samedi' THEN 6
                    WHEN 'Dimanche' THEN 7
                END,
                time
        `);
        
        res.render('pages/programs', {
            title: 'Nos Programmes - TELEX',
            page: 'programs',
            programs: programs || [],
            schedule: schedule || []
        });
    } catch (error) {
        console.error('❌ Erreur route /programs:', error);
        res.render('pages/programs', {
            title: 'Nos Programmes - TELEX',
            page: 'programs',
            programs: [],
            schedule: []
        });
    }
});

// ========== GALERIE ==========
router.get('/gallery', async (req, res) => {
    try {
        const gallery = await dbAll(
            'SELECT * FROM gallery ORDER BY created_at DESC LIMIT 12'
        );
        
        res.render('pages/gallery', {
            title: 'Galerie - TELEX',
            page: 'gallery',
            gallery: gallery || []
        });
    } catch (error) {
        console.error('❌ Erreur route /gallery:', error);
        res.render('pages/gallery', {
            title: 'Galerie - TELEX',
            page: 'gallery',
            gallery: []
        });
    }
});

// ========== ACTUALITÉS (liste) ==========
router.get('/news', async (req, res) => {
    try {
        // Utiliser dbAll au lieu de db.query
        const news = await dbAll(`
            SELECT * FROM news 
            WHERE is_published = 1 
            ORDER BY created_at DESC
        `);
        
        // Récupérer les recommandations (les 6 dernières actualités)
        const recommendedNews = await dbAll(`
            SELECT id, title, category, image_url, created_at 
            FROM news 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 6
        `);
        
        res.render('pages/news', {
            title: 'Actualités TELEX',
            news: news || [],
            page: 'news', // ← AJOUTER CETTE LIGNE
            recommendedNews: recommendedNews || [] // Tableau vide si aucun résultat
        });
    } catch (error) {
        console.error('Erreur /news:', error);
        res.render('pages/news', {
            title: 'Actualités TELEX',
            news: [],
            recommendedNews: [] // Tableau vide en cas d'erreur
        });
    }
});

// ========== PAGE D'UNE ACTUALITÉ ==========
router.get('/news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Récupérer l'actualité
        const news = await dbGet(
            'SELECT * FROM news WHERE id = ? AND is_published = 1',
            [id]
        );
        
        if (!news) {
            return res.status(404).render('pages/404', {
                title: 'Actualité non trouvée'
            });
        }
        
        // Incrémenter le compteur de vues
        await dbAll(
            'UPDATE news SET views = COALESCE(views, 0) + 1 WHERE id = ?',
            [id]
        );
        
        // Récupérer les articles connexes (même catégorie, sauf l'article actuel)
        const relatedNews = await dbAll(`
            SELECT id, title, category, image_url, created_at 
            FROM news 
            WHERE is_published = 1 
            AND category = ? 
            AND id != ?
            ORDER BY created_at DESC 
            LIMIT 3
        `, [news.category, id]);
        
        res.render('pages/news-single', {
            title: news.title,
            page: 'news',
            news: news,
            relatedNews: relatedNews || [] // Toujours un tableau
        });
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
    res.render('pages/contact', {
        title: 'Contact - TELEX',
        page: 'contact'
    });
});

// ========== POST CONTACT (API) ==========
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
        
        // Validation email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Veuillez entrer un email valide.' 
            });
        }
        
        // Insérer dans la base
        await dbAll(
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
    res.render('pages/social', {
        title: 'Réseaux sociaux - TELEX',
        page: 'social'
    });
});


module.exports = router;