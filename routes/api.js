const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../config/database');

// API publique pour récupérer des données
router.get('/news', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const news = await dbAll(
            'SELECT id, title, content, image_url, author, category, created_at, views FROM news WHERE is_published = 1 ORDER BY created_at DESC LIMIT ?',
            [limit]
        );
        res.json(news);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/programs', async (req, res) => {
    try {
        const programs = await dbAll(
            'SELECT * FROM programs WHERE is_active = 1 ORDER BY created_at DESC'
        );
        res.json(programs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/gallery', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const gallery = await dbAll(
            'SELECT * FROM gallery ORDER BY created_at DESC LIMIT ?',
            [limit]
        );
        res.json(gallery);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Statistiques publiques
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            totalNews: (await dbGet('SELECT COUNT(*) as count FROM news WHERE is_published = 1')).count,
            totalPrograms: (await dbGet('SELECT COUNT(*) as count FROM programs WHERE is_active = 1')).count,
            totalGallery: (await dbGet('SELECT COUNT(*) as count FROM gallery')).count
        };
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API pour les statistiques de la grille des programmes
router.get('/schedule/stats', async (req, res) => {
    try {
        const schedule = await dbAll(`
            SELECT * FROM program_schedule 
            WHERE is_active = 1 
            ORDER BY day, time
        `);
        
        if (schedule && schedule.length > 0) {
            // Calculer les statistiques
            const totalPrograms = schedule.length;
            const uniqueTypes = [...new Set(schedule.map(p => p.program_type))].length;
            
            // Calculer les heures par semaine (chaque programme = 1 heure)
            const totalHours = totalPrograms;
            
            // Calculer la couverture (jours avec programmes / 7 jours)
            const uniqueDays = [...new Set(schedule.map(p => p.day))].length;
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