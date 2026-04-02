const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../config/database');

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
            'SELECT id, title, description, presenter, program_type, video_url, image_url, is_active, created_at, updated_at, broadcast_type, program_date, schedule_time, views, total_views FROM programs WHERE is_active = 1 ORDER BY created_at DESC'
        );
        res.json(programs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

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
        
        res.json(videos); // ← C'est bon
    } catch (error) {
        console.error('❌ Erreur API /api/videos:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des vidéos' });
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

// API pour les consentements cookies
router.post('/cookie-consent', async (req, res) => {
    try {
        const { consentType, preferences } = req.body;
        
        if (!consentType || !preferences) {
            return res.status(400).json({ 
                success: false, 
                message: 'Données manquantes' 
            });
        }
        
        // Insérer le consentement en base de données
        const result = await dbAll(`
            INSERT INTO cookie_consents 
            (consent_type, preferences, user_agent, ip_address, timestamp) 
            VALUES (?, ?, ?, ?, ?)
        `, [
            consentType,
            JSON.stringify(preferences),
            req.get('User-Agent'),
            req.ip || req.connection.remoteAddress,
            new Date().toISOString()
        ]);
        
        console.log('🍪 Nouveau consentement enregistré:', {
            consentType,
            ip: req.ip || req.connection.remoteAddress
        });
        
        res.json({ 
            success: true, 
            message: 'Consentement enregistré',
            id: result.lastID
        });
        
    } catch (error) {
        console.error('❌ Erreur enregistrement consentement:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur' 
        });
    }
});

// API pour récupérer les statistiques des consentements
router.get('/cookie-consent-stats', async (req, res) => {
    try {
        // Statistiques globales
        const globalStats = await dbGet(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN consent_type = 'all' THEN 1 END) as acceptAll,
                COUNT(CASE WHEN consent_type = 'essential' THEN 1 END) as essential,
                COUNT(CASE WHEN consent_type = 'customize' THEN 1 END) as customize
            FROM cookie_consents
        `);
        
        // Statistiques du jour
        const todayStats = await dbGet(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN consent_type = 'all' THEN 1 END) as acceptAll,
                COUNT(CASE WHEN consent_type = 'essential' THEN 1 END) as essential,
                COUNT(CASE WHEN consent_type = 'customize' THEN 1 END) as customize
            FROM cookie_consents 
            WHERE DATE(timestamp) = DATE('now')
        `);
        
        // Derniers consentements
        const recentConsents = await dbAll(`
            SELECT consent_type, timestamp, user_agent
            FROM cookie_consents 
            ORDER BY timestamp DESC 
            LIMIT 5
        `);
        
        res.json({
            success: true,
            stats: {
                total: globalStats.total || 0,
                acceptAll: globalStats.acceptAll || 0,
                essential: globalStats.essential || 0,
                customize: globalStats.customize || 0,
                today: todayStats.total || 0
            },
            recentConsents: recentConsents
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération statistiques:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur' 
        });
    }
});

// API pour incrémenter les vues des programmes
router.post('/programs/:id/view', async (req, res) => {
    try {
        const programId = req.params.id;
        
        if (!programId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID de programme manquant' 
            });
        }
        
        // Vérifier si le programme existe
        const program = await dbGet('SELECT id, views, total_views FROM programs WHERE id = ?', [programId]);
        
        if (!program) {
            return res.status(404).json({ 
                success: false, 
                message: 'Programme non trouvé' 
            });
        }
        
        // Incrémenter les vues
        const currentViews = program.views || 0;
        const currentTotalViews = program.total_views || 0;
        
        await dbRun(
            'UPDATE programs SET views = ?, total_views = ? WHERE id = ?',
            [currentViews + 1, currentTotalViews + 1, programId]
        );
        
        // Récupérer le nombre de vues mis à jour
        const updatedProgram = await dbGet('SELECT views, total_views FROM programs WHERE id = ?', [programId]);
        
        res.json({ 
            success: true, 
            views: updatedProgram.views || 0,
            total_views: updatedProgram.total_views || 0,
            message: 'Vue incrémentée avec succès'
        });
        
    } catch (error) {
        console.error('❌ Erreur incrémentation vues programme:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur' 
        });
    }
});

module.exports = router;