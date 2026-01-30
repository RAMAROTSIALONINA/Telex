require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONFIGURATION ==========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// IMPORTANT: Middleware pour parser les données AVANT session
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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

// ========== MIDDLEWARE DE DÉBOGAGE (optionnel) ==========
app.use((req, res, next) => {
    // Log toutes les requêtes
    console.log('\n=== NOUVELLE REQUÊTE ===');
    console.log(`📨 ${req.method} ${req.url}`);
    console.log(`🔍 Session ID: ${req.sessionID}`);
    console.log(`👤 User: ${JSON.stringify(req.session.user)}`);
    console.log(`🍪 Cookies: ${req.headers.cookie}`);
    
    // S'assurer que req.session existe
    if (!req.session) {
        console.warn('⚠️  req.session est undefined!');
        // Créer une session si elle n'existe pas
        req.session = {};
    }
    
    next();
});

// ========== MIDDLEWARE POUR VARIABLES GLOBALES ==========
app.use((req, res, next) => {
    // Toujours vérifier si req.session existe
    if (!req.session) {
        console.error('❌ req.session est undefined dans middleware global!');
        req.session = {};
    }
    
    // Initialiser req.session.user s'il n'existe pas
    if (!req.session.user) {
        req.session.user = null;
    }
    
    // Variables globales pour les templates
    res.locals.currentPath = req.path;
    res.locals.currentYear = new Date().getFullYear();
    res.locals.siteName = 'TELEX';
    res.locals.user = req.session.user;
    res.locals.baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Flash messages
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.info_msg = req.flash('info');
    
    next();
});

// ========== IMPORT DES ROUTES ==========
console.log('📂 Chargement des routes...');

// Routes
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const userRoutes = require('./routes/users');

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

// Utilisation des routes
app.use('/', indexRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/users', userRoutes);
app.use('/api', apiRoutes);

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