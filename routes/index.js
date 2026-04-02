const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../config/database');
const detectLocation = require('../middleware/location');

// Middleware d'authentification admin
function requireAuth(req, res, next) {
    if (!req.session || !req.session.user || !req.session.user.loggedIn) {
        console.log('⚠️  [Admin Middleware] Utilisateur non connecté');
        return res.redirect('/admin/login');
    }
    console.log('✅ [Admin Middleware] Utilisateur authentifié:', req.session.user.username);
    next();
}

// Appliquer le middleware de détection de localisation à toutes les routes
router.use(detectLocation);

// Fonction pour récupérer les données du footer
async function getFooterSettings() {
    try {
        const footerSettings = await dbAll('SELECT * FROM footer_settings ORDER BY setting_key');
        const settings = {};
        footerSettings.forEach(setting => {
            settings[setting.setting_key] = setting.setting_value;
        });
        return settings;
    } catch (error) {
        console.error('❌ Erreur récupération footer settings:', error);
        return {};
    }
}

// ========== ACCUEIL ==========
// ========== ACCUEIL ==========
router.get('/', async (req, res) => {
    try {
        // Récupérer les 5 dernières actualités publiées
        const news = await dbAll(
            'SELECT id, title, content, image_url, video_url, category, created_at FROM news WHERE is_published = 1 ORDER BY created_at DESC LIMIT 5'
        );
        
        // Récupérer les programmes
        const programs = await dbAll(
            'SELECT id, title, description, program_type FROM programs WHERE is_active = 1 ORDER BY created_at DESC LIMIT 5'
        );
        
        // Récupérer les 2 premières prières publiées
        const prieres = await dbAll(`
            SELECT id, title, content, category, reference_biblique, author, video_url, created_at, views
            FROM baume_prieres 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 2
        `);
        
        console.log('📊 Prières récupérées pour accueil:', prieres.length);
        if (prieres.length > 0) {
            console.log('📝 Première prière:', JSON.stringify(prieres[0], null, 2));
        }

        // Récupérer les 3 premières réflexions publiées
        const reflexions = await dbAll(`
            SELECT id, title, content, theme, image_url, video_url, media_type, author, publication_date, views, reference_biblique
            FROM baume_reflexions 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 3
        `);
        
        console.log('📊 Données envoyées au template index:');
        console.log('  - News:', news ? news.length : 0, 'articles');
        console.log('  - Programs:', programs ? programs.length : 0, 'programmes');
        console.log('  - Prières:', prieres ? prieres.length : 0, 'prières');
        console.log('  - Réflexions:', reflexions ? reflexions.length : 0, 'réflexions');
        
        // Debug des données réelles
        if (prieres && prieres.length > 0) {
            console.log('📝 Première prière:', JSON.stringify(prieres[0], null, 2));
        }
        if (reflexions && reflexions.length > 0) {
            console.log('💭 Première réflexion:', JSON.stringify(reflexions[0], null, 2));
        }
        
        // Récupérer les données du footer
        const footer = await getFooterSettings();
        
        res.render('pages/index', {
            title: 'Accueil - TELEX',
            page: 'home',
            news,
            programs,
            prieres,
            reflexions,
            footer
        });
    } catch (error) {
        console.error('❌ Erreur route /:', error);
        
        // Récupérer les données du footer même en cas d'erreur
        const footer = await getFooterSettings();
        
        res.render('pages/index', {
            title: 'Accueil - TELEX',
            page: 'home',
            news: [],
            programs: [],
            prieres: [],
            reflexions: [],
            footer
        });
    }
});

// ========== BAUME DE LA FOI ==========
router.get('/baume-de-la-foi', async (req, res) => {
    try {
        console.log('🔍 Chargement page publique Baume de la Foi');
        
        // Utiliser les mêmes requêtes que l'API baume pour la cohérence
        // Récupérer les prières publiées
        const prieres = await dbAll(`
            SELECT id, title, content, category, reference_biblique, author, video_url, created_at, views
            FROM baume_prieres 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        // Récupérer les réflexions publiées
        const reflexions = await dbAll(`
            SELECT id, title, content, theme, image_url, video_url, media_type, author, publication_date, views, reference_biblique
            FROM baume_reflexions 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        // Récupérer les témoignages approuvés
        const temoignages = await dbAll(`
            SELECT id, author_name, content, created_at
            FROM baume_temoignages 
            WHERE is_approved = 1 
            ORDER BY created_at DESC 
            LIMIT 12
        `);
        
        console.log('📊 Données chargées pour page publique:');
        console.log('  - Prières publiées:', prieres.length);
        console.log('  - Réflexions publiées:', reflexions.length);
        console.log('  - Témoignages approuvés:', temoignages.length);
        
        // Debug : afficher les IDs des premières entrées
        if (prieres.length > 0) {
            console.log('  - Première prière ID:', prieres[0].id, 'Titre:', prieres[0].title);
        }
        if (reflexions.length > 0) {
            console.log('  - Première réflexion ID:', reflexions[0].id, 'Titre:', reflexions[0].title);
        }

        res.render('pages/baume-de-la-foi', {
            title: 'Baume de la Foi - Réconfort Spirituel',
            page: 'baume-de-la-foi',
            prieres,
            reflexions,
            temoignages
        });
    } catch (error) {
        console.error('❌ Erreur chargement page Baume de la Foi:', error);
        res.render('pages/baume-de-la-foi', {
            title: 'Baume de la Foi - Réconfort Spirituel',
            page: 'baume-de-la-foi',
            prieres: [],
            reflexions: [],
            temoignages: []
        });
    }
});

// ========== API BAUME DE LA FOI ==========

// API pour récupérer plus de prières (infinite scroll)
router.get('/api/baume/prieres', async (req, res) => {
    try {
        const { page = 1, limit = 6, category } = req.query;
        const offset = (page - 1) * limit;
        
        let sql = `
            SELECT id, title, content, category, reference_biblique, author, image_url, video_url, media_type, created_at, views
            FROM baume_prieres 
            WHERE is_published = 1
        `;
        const params = [];
        
        if (category && category !== 'all') {
            sql += ' AND category = ?';
            params.push(category);
        }
        
        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const prieres = await dbAll(sql, params);
        
        res.json({ success: true, data: prieres });
    } catch (error) {
        console.error('❌ Erreur API prières:', error);
        res.status(500).json({ success: false, error: 'Erreur lors du chargement' });
    }
});

// API pour récupérer plus de réflexions
router.get('/api/baume/reflexions', async (req, res) => {
    try {
        const { page = 1, limit = 4, theme } = req.query;
        const offset = (page - 1) * limit;
        
        let sql = `
            SELECT id, title, content, theme, image_url, video_url, media_type, author, publication_date, views
            FROM baume_reflexions 
            WHERE is_published = 1
        `;
        const params = [];
        
        if (theme && theme !== 'all') {
            sql += ' AND theme = ?';
            params.push(theme);
        }
        
        sql += ' ORDER BY publication_date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);
        
        const reflexions = await dbAll(sql, params);
        
        res.json({ success: true, data: reflexions });
    } catch (error) {
        console.error('❌ Erreur API réflexions:', error);
        res.status(500).json({ success: false, error: 'Erreur lors du chargement' });
    }
});

// API simple pour vérifier les données publiées (debug)
router.get('/api/baume-de-la-foi/public-data', async (req, res) => {
    try {
        console.log('🔍 API public data - Vérification');
        
        // Récupérer les prières publiées
        const prieres = await dbAll(`
            SELECT id, title, is_published, created_at 
            FROM baume_prieres 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        // Récupérer les réflexions publiées
        const reflexions = await dbAll(`
            SELECT id, title, is_published, created_at 
            FROM baume_reflexions 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        console.log('📊 API public data:');
        console.log('  - Prières publiées:', prieres.length);
        console.log('  - Réflexions publiées:', reflexions.length);
        
        res.json({
            success: true,
            data: {
                prieres: prieres,
                reflexions: reflexions,
                counts: {
                    prieres: prieres.length,
                    reflexions: reflexions.length
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur API public data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route de debug pour vérifier les données du Baume de la Foi
router.get('/baume-de-la-foi/debug', async (req, res) => {
    try {
        console.log('🔍 Debug Baume de la Foi - Vérification des données');
        
        // Vérifier toutes les prières (publiées et non publiées)
        const allPrieres = await dbAll(`
            SELECT id, title, is_published, created_at 
            FROM baume_prieres 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        // Vérifier toutes les réflexions (publiées et non publiées)
        const allReflexions = await dbAll(`
            SELECT id, title, is_published, created_at 
            FROM baume_reflexions 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        // Vérifier les prières publiées uniquement
        const publishedPrieres = await dbAll(`
            SELECT id, title, is_published, created_at 
            FROM baume_prieres 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        // Vérifier les réflexions publiées uniquement
        const publishedReflexions = await dbAll(`
            SELECT id, title, is_published, created_at 
            FROM baume_reflexions 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.log('📊 Données Baume de la Foi:');
        console.log('  - Toutes les prières:', allPrieres.length);
        console.log('  - Prières publiées:', publishedPrieres.length);
        console.log('  - Toutes les réflexions:', allReflexions.length);
        console.log('  - Réflexions publiées:', publishedReflexions.length);
        
        res.json({
            success: true,
            stats: {
                total_prieres: allPrieres.length,
                published_prieres: publishedPrieres.length,
                total_reflexions: allReflexions.length,
                published_reflexions: publishedReflexions.length
            },
            data: {
                all_prieres: allPrieres,
                published_prieres: publishedPrieres,
                all_reflexions: allReflexions,
                published_reflexions: publishedReflexions
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur debug Baume de la Foi:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route de test de la base de données
router.get('/baume-de-la-foi/test-db', async (req, res) => {
    try {
        console.log('🔍 Test base de données Baume de la Foi');
        
        // Tester la connexion
        const test = await dbGet('SELECT 1 as test');
        console.log('✅ Connexion DB OK:', test);
        
        // Vérifier si les tables existent
        const tables = await dbAll(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('baume_prieres', 'baume_reflexions', 'baume_temoignages')
        `);
        console.log('📋 Tables trouvées:', tables.map(t => t.name));
        
        // Vérifier la structure des tables
        const prieresStructure = await dbAll(`PRAGMA table_info(baume_prieres)`);
        const reflexionsStructure = await dbAll(`PRAGMA table_info(baume_reflexions)`);
        
        console.log('🏗️ Structure baume_prieres:', prieresStructure.map(col => col.name));
        console.log('🏗️ Structure baume_reflexions:', reflexionsStructure.map(col => col.name));
        
        // Compter tous les enregistrements
        const prieresCount = await dbGet('SELECT COUNT(*) as count FROM baume_prieres');
        const reflexionsCount = await dbGet('SELECT COUNT(*) as count FROM baume_reflexions');
        const temoignagesCount = await dbGet('SELECT COUNT(*) as count FROM baume_temoignages');
        
        console.log('📊 Comptages totaux:');
        console.log('  - baume_prieres:', prieresCount.count);
        console.log('  - baume_reflexions:', reflexionsCount.count);
        console.log('  - baume_temoignages:', temoignagesCount.count);
        
        res.json({
            success: true,
            connection: true,
            tables: tables.map(t => t.name),
            structure: {
                baume_prieres: prieresStructure.map(col => ({ name: col.name, type: col.type })),
                baume_reflexions: reflexionsStructure.map(col => ({ name: col.name, type: col.type }))
            },
            counts: {
                baume_prieres: prieresCount.count,
                baume_reflexions: reflexionsCount.count,
                baume_temoignages: temoignagesCount.count
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur test DB:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST - Soumettre un témoignage depuis la page publique
router.post('/baume-de-la-foi/temoignage', async (req, res) => {
    try {
        console.log('📝 Route POST /baume-de-la-foi/temoignage appelée');
        console.log('📝 Body reçu:', req.body);
        
        const { nom, email, ville, temoignage, consentement } = req.body;

        console.log('📝 Données extraites:', { nom, email, ville, consentement });

        // Validation des données
        if (!nom || !email || !temoignage || !consentement) {
            console.log('❌ Validation échouée:', { 
                nom: !!nom, 
                email: !!email,
                temoignage: !!temoignage, 
                consentement: !!consentement 
            });
            return res.status(400).json({ 
                success: false, 
                error: 'Tous les champs obligatoires doivent être remplis' 
            });
        }

        // Validation de l'email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Veuillez fournir une adresse email valide' 
            });
        }

        console.log('✅ Validation réussie, insertion en base...');

        // Insérer le témoignage en base de données
        const result = await dbRun(`
            INSERT INTO baume_temoignages (author_name, author_email, ville, content, status, is_approved)
            VALUES (?, ?, ?, ?, 'pending', 0)
        `, [nom.trim(), email.trim(), ville ? ville.trim() : null, temoignage.trim()]);

        console.log('✅ Témoignage soumis avec succès:', result.id);

        // Retourner une réponse JSON au lieu de rediriger
        res.json({ 
            success: true, 
            message: 'Témoignage soumis avec succès ! Il sera visible après validation.',
            data: {
                id: result.id,
                author_name: nom.trim(),
                content: temoignage.trim()
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur soumission témoignage:', error);
        console.error('❌ Stack trace:', error.stack);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de la soumission du témoignage: ' + error.message 
        });
    }
});

// Route de redirection pour compatibilité
router.get('/baume/temoignages', (req, res, next) => {
    console.log('🔍 Redirection /baume/temoignages vers /api/baume/temoignages');
    req.url = req.url.replace('/baume/temoignages', '/api/baume/temoignages');
    next();
});

// API pour récupérer les témoignages
router.get('/api/baume/temoignages', async (req, res) => {
    console.log('🔍 ROUTE API: /api/baume/temoignages appelée !');
    console.log('🔍 req.query complet:', JSON.stringify(req.query, null, 2));
    try {
        const { page = 1, limit = 6, admin } = req.query;
        
        console.log('🔍 DEBUG: Query params - page:', page, 'limit:', limit, 'admin:', admin);
        console.log('🔍 DEBUG: Type de admin:', typeof admin);
        console.log('🔍 DEBUG: admin === "true":', admin === 'true');
        
        // Si admin=true, inclure tous les témoignages (approuvés et en attente) SANS LIMITATION
        // Sinon, n'inclure que les témoignages approuvés avec limitation
        const whereClause = admin === 'true' ? '1=1' : 'is_approved = 1';
        
        console.log('🔍 DEBUG: Where clause:', whereClause);
        console.log('🔍 DEBUG: SQL avant exécution');
        
        let temoignages;
        
        if (admin === 'true') {
            // Mode admin : TOUS les témoignages sans limitation
            temoignages = await dbAll(`
                SELECT id, author_name, content, created_at, is_approved, status
                FROM baume_temoignages 
                WHERE ${whereClause}
                ORDER BY created_at DESC
            `);
        } else {
            // Mode public : limitation pour pagination
            const offset = (page - 1) * limit;
            temoignages = await dbAll(`
                SELECT id, author_name, content, created_at, is_approved, status
                FROM baume_temoignages 
                WHERE ${whereClause}
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `, [parseInt(limit), offset]);
        }
        
        console.log('🔍 DEBUG: Témoignages chargés depuis index:', temoignages.length);
        console.log('🔍 DEBUG: Admin mode:', admin === 'true');
        console.log('🔍 DEBUG: Where clause:', whereClause);
        
        if (admin === 'true') {
            console.log('🎉 TOUS LES TÉMOIGNAGES CHARGÉS (sans limitation):', temoignages.length);
        } else {
            console.log('📄 Témoignages publics (limité à', limit, '):', temoignages.length);
        }
        
        if (temoignages.length > 0) {
            console.log('🔍 DEBUG: Premier témoignage:', temoignages[0]);
        }
        
        const response = { success: true, data: temoignages };
        console.log('🔍 DEBUG: Response JSON:', JSON.stringify(response, null, 2));
        
        res.json(response);
    } catch (error) {
        console.error('❌ Erreur API témoignages:', error);
        console.error('❌ Stack trace:', error.stack);
        res.status(500).json({ success: false, error: 'Erreur lors du chargement: ' + error.message });
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

// ========== À PROPOS ==========
router.get('/about', async (req, res) => {
    try {
        // Récupérer les données de la page about depuis la base de données
        const aboutData = await dbGet('SELECT * FROM about ORDER BY id DESC LIMIT 1');
        
        // Données par défaut si aucune donnée dans la base
        const defaultAboutData = {
            hero_title: 'À propos de Telex',
            hero_subtitle: 'Découvrez notre histoire, notre équipe et notre vision',
            hero_intro: 'Fondée par des étudiants passionnés, Telex est bien plus qu\'une télévision étudiante. C\'est un laboratoire d\'innovation, une école de talents et un média numérique pour la jeunesse engagée.',
            hero_image: '/images/camera.png',
            history_title: 'Notre Histoire',
            history_paragraph1: 'Telex est né en 2024 de la passion commune d\'un groupe d\'étudiants déterminés à créer une télévision étudiante et un média numérique à leur image : innovants, indépendants et engagés. En partant d\'un simple projet d\'association, nous avons construit pas à pas une véritable chaîne de télévision étudiante reconnue aujourd\'hui comme la référence en matière d\'audiovisuel étudiant.',
            history_paragraph2: 'Notre aventure a commencé avec une petite équipe de 10 passionnés et un studio improvisé. Aujourd\'hui, nous comptons plus de 50 membres actifs, un studio professionnel et une audience grandissante. Chaque jour, nous repoussons les limites de la créativité étudiante pour offrir des contenus de qualité.',
            team_title: 'Notre Équipe',
            team_intro: 'Notre force réside dans la diversité de nos profils. Journalistes, techniciens, monteurs, graphistes, communicants - tous étudiants et tous animés par la même passion pour l\'audiovisuel. Chaque membre contribue avec ses compétences uniques pour créer des contenus exceptionnels.',
            team_redaction_title: 'Rédaction',
            team_redaction_count: '2 journalistes et reporters',
            team_redaction_image: '/images/TELEX INTEGRATION.png',
            team_redaction_description: 'Notre équipe éditoriale travaille sur l\'écriture, les reportages et la vérification des informations.',
            team_redaction_skills: 'Journalisme, Reportage, Édition',
            team_technique_title: 'Technique',
            team_technique_count: '2 techniciens audiovisuels',
            team_technique_image: '/images/femme telex.png',
            team_technique_description: 'Spécialistes de la prise de vue, du son et de l\'éclairage pour une production de qualité professionnelle.',
            team_technique_skills: 'Caméra, Son, Éclairage',
            team_postproduction_title: 'Post-production',
            team_postproduction_count: '3 monteurs vidéo',
            team_postproduction_image: '/images/ordi_telex.png',
            team_postproduction_description: 'Experts en montage, étalonnage et effets spéciaux pour donner vie à nos contenus audiovisuels.',
            team_postproduction_skills: 'Montage, Étalonnage, Motion Design',
            team_communication_title: 'Communication',
            team_communication_count: '1 chargés de communication',
            team_communication_image: '/images/Présentation du Telex.png',
            team_communication_description: 'Gestion des réseaux sociaux, relations presse et stratégie de diffusion pour maximiser notre audience.',
            team_communication_skills: 'Réseaux sociaux, Stratégie, Community',
            stats_title: 'Nos Chiffres',
            stats_members_count: '50+',
            stats_hours_count: '200+',
            stats_views_count: '15K+',
            stats_programs_count: '4'
        };
        
        // Utiliser les données de la base ou les valeurs par défaut
        const about = aboutData || defaultAboutData;
        
        const stats = {
            totalNews: (await dbGet('SELECT COUNT(*) as count FROM news WHERE is_published = 1')).count || 0,
            totalPrograms: (await dbGet('SELECT COUNT(*) as count FROM programs WHERE is_active = 1')).count || 0
        };
        
        res.render('pages/about', {
            title: 'À propos - TELEX',
            page: 'about',
            about,
            stats
        });
    } catch (error) {
        console.error('❌ Erreur route /about:', error);
        res.render('pages/about', {
            title: 'À propos - TELEX',
            page: 'about',
            about: {},
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
        // 1. Récupérer les programmes détaillés pour les cartes de publication (articles)
        // Inclure tous les programmes actifs, surtout ceux avec des vidéos
        const detailedPrograms = await dbAll(`
            SELECT id, title, description, presenter, program_type, schedule_time, program_date, 
                   broadcast_type, is_active, image_url, video_url, created_at
            FROM programs 
            WHERE is_active = 1 
            ORDER BY created_at DESC
        `);
        
        // 2. Récupérer les programmes planifiés pour la grille uniquement
        const schedulePrograms = await dbAll(`
            SELECT id, title, program_type, schedule_time, program_date, broadcast_type, 
                   presenter, is_active, created_at
            FROM programs 
            WHERE broadcast_type = 'scheduled' AND is_active = 1
            ORDER BY program_date, schedule_time
        `);
        
        console.log('🔍 DEBUG Articles de programme:', detailedPrograms.length);
        console.log('🔍 DEBUG Programmes grille:', schedulePrograms.length);
        
        res.render('pages/programs', {
            title: 'Nos Programmes - TELEX',
            page: 'programs',
            programs: detailedPrograms || [], // Pour les cartes de publication (articles)
            schedulePrograms: schedulePrograms || [] // Pour la grille
        });
    } catch (error) {
        console.error('❌ Erreur route /programs:', error);
        res.render('pages/programs', {
            title: 'Nos Programmes - TELEX',
            page: 'programs',
            programs: [],
            schedulePrograms: []
        });
    }
});

// ========== GALERIE ==========
router.get('/gallery', async (req, res) => {
    try {
        const gallery = await dbAll(
            'SELECT * FROM gallery ORDER BY created_at DESC'
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

// ========== ALBUM ==========
router.get('/album', async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        // Chemin vers le dossier d'album
        const albumPath = path.join(__dirname, '../public/images/album');
        
        // Créer le dossier s'il n'existe pas
        await fs.mkdir(albumPath, { recursive: true });
        
        // Lire tous les dossiers de catégories
        const categories = await fs.readdir(albumPath);
        
        const categoriesData = [];
        
        for (const category of categories) {
            const categoryPath = path.join(albumPath, category);
            const stats = await fs.stat(categoryPath);
            
            if (stats.isDirectory()) {
                // Lire les images dans le dossier
                const files = await fs.readdir(categoryPath);
                const images = files
                    .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                    .map((file, index) => ({
                        id: index + 1,
                        src: `/images/album/${category}/${file}`,
                        title: file.replace(/\.[^/.]+$/, '').replace(/-/g, ' '),
                        filename: file
                    }));
                
                // Obtenir le nom et la description de la catégorie
                const categoryInfo = getCategoryInfo(category);
                
                categoriesData.push({
                    id: category,
                    name: categoryInfo.name,
                    description: categoryInfo.description,
                    images: images,
                    count: images.length,
                    icon: categoryInfo.icon,
                    color: categoryInfo.color
                });
            }
        }
        
        res.render('pages/album', {
            title: 'Album Photo - TELEX',
            page: 'album',
            categories: categoriesData
        });
    } catch (error) {
        console.error('❌ Erreur route /album:', error);
        res.render('pages/album', {
            title: 'Album Photo - TELEX',
            page: 'album',
            categories: []
        });
    }
});

// Helper function pour obtenir les informations de catégorie
function getCategoryInfo(categoryId) {
    const categories = {
        'culture': {
            name: 'Événements Culturels',
            description: 'Découvrez nos festivals, spectacles et célébrations culturelles qui mettent en valeur le patrimoine malgache.',
            icon: 'fas fa-theater-masks',
            color: 'category-culture'
        },
        'sport': {
            name: 'Événements Sportifs',
            description: 'Revivez l\'intensité de nos compétitions sportives et l\'esprit d\'équipe qui nous anime.',
            icon: 'fas fa-futbol',
            color: 'category-sport'
        },
        'coutume': {
            name: 'Événements Coutumes',
            description: 'Explorez nos traditions et coutumes qui font la richesse de notre culture malgache.',
            icon: 'fas fa-users',
            color: 'category-coutume'
        },
        'exceptionnel': {
            name: 'Événements Exceptionnels',
            description: 'Découvrez nos moments exceptionnels et événements spéciaux qui marquent notre histoire.',
            icon: 'fas fa-star',
            color: 'category-exceptionnel'
        },
        'autres': {
            name: 'Autres Activités',
            description: 'Découvrez nos autres activités et moments divers de la vie TELEX.',
            icon: 'fas fa-images',
            color: 'category-autres'
        }
    };
    
    return categories[categoryId] || {
        name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
        description: 'Découvrez nos photos dans cette catégorie.',
        icon: 'fas fa-images',
        color: 'category-default'
    };
}

// ========== ACTUALITÉS (liste) ==========
router.get('/news', async (req, res) => {
    try {
        // Utiliser dbAll au lieu de db.query
        const news = await dbAll(`
            SELECT * FROM news 
            WHERE is_published = 1 
            ORDER BY created_at DESC
        `);
        
        console.log('🔍 DEBUG News récupérées:', news.length, 'articles');
        
        // Debug détaillé pour chaque article
        news.forEach((article, index) => {
            console.log(`📰 Article ${index + 1}:`, {
                id: article.id,
                title: article.title,
                slug: article.slug,
                category: article.category,
                category_lower: article.category?.toLowerCase(),
                has_image: !!article.image_url,
                has_video: !!article.video_url
            });
        });
        
        console.log('🔍 DEBUG Catégories trouvées:', [...new Set(news.map(n => n.category))]);
        
        // Debug pour voir les correspondances exactes
        const targetCategories = ['politique', 'economie', 'social', 'sport', 'culturel', 'annonce', 'autre'];
        console.log('🎯 Catégories cibles:', targetCategories);
        
        targetCategories.forEach(targetCat => {
            const matchingArticles = news.filter(article => article.category?.toLowerCase() === targetCat);
            console.log(`🔍 Articles pour catégorie "${targetCat}":`, matchingArticles.length, matchingArticles.map(a => a.title));
        });
        
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
            page: 'news', 
            recommendedNews: recommendedNews || [] 
        });
    } catch (error) {
        console.error('Erreur /news:', error);
        res.render('pages/news', {
            title: 'Actualités TELEX',
            news: [],
            page: 'news',
            recommendedNews: [] 
        });
    }
});

// ========== GÉNÉRATION DES SLUGS MANQUANTS ==========
router.get('/admin/generate-news-slugs', async (req, res) => {
    try {
        console.log('🔄 Génération des slugs manquants...');
        
        // Récupérer tous les articles sans slug
        const newsWithoutSlug = await dbAll(`
            SELECT id, title, slug FROM news 
            WHERE (slug IS NULL OR slug = '' OR slug = 'null') 
            AND is_published = 1
        `);
        
        console.log('🔍 Articles sans slug:', newsWithoutSlug.length);
        
        // Fonction pour créer un slug
        function createSlug(title) {
            return title
                .toLowerCase()
                .trim()
                .replace(/[àáâãäå]/g, 'a')
                .replace(/[èéêë]/g, 'e')
                .replace(/[ìíîï]/g, 'i')
                .replace(/[òóôõö]/g, 'o')
                .replace(/[ùúûü]/g, 'u')
                .replace(/[ýÿ]/g, 'y')
                .replace(/[ñ]/g, 'n')
                .replace(/[ç]/g, 'c')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/[\s-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }
        
        // Générer les slugs
        for (const article of newsWithoutSlug) {
            const slug = createSlug(article.title);
            const uniqueSlug = `${slug}-${article.id}`;
            
            await dbRun(
                'UPDATE news SET slug = ? WHERE id = ?',
                [uniqueSlug, article.id]
            );
            
            console.log(`✅ Slug généré pour l'article ${article.id}: ${uniqueSlug}`);
        }
        
        res.json({
            success: true,
            message: `${newsWithoutSlug.length} slugs générés avec succès`,
            count: newsWithoutSlug.length
        });
        
    } catch (error) {
        console.error('Erreur génération slugs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== PAGE D'UNE ACTUALITÉ ==========
router.get('/news/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        
        console.log('🔍 DEBUG: Route /news/:identifier appelée');
        console.log('🔍 DEBUG: Identifiant reçu:', identifier);
        console.log('🔍 DEBUG: Type:', typeof identifier);
        console.log('🔍 DEBUG: Est numérique:', !isNaN(identifier));
        
        let news = null;
        
        // Essayer d'abord par slug (priorité)
        console.log('🔍 DEBUG: Recherche du slug:', identifier);
        news = await dbGet(
            'SELECT * FROM news WHERE slug = ? AND is_published = 1 LIMIT 1',
            [identifier]
        );
        
        console.log('🔍 DEBUG: Recherche par slug:', news ? 'Trouvé' : 'Non trouvé');
        if (news) {
            console.log('🔍 DEBUG: Article trouvé par slug:', { id: news.id, title: news.title, slug: news.slug });
        }
        
        // Si non trouvé et que c'est un nombre, essayer par ID
        if (!news && !isNaN(identifier)) {
            news = await dbGet(
                'SELECT * FROM news WHERE id = ? AND is_published = 1 LIMIT 1',
                [parseInt(identifier)]
            );
            
            console.log('🔍 DEBUG: Recherche par ID:', news ? 'Trouvé' : 'Non trouvé');
            
            // Si trouvé par ID, rediriger vers l'URL avec slug
            if (news && news.slug) {
                console.log('🔍 DEBUG: Redirection vers slug:', news.slug);
                return res.redirect(301, `/news/${news.slug}`);
            }
        }
        
        // Si toujours pas trouvé, erreur 404
        if (!news) {
            return res.status(404).render('pages/error', {
                code: 404,
                title: 'Actualité introuvable',
                message: 'Cette actualité n\'existe pas ou a été supprimée.',
                error: null
            });
        }
        
        // Incrémenter le compteur de vues
        await dbAll(
            'UPDATE news SET views = COALESCE(views, 0) + 1 WHERE id = ?',
            [news.id]
        );
        
        // Récupérer les articles connexes (même catégorie, sauf l'article actuel)
        const relatedNews = await dbAll(`
            SELECT id, title, slug, category, image_url, created_at 
            FROM news 
            WHERE is_published = 1 
            AND category = ? 
            AND id != ?
            ORDER BY created_at DESC 
            LIMIT 3
        `, [news.category, news.id]);

        const allVideos = await dbAll(`
            SELECT id, title, slug, video_url, image_url, created_at, category
            FROM news
            WHERE is_published = 1
              AND video_url IS NOT NULL
              AND TRIM(video_url) != ''
            ORDER BY created_at DESC
        `);

        const allMedia = await dbAll(`
            SELECT id, title, slug, video_url, image_url, created_at, category
            FROM news
            WHERE is_published = 1
              AND id != ?
              AND (
                    (video_url IS NOT NULL AND TRIM(video_url) != '')
                 OR (image_url IS NOT NULL AND TRIM(image_url) != '')
              )
            ORDER BY created_at DESC
        `, [news.id]);
        
        res.render('pages/news-single', {
            title: news.title,
            page: 'news',
            news: news,
            relatedNews: relatedNews || [], // Toujours un tableau
            allVideos: allVideos || [],
            allMedia: allMedia || []
        });
    } catch (error) {
        console.error('Erreur /news/:slug:', error);
        res.status(500).render('pages/error', {
            code: 500,
            title: 'Erreur serveur',
            message: 'Une erreur est survenue'
        });
    }
});


// ========== CONTACT ==========
router.get('/contact', async (req, res) => {
    try {
        res.render('pages/contact', {
            title: 'Contact - TELEX',
            page: 'contact'
        });
    } catch (error) {
        console.error('❌ Erreur route contact:', error);
        res.render('pages/contact', {
            title: 'Contact - TELEX',
            page: 'contact'
        });
    }
});

// ========== POST CONTACT (API) ==========
router.post('/contact', async (req, res) => {
    try {
        const { name, email, subject, message, newsletter } = req.body;
        
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
        
        // Vérifier les doublons récents (même email, même sujet, moins de 24h)
        const duplicateCheck = await dbGet(`
            SELECT id, created_at 
            FROM contacts 
            WHERE email = ? AND subject = ? AND created_at > datetime('now', '-1 day')
        `, [email.trim().toLowerCase(), subject.trim()]);
        
        if (duplicateCheck) {
            const hoursAgo = Math.floor((Date.now() - new Date(duplicateCheck.created_at).getTime()) / (1000 * 60 * 60));
            
            if (hoursAgo < 1) {
                return res.status(429).json({ 
                    success: false, 
                    message: 'Vous avez déjà envoyé un message avec le même sujet il y a moins d\'une heure. Veuillez patienter avant de renvoyer.' 
                });
            } else if (hoursAgo < 24) {
                return res.status(429).json({ 
                    success: false, 
                    message: `Vous avez déjà envoyé un message similaire il y a ${hoursAgo} heure${hoursAgo > 1 ? 's' : ''}. Pour éviter les doublons, veuillez attendre 24h ou modifier votre sujet.` 
                });
            }
        }
        
        // Récupérer l'IP et le user agent pour le suivi
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const userAgent = req.headers['user-agent'];
        
        // Insérer dans la base avec les informations supplémentaires
        await dbAll(`
            INSERT INTO contacts (name, email, subject, message, newsletter, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            name.trim(), 
            email.trim().toLowerCase(), 
            subject.trim(), 
            message.trim(),
            newsletter ? 1 : 0,
            ipAddress,
            userAgent
        ]);
        
        console.log('📧 Message reçu de:', name, email);
        
        res.json({ 
            success: true, 
            message: 'Message envoyé avec succès! Nous vous répondrons dans les plus brefs délais.' 
        });
        
    } catch (error) {
        console.error('❌ Erreur POST /contact:', error);
        
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(429).json({ 
                success: false, 
                message: 'Vous avez déjà envoyé un message identique récemment. Pour éviter les doublons, veuillez modifier votre sujet ou attendre 24h.' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Erreur technique. Veuillez réessayer plus tard.' 
        });
    }
});
router.get('/social', (req, res) => {
    res.render('pages/social', {
        title: 'Réseaux sociaux - TELEX',
        page: 'social'
    });
});

// ========== API POUR VIDÉOS ==========
router.get('/api/videos', async (req, res) => {
    try {
        const videos = await dbAll(`
            SELECT id, title, video_url, image_url, created_at, category 
            FROM news 
            WHERE video_url IS NOT NULL AND video_url != '' 
            AND is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 20
        `);
        
        res.json(videos);
    } catch (error) {
        console.error('❌ Erreur API /api/videos:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des vidéos' });
    }
});

// ========== TEST VIDÉO ==========
router.get('/video-test', (req, res) => {
    res.render('pages/video-test', {
        title: 'Test Lecteur Vidéo - TELEX',
        page: 'video-test'
    });
});

// ========== ADMIN ==========
router.get('/admin', requireAuth, async (req, res) => {
    try {
        // Récupérer les statistiques pour le dashboard
        const stats = {
            totalNews: (await dbGet('SELECT COUNT(*) as count FROM news WHERE is_published = 1')).count || 0,
            totalPrograms: (await dbGet('SELECT COUNT(*) as count FROM programs WHERE is_active = 1')).count || 0,
            totalContacts: (await dbGet('SELECT COUNT(*) as count FROM contacts')).count || 0,
            totalGallery: (await dbGet('SELECT COUNT(*) as count FROM gallery')).count || 0,
            cookieConsents: (await dbGet('SELECT COUNT(DISTINCT ip_address) as count FROM cookie_consents WHERE consent_given = 1')).count || 0,
            totalNewsViews: (await dbGet('SELECT SUM(views) as total FROM news')).total || 0,
            totalProgramsViews: (await dbGet('SELECT SUM(views) as total FROM programs')).total || 0,
            baumeTotalCount: (await dbGet('SELECT COUNT(*) as count FROM baume_prieres')).count || 0,
            baumePrieres: (await dbGet('SELECT COUNT(*) as count FROM baume_prieres')).count || 0,
            baumeReflexions: (await dbGet('SELECT COUNT(*) as count FROM baume_reflexions')).count || 0,
            baumeTemoignages: (await dbGet('SELECT COUNT(*) as count FROM baume_temoignages')).count || 0,
            baumeTotalViews: (await dbGet('SELECT SUM(views) as total FROM baume_prieres')).total || 0
        };
        
        res.render('admin/dashboard', {
            title: 'Admin Dashboard | TELEX',
            page: 'admin-dashboard',
            stats,
            user: req.session.user
        });
    } catch (error) {
        console.error('❌ Erreur dashboard:', error);
        res.status(500).render('admin/error', {
            title: 'Erreur | TELEX',
            code: '500',
            message: 'Erreur lors du chargement du dashboard'
        });
    }
});

// ========== API SCHEDULE STATS ==========
router.get('/schedule/stats', async (req, res) => {
    try {
        const schedule = await dbAll(`
            SELECT * FROM programs 
            WHERE broadcast_type = 'scheduled' AND is_active = 1 
            ORDER BY program_date, schedule_time
        `);
        
        if (schedule && schedule.length > 0) {
            // Calculer les statistiques
            const totalPrograms = schedule.length;
            const uniqueTypes = [...new Set(schedule.map(p => p.program_type))].length;
            
            // Calculer les heures par semaine (chaque programme = 1 heure)
            const totalHours = totalPrograms;
            
            // Calculer la couverture (jours avec programmes / 7 jours)
            const uniqueDays = [...new Set(schedule.map(p => {
                const date = new Date(p.program_date);
                return date.toLocaleDateString('fr-FR', { weekday: 'long' });
            }))].length;
            const coverage = Math.round((uniqueDays / 7) * 100);
            
            res.json({
                totalPrograms,
                totalHours,
                uniqueTypes,
                coverage,
                lastUpdated: new Date().toISOString()
            });
        } else {
            res.json({
                totalPrograms: 0,
                totalHours: 0,
                uniqueTypes: 0,
                coverage: 0,
                lastUpdated: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Erreur API schedule stats:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;