const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { dbAll, dbGet, dbRun } = require('../config/database');

// Configuration de Multer pour l'upload des fichiers baume
const baumeStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isImage = file.mimetype.startsWith('image/');
        const subfolder = isImage ? 'images' : 'videos';
        const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'baume', subfolder);
        
        // Créer le répertoire s'il n'existe pas
        const fs = require('fs');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const baumeUpload = multer({ 
    storage: baumeStorage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('video/');

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé. Images et vidéos uniquement.'));
        }
    }
});

// ===== PRIÈRES =====

// GET - Récupérer toutes les prières
router.get('/prieres', async (req, res) => {
    try {
        const { published, category } = req.query;
        let sql = 'SELECT * FROM baume_prieres WHERE 1=1';
        const params = [];

        if (published !== undefined) {
            sql += ' AND is_published = ?';
            params.push(published === 'true' ? 1 : 0);
        }

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        sql += ' ORDER BY created_at DESC';

        const prieres = await dbAll(sql, params);
        res.json({ success: true, data: prieres });
    } catch (error) {
        console.error('Erreur récupération prières:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Récupérer une prière par ID
router.get('/prieres/:id', async (req, res) => {
    try {
        const priere = await dbGet('SELECT * FROM baume_prieres WHERE id = ?', [req.params.id]);
        
        if (!priere) {
            return res.status(404).json({ success: false, error: 'Prière non trouvée' });
        }

        // Incrémenter le nombre de vues
        await dbRun('UPDATE baume_prieres SET views = views + 1 WHERE id = ?', [req.params.id]);

        res.json({ success: true, data: priere });
    } catch (error) {
        console.error('Erreur récupération prière:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Créer une nouvelle prière
router.post('/prieres', baumeUpload.single('media_file'), async (req, res) => {
    try {
        const { title, content, category, reference_biblique, author, is_published } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, error: 'Titre et contenu requis' });
        }

        let video_url = null;
        
        // Gérer l'upload du fichier média
        if (req.file) {
            const isImage = req.file.mimetype.startsWith('image/');
            const subfolder = isImage ? 'images' : 'videos';
            video_url = `/uploads/baume/${subfolder}/${req.file.filename}`;
        }

        const sql = `
            INSERT INTO baume_prieres (title, content, category, reference_biblique, author, is_published, video_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await dbRun(sql, [
            title,
            content,
            category || 'comfort',
            reference_biblique || null,
            author || 'Baume de la Foi',
            is_published !== undefined ? (is_published ? 1 : 0) : 1,
            video_url
        ]);

        res.status(201).json({ 
            success: true, 
            message: 'Prière créée avec succès',
            data: { id: result.lastID, ...req.body, video_url }
        });
    } catch (error) {
        console.error('Erreur création prière:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT - Mettre à jour une prière
router.put('/prieres/:id', baumeUpload.single('media_file'), async (req, res) => {
    try {
        console.log('🔍 DEBUG PUT prière - req.body:', req.body);
        console.log('🔍 DEBUG PUT prière - req.file:', req.file);
        
        const { 
            title, 
            content, 
            category, 
            reference_biblique, 
            author, 
            is_published,
            existing_video_url,
            remove_image,
            remove_video
        } = req.body;
        
        console.log('🔍 DEBUG prière - Champs extraits:', {
            existing_video_url,
            remove_image,
            remove_video
        });

        let video_url = existing_video_url || null;
        
        // Gérer l'upload du nouveau fichier média
        if (req.file) {
            const isImage = req.file.mimetype.startsWith('image/');
            const subfolder = isImage ? 'images' : 'videos';
            video_url = `/uploads/baume/${subfolder}/${req.file.filename}`;
        }

        // Gérer la suppression manuelle des médias
        if (remove_image === '1') {
            video_url = null;
        }
        
        if (remove_video === '1') {
            video_url = null;
        }

        console.log('🔍 DEBUG prière - URL finale:', { video_url });

        const sql = `
            UPDATE baume_prieres 
            SET title = ?, content = ?, category = ?, reference_biblique = ?, 
                author = ?, is_published = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        const result = await dbRun(sql, [
            title,
            content,
            category,
            reference_biblique,
            author,
            is_published !== undefined ? (is_published ? 1 : 0) : 1,
            video_url,
            req.params.id
        ]);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Prière non trouvée' });
        }

        res.json({ 
            success: true, 
            message: 'Prière mise à jour avec succès',
            data: { id: req.params.id, ...req.body, video_url }
        });
    } catch (error) {
        console.error('Erreur mise à jour prière:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE - Supprimer une prière
router.delete('/prieres/:id', async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM baume_prieres WHERE id = ?', [req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Prière non trouvée' });
        }

        res.json({ success: true, message: 'Prière supprimée avec succès' });
    } catch (error) {
        console.error('Erreur suppression prière:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== TÉMOIGNAGES =====


// POST - Créer un nouveau témoignage
router.post('/temoignages', async (req, res) => {
    try {
        const { author_name, author_email, content } = req.body;

        if (!author_name || !content) {
            return res.status(400).json({ success: false, error: 'Nom et contenu requis' });
        }

        const sql = `
            INSERT INTO baume_temoignages (author_name, author_email, content, status)
            VALUES (?, ?, ?, 'pending')
        `;

        const result = await dbRun(sql, [author_name, author_email, content]);
        res.status(201).json({ success: true, data: { id: result.id, ...req.body } });
    } catch (error) {
        console.error('Erreur création témoignage:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Récupérer tous les témoignages
router.get('/temoignages', async (req, res) => {
    try {
        const { admin, status } = req.query;
        console.log('🔍 GET témoignages - Query params:', { admin, status });
        
        let sql = 'SELECT * FROM baume_temoignages';
        const params = [];
        
        // Filtrer par statut si spécifié
        if (status && status !== 'all') {
            sql += ' WHERE status = ?';
            params.push(status);
        }
        
        // Pour l'admin, inclure tous les témoignages avec tri par date
        if (admin === 'true') {
            if (status && status !== 'all') {
                sql += ' ORDER BY created_at DESC';
            } else {
                sql += ' ORDER BY created_at DESC';
            }
        } else {
            // Pour le public, seulement les témoignages approuvés
            if (status && status !== 'all') {
                sql += ' AND is_approved = 1';
            } else {
                sql += ' WHERE is_approved = 1';
            }
            sql += ' ORDER BY created_at DESC';
        }
        
        console.log('🔍 GET témoignages - SQL:', sql);
        console.log('🔍 GET témoignages - Params:', params);
        
        const temoignages = await dbAll(sql, params);
        console.log('🔍 GET témoignages - Résultat:', temoignages.length, 'témoignages trouvés');
        
        res.json({ success: true, data: temoignages });
    } catch (error) {
        console.error('Erreur récupération témoignages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Récupérer un témoignage spécifique
router.get('/temoignages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const temoignage = await dbGet('SELECT * FROM baume_temoignages WHERE id = ?', [id]);

        if (!temoignage) {
            return res.status(404).json({ success: false, error: 'Témoignage non trouvé' });
        }

        res.json({ success: true, data: temoignage });
    } catch (error) {
        console.error('Erreur récupération témoignage:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT - Approuver/rejeter un témoignage
router.put('/temoignages/:id/approve', async (req, res) => {
    try {
        const { approved } = req.body;
        const status = approved ? 'approved' : 'rejected';

        const sql = `
            UPDATE baume_temoignages 
            SET is_approved = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        const result = await dbRun(sql, [approved ? 1 : 0, status, req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Témoignage non trouvé' });
        }

        res.json({ success: true, message: `Témoignage ${approved ? 'approuvé' : 'rejeté'}` });
    } catch (error) {
        console.error('Erreur approbation témoignage:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE - Supprimer un témoignage
router.delete('/temoignages/:id', async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM baume_temoignages WHERE id = ?', [req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Témoignage non trouvé' });
        }

        res.json({ success: true, message: 'Témoignage supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression témoignage:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== RÉFLEXIONS =====

// GET - Récupérer toutes les réflexions
router.get('/reflexions', async (req, res) => {
    try {
        const { published, theme } = req.query;
        let sql = 'SELECT * FROM baume_reflexions WHERE 1=1';
        const params = [];

        if (published !== undefined) {
            sql += ' AND is_published = ?';
            params.push(published === 'true' ? 1 : 0);
        }

        if (theme) {
            sql += ' AND theme = ?';
            params.push(theme);
        }

        sql += ' ORDER BY publication_date DESC, created_at DESC';

        const reflexions = await dbAll(sql, params);
        res.json({ success: true, data: reflexions });
    } catch (error) {
        console.error('Erreur récupération réflexions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Récupérer une réflexion par ID
router.get('/reflexions/:id', async (req, res) => {
    try {
        const reflexion = await dbGet('SELECT * FROM baume_reflexions WHERE id = ?', [req.params.id]);
        
        if (!reflexion) {
            return res.status(404).json({ success: false, error: 'Réflexion non trouvée' });
        }

        // Incrémenter le nombre de vues
        await dbRun('UPDATE baume_reflexions SET views = views + 1 WHERE id = ?', [req.params.id]);

        res.json({ success: true, data: reflexion });
    } catch (error) {
        console.error('Erreur récupération réflexion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Créer une nouvelle réflexion
router.post('/reflexions', baumeUpload.single('media_file'), async (req, res) => {
    try {
        const { title, content, theme, author, publication_date, is_published } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, error: 'Titre et contenu requis' });
        }

        let image_url = null;
        let video_url = null;
        
        // Gérer l'upload du fichier média
        if (req.file) {
            const isImage = req.file.mimetype.startsWith('image/');
            const subfolder = isImage ? 'images' : 'videos';
            const mediaUrl = `/uploads/baume/${subfolder}/${req.file.filename}`;
            
            if (isImage) {
                image_url = mediaUrl;
            } else {
                video_url = mediaUrl;
            }
        }

        const sql = `
            INSERT INTO baume_reflexions (title, content, theme, image_url, video_url, author, publication_date, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await dbRun(sql, [
            title,
            content,
            theme || 'faith',
            image_url,
            video_url,
            author || 'Baume de la Foi',
            publication_date || new Date().toISOString().split('T')[0],
            is_published !== undefined ? (is_published ? 1 : 0) : 1
        ]);

        res.status(201).json({ 
            success: true, 
            message: 'Réflexion créée avec succès',
            data: { id: result.lastID, ...req.body, image_url, video_url }
        });
    } catch (error) {
        console.error('Erreur création réflexion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT - Mettre à jour une réflexion
router.put('/reflexions/:id', baumeUpload.single('media_file'), async (req, res) => {
    try {
        console.log('🔍 DEBUG PUT réflexion - req.body:', req.body);
        console.log('🔍 DEBUG PUT réflexion - req.file:', req.file);
        
        const { 
            title, 
            content, 
            theme, 
            author, 
            publication_date, 
            is_published,
            existing_image_url,
            existing_video_url,
            remove_image,
            remove_video
        } = req.body;
        
        console.log('🔍 DEBUG réflexion - Champs extraits:', {
            existing_image_url,
            existing_video_url,
            remove_image,
            remove_video
        });

        let image_url = existing_image_url || null;
        let video_url = existing_video_url || null;
        
        // Gérer l'upload du nouveau fichier média
        if (req.file) {
            const isImage = req.file.mimetype.startsWith('image/');
            const subfolder = isImage ? 'images' : 'videos';
            const mediaUrl = `/uploads/baume/${subfolder}/${req.file.filename}`;
            
            if (isImage) {
                image_url = mediaUrl;
            } else {
                video_url = mediaUrl;
            }
        }

        // Gérer la suppression manuelle des médias
        if (remove_image === '1') {
            image_url = null;
        }
        
        if (remove_video === '1') {
            video_url = null;
        }

        console.log('🔍 DEBUG réflexion - URLs finales:', { image_url, video_url });

        const sql = `
            UPDATE baume_reflexions 
            SET title = ?, content = ?, theme = ?, image_url = ?, video_url = ?, author = ?, 
                publication_date = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        const result = await dbRun(sql, [
            title,
            content,
            theme,
            image_url,
            video_url,
            author,
            publication_date,
            is_published !== undefined ? (is_published ? 1 : 0) : 1,
            req.params.id
        ]);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Réflexion non trouvée' });
        }

        res.json({ 
            success: true, 
            message: 'Réflexion mise à jour avec succès',
            data: { id: req.params.id, ...req.body, image_url, video_url }
        });
    } catch (error) {
        console.error('Erreur mise à jour réflexion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE - Supprimer une réflexion
router.delete('/reflexions/:id', async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM baume_reflexions WHERE id = ?', [req.params.id]);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Réflexion non trouvée' });
        }

        res.json({ success: true, message: 'Réflexion supprimée avec succès' });
    } catch (error) {
        console.error('Erreur suppression réflexion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== STATISTIQUES =====

// GET - Statistiques du dashboard
router.get('/stats', async (req, res) => {
    try {
        const stats = {};

        // Statistiques prières
        const prieresCount = await dbGet('SELECT COUNT(*) as count FROM baume_prieres WHERE is_published = 1');
        stats.prieres = prieresCount.count;

        // Statistiques témoignages
        const temoignagesCount = await dbGet('SELECT COUNT(*) as count FROM baume_temoignages WHERE is_approved = 1');
        const temoignagesPending = await dbGet('SELECT COUNT(*) as count FROM baume_temoignages WHERE status = "pending"');
        stats.temoignages_approuves = temoignagesCount.count;
        stats.temoignages_en_attente = temoignagesPending.count;

        // Statistiques réflexions
        const reflexionsCount = await dbGet('SELECT COUNT(*) as count FROM baume_reflexions WHERE is_published = 1');
        stats.reflexions = reflexionsCount.count;

        // Total vues
        const totalViews = await dbGet(`
            SELECT SUM(views) as total FROM (
                SELECT SUM(views) as views FROM baume_prieres
                UNION ALL
                SELECT SUM(views) as views FROM baume_reflexions
            )
        `);
        stats.total_views = totalViews.total || 0;

        // Activité récente
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

        stats.recent_activity = recentActivity;

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Erreur récupération statistiques:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API pour incrémenter les vues des réflexions
router.post('/reflexions/:id/view', async (req, res) => {
    try {
        const reflexionId = req.params.id;
        
        if (!reflexionId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID de réflexion manquant' 
            });
        }
        
        // Vérifier si la réflexion existe
        const reflexion = await dbGet('SELECT id, views FROM baume_reflexions WHERE id = ?', [reflexionId]);
        
        if (!reflexion) {
            return res.status(404).json({ 
                success: false, 
                message: 'Réflexion non trouvée' 
            });
        }
        
        // Incrémenter les vues
        const currentViews = reflexion.views || 0;
        await dbRun(
            'UPDATE baume_reflexions SET views = ? WHERE id = ?',
            [currentViews + 1, reflexionId]
        );
        
        // Récupérer le nombre de vues mis à jour
        const updatedReflexion = await dbGet('SELECT views FROM baume_reflexions WHERE id = ?', [reflexionId]);
        
        res.json({ 
            success: true, 
            views: updatedReflexion.views || 0,
            message: 'Vue incrémentée avec succès'
        });
        
    } catch (error) {
        console.error('❌ Erreur incrémentation vues réflexion:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur' 
        });
    }
});

// API pour incrémenter les vues des prières
router.post('/prieres/:id/view', async (req, res) => {
    try {
        const priereId = req.params.id;
        
        if (!priereId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID de prière manquant' 
            });
        }
        
        // Vérifier si la prière existe
        const priere = await dbGet('SELECT id, views FROM baume_prieres WHERE id = ?', [priereId]);
        
        if (!priere) {
            return res.status(404).json({ 
                success: false, 
                message: 'Prière non trouvée' 
            });
        }
        
        // Incrémenter les vues
        const currentViews = priere.views || 0;
        await dbRun(
            'UPDATE baume_prieres SET views = ? WHERE id = ?',
            [currentViews + 1, priereId]
        );
        
        // Récupérer le nombre de vues mis à jour
        const updatedPriere = await dbGet('SELECT views FROM baume_prieres WHERE id = ?', [priereId]);
        
        res.json({ 
            success: true, 
            views: updatedPriere.views || 0,
            message: 'Vue incrémentée avec succès'
        });
        
    } catch (error) {
        console.error('❌ Erreur incrémentation vues prière:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur' 
        });
    }
});

module.exports = router;
