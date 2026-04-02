const express = require('express');
const router = express.Router();
const { dbAll } = require('../config/database');

// Route de test pour vérifier les actualités
router.get('/test-news', async (req, res) => {
    try {
        console.log('🔍 Test route /test-news');
        
        // Vérifier si la table news existe et a des données
        const newsCount = await dbAll('SELECT COUNT(*) as count FROM news WHERE is_published = 1');
        console.log('📊 Nombre d\'actualités publiées:', newsCount[0].count);
        
        // Récupérer quelques actualités
        const news = await dbAll('SELECT id, title, created_at FROM news WHERE is_published = 1 LIMIT 3');
        console.log('📰 Actualités trouvées:', news);
        
        res.json({
            success: true,
            count: newsCount[0].count,
            news: news,
            message: 'Test réussi - les actualités sont accessibles'
        });
        
    } catch (error) {
        console.error('❌ Erreur test news:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Erreur lors du test des actualités'
        });
    }
});

// Route de test pour rendre une vue simple
router.get('/test-view', (req, res) => {
    console.log('🔍 Test route /test-view');
    res.render('pages/news', {
        title: 'Test Actualités',
        news: [],
        page: 'news',
        recommendedNews: []
    });
});

module.exports = router;
