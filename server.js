require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const fs = require('fs');
const simpleLanguage = require('./middleware/simple-language');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONFIGURATION ==========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// IMPORTANT: Middleware pour parser les données AVANT session
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(express.json({ limit: '500mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ========== SESSION CRITIQUE ==========
// Créer un store mémoire pour éviter les problèmes
const MemoryStore = session.MemoryStore;

app.use(session({
    secret: process.env.SESSION_SECRET || 'telex-super-secret-2024-change-in-production',
    store: new MemoryStore(),
    resave: false, // false pour MemoryStore
    saveUninitialized: true, // true pour créer la session même si vide
    cookie: {
        secure: false, // true en production avec HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24h
        sameSite: 'lax'
    },
    name: 'telex.sid'
}));

// ========== FLASH MESSAGES ==========
app.use(flash());

// ========== MIDDLEWARE DE LANGUE SIMPLE (index et about uniquement) ==========
app.use(simpleLanguage.middleware());

// ========== MIDDLEWARE DE DÉBOGAGE (désactivé pour éviter les boucles infinies) ==========
// app.use((req, res, next) => {
//     // Log toutes les requêtes
//     console.log('\n=== NOUVELLE REQUÊTE ===');
//     console.log(`📨 ${req.method} ${req.url}`);
//     console.log(`🔍 Session ID: ${req.sessionID}`);
//     console.log(`👤 User: ${JSON.stringify(req.session.user)}`);
//     console.log(`🍪 Cookies: ${req.headers.cookie}`);
//     
//     // S'assurer que req.session existe
//     if (!req.session) {
//         console.warn('⚠️  req.session est undefined!');
//         // Créer une session si elle n'existe pas
//         req.session = {};
//     }
//     
//     next();
// });

// ========== MIDDLEWARE POUR VARIABLES GLOBALES ==========
app.use(async (req, res, next) => {
    // Toujours vérifier si req.session existe
    if (!req.session) {
        console.error('❌ req.session est undefined dans middleware global!');
        req.session = {};
    }
    
    // Initialiser req.session.user s'il n'existe pas
    if (!req.session.user) {
        req.session.user = null;
    }
    
    // Charger les paramètres du footer pour toutes les pages
    try {
        const { dbAll } = require('./config/database');
        const footerSettings = await dbAll('SELECT setting_key, setting_value FROM footer_settings');
        const footerData = {};
        footerSettings.forEach(setting => {
            footerData[setting.setting_key] = setting.setting_value;
        });
        res.locals.footer = footerData;
    } catch (error) {
        console.error('❌ Erreur chargement footer global:', error);
        res.locals.footer = {};
    }
    
    // Variables globales pour les templates
    res.locals.currentPath = req.path;
    res.locals.currentYear = new Date().getFullYear();
    res.locals.siteName = 'TELEX';
    res.locals.user = req.session.user;
    req.user = req.session.user;  // 🔧 CRUCIAL: Ajout de req.user pour les routes
    res.locals.baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Flash messages
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.info_msg = req.flash('info');
    
    next();
});

// Middleware pour logger toutes les requêtes API
app.use('/api', (req, res, next) => {
    console.log('🔍 API Request:', req.method, req.url);
    console.log('🔍 API Headers:', req.headers);
    next();
});

// ========== IMPORT DES ROUTES ==========
console.log('📂 Chargement des routes...');

// Routes
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const baumeApiRoutes = require('./routes/baume-api');
const adminBaumeRoutes = require('./routes/admin-baume-fix');
const adminStatsRoutes = require('./routes/admin-stats-api');
const userRoutes = require('./routes/users');
const testRoutes = require('./routes/test');
const adminAlbumRoutes = require('./routes/admin-album');
const translationsApiRoutes = require('./routes/translations-api');

// ========== ROUTE DE TEST ==========
app.get('/debug-session', (req, res) => {
    console.log('🔍 Debug Session Route:');
    console.log('   req.session exists:', !!req.session);
    console.log('   req.sessionID:', req.sessionID);
    console.log('   req.session:', req.session);
    
    if (!req.session.views) {
        req.session.views = 1;
    } else {
        req.session.views++;
    }
    
    res.json({
        sessionExists: !!req.session,
        sessionID: req.sessionID,
        views: req.session.views,
        user: req.session.user,
        cookies: req.headers.cookie
    });
});

// Route de test pour les traductions
app.get('/test-translation', (req, res) => {
    res.render('pages/test-translation', {
        title: 'Test Traductions - TELEX'
    });
});

// Route de test simple pour les traductions
app.get('/test-simple', (req, res) => {
    res.render('pages/test-simple', {
        title: 'Test Simple - TELEX'
    });
});

// Utilisation des routes - Index en premier pour les routes publiques API
app.use('/', indexRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', adminBaumeRoutes);
app.use('/admin', adminStatsRoutes);
app.use('/admin', adminAlbumRoutes);
app.use('/admin/users', userRoutes);
app.use('/api', apiRoutes);
app.use('/api/baume', baumeApiRoutes);
app.use('/api/translations', translationsApiRoutes);
app.use('/test', testRoutes);

// ========== GESTION DES ERREURS ==========
// 404
app.use((req, res, next) => {
    res.status(404).render('pages/error', {
        title: 'Page non trouvée - TELEX',
        message: 'La page que vous recherchez n\'existe pas.',
        code: 404,
        showHomeLink: true
    });
});

// 500  
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err.message);
    console.error('Stack:', err.stack);
    
    res.status(500).render('pages/error', {
        title: 'Erreur serveur - TELEX',
        message: 'Une erreur technique est survenue.',
        code: 500,
        showHomeLink: true,
        errorDetails: process.env.NODE_ENV === 'development' ? err.message : null
    });
});

// ========== DÉMARRAGE ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ============================================
    🚀 SERVEUR TELEX DÉMARRÉ
    ============================================
    🔗 URL: http://localhost:${PORT}
    🔍 Debug: http://localhost:${PORT}/debug-session
    🔐 Login: http://localhost:${PORT}/admin/login
    
    📊 CONFIGURATION:
    • Port: ${PORT}
    • Environnement: ${process.env.NODE_ENV || 'development'}
    • Session Store: MemoryStore
    • Views: EJS
    
    ============================================
    `);
});