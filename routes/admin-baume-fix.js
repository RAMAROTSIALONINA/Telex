const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ========== MIDDLEWARE AUTH ==========
function requireAuth(req, res, next) {
    if (!req.session || !req.session.user || !req.session.user.loggedIn) {
        console.log('⚠️  [Baume Admin] Utilisateur non connecté');
        return res.redirect('/admin/login');
    }
    console.log('✅ [Baume Admin] Utilisateur authentifié:', req.session.user.username);
    next();
}

function requireAuthApi(req, res, next) {
    if (!req.session || !req.session.user || !req.session.user.loggedIn) {
        return res.status(401).json({ success: false, message: 'Non autorisé' });
    }
    next();
}

// Configuration de Multer pour les médias du Baume de la Foi
const baumeStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'baume');
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
        const isVideo = file.mimetype.startsWith('video/');
        const isImage = file.mimetype.startsWith('image/');
        if (isVideo || isImage) {
            cb(null, true);
        } else {
            cb(new Error('Seuls les fichiers vidéo et image sont acceptés'), false);
        }
    }
});

// ========== PAGE ADMIN (HTML) ==========
router.get('/baume-de-la-foi', requireAuth, async (req, res) => {
    try {
        const stats = await dbAll(`
            SELECT 
                (SELECT COUNT(*) FROM baume_prieres WHERE is_published = 1) as prieres_count,
                (SELECT COUNT(*) FROM baume_temoignages WHERE is_approved = 1) as temoignages_approuves,
                (SELECT COUNT(*) FROM baume_temoignages WHERE status = 'pending') as temoignages_en_attente,
                (SELECT COUNT(*) FROM baume_reflexions WHERE is_published = 1) as reflexions_count,
                (SELECT SUM(views) FROM baume_prieres) + (SELECT SUM(views) FROM baume_reflexions) as total_views
        `);

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

        const prieres = await dbAll(`
            SELECT id, title, content, category, created_at, is_published, video_url, image_url, media_type
            FROM baume_prieres 
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        const reflexions = await dbAll(`
            SELECT id, title, content, theme, created_at, is_published, image_url, video_url, media_type
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
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });
    } catch (error) {
        console.error('❌ Erreur chargement admin Baume de la Foi:', error);
        req.flash('error', 'Erreur lors du chargement de la page');
        res.redirect('/admin');
    }
});

// ========== API ROUTES (TOUTES AVEC /api/baume-de-la-foi) ==========

// Dashboard data
router.get('/api/baume-de-la-foi/dashboard-data', requireAuthApi, async (req, res) => {
    try {
        const prieres = await dbAll(`
            SELECT id, title, content, category, reference_biblique, author, 
                   is_published, video_url, image_url, media_type, 
                   created_at, updated_at, views
            FROM baume_prieres 
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        const reflexions = await dbAll(`
            SELECT id, title, content, theme, author, 
                   is_published, video_url, image_url, media_type, 
                   created_at, updated_at, views
            FROM baume_reflexions 
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        const publishedPrieres = prieres.filter(p => p.is_published).length;
        const draftPrieres = prieres.filter(p => !p.is_published).length;
        const publishedReflexions = reflexions.filter(r => r.is_published).length;
        const draftReflexions = reflexions.filter(r => !r.is_published).length;
        const totalViews = prieres.reduce((sum, p) => sum + (p.views || 0), 0) + 
                          reflexions.reduce((sum, r) => sum + (r.views || 0), 0);

        res.json({
            success: true,
            data: {
                prieres,
                reflexions,
                stats: {
                    publishedPrieres,
                    draftPrieres,
                    publishedReflexions,
                    draftReflexions,
                    totalPrieres: prieres.length,
                    totalReflexions: reflexions.length,
                    totalViews
                }
            }
        });
    } catch (error) {
        console.error('❌ Erreur chargement données dashboard:', error);
        res.status(500).json({ success: false, error: 'Erreur lors du chargement' });
    }
});

// Sauvegarder une prière
router.post('/api/baume-de-la-foi/priere/save', requireAuth, baumeUpload.single('media_file'), async (req, res) => {
    try {
        const { title, content, category, reference, author, is_published, media_type } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, error: 'Le titre et le contenu sont obligatoires' });
        }

        let mediaUrl = null;
        
        if (req.file) {
            mediaUrl = `/uploads/baume/${req.file.filename}`;
        }

        let videoUrl = null;
        let imageUrl = null;
        
        if (media_type === 'video' && mediaUrl) {
            videoUrl = mediaUrl;
        } else if (media_type === 'image' && mediaUrl) {
            imageUrl = mediaUrl;
        }

        const result = await dbRun(`
            INSERT INTO baume_prieres (title, content, category, reference_biblique, author, is_published, video_url, image_url, media_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title.trim(),
            content.trim(),
            category || 'comfort',
            reference?.trim() || null,
            author?.trim() || 'Baume de la Foi',
            is_published ? 1 : 0,
            videoUrl,
            imageUrl,
            media_type || 'none'
        ]);

        res.json({ success: true, message: 'Prière créée avec succès', id: result.lastID });

    } catch (error) {
        console.error('❌ Erreur sauvegarde prière:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la sauvegarde de la prière' });
    }
});

// Récupérer une prière pour modification
router.get('/api/baume-de-la-foi/priere/edit/:id', requireAuthApi, async (req, res) => {
    try {
        const { id } = req.params;
        const priere = await dbGet('SELECT * FROM baume_prieres WHERE id = ?', [id]);
        
        if (!priere) {
            return res.status(404).json({ success: false, error: 'Prière non trouvée' });
        }
        
        res.json({ success: true, data: priere });
    } catch (error) {
        console.error('❌ Erreur récupération prière pour édition:', error);
        res.status(500).json({ success: false, error: 'Erreur lors du chargement de la prière' });
    }
});

// Mettre à jour une prière
router.post('/api/baume-de-la-foi/priere/update/:id', requireAuth, baumeUpload.single('media_file'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category, reference_biblique, author, is_published, existing_video_url, existing_image_url, existing_media_type } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, error: 'Le titre et le contenu sont obligatoires' });
        }

        let videoUrl = existing_video_url || null;
        let imageUrl = existing_image_url || null;
        let mediaType = existing_media_type || 'none';

        if (req.file) {
            const isVideo = req.file.mimetype.startsWith('video/');
            const isImage = req.file.mimetype.startsWith('image/');
            const mediaUrl = `/uploads/baume/${req.file.filename}`;
            
            if (isVideo) {
                videoUrl = mediaUrl;
                mediaType = 'video';
            } else if (isImage) {
                imageUrl = mediaUrl;
                mediaType = 'image';
            }
        }

        await dbRun(`
            UPDATE baume_prieres 
            SET title = ?, content = ?, category = ?, reference_biblique = ?, 
                author = ?, is_published = ?, video_url = ?, image_url = ?, 
                media_type = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            title.trim(),
            content.trim(),
            category || 'comfort',
            reference_biblique?.trim() || null,
            author?.trim() || 'Baume de la Foi',
            is_published ? 1 : 0,
            videoUrl,
            imageUrl,
            mediaType,
            id
        ]);

        const updatedPriere = await dbGet('SELECT * FROM baume_prieres WHERE id = ?', [id]);
        res.json({ success: true, message: 'Prière mise à jour avec succès', data: updatedPriere });

    } catch (error) {
        console.error('❌ Erreur mise à jour prière:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour de la prière' });
    }
});

// Supprimer une prière
router.post('/api/baume-de-la-foi/priere/delete/:id', requireAuthApi, async (req, res) => {
    try {
        const { id } = req.params;

        const priere = await dbGet('SELECT video_url, image_url FROM baume_prieres WHERE id = ?', [id]);
        
        if (priere) {
            if (priere.video_url) {
                const videoPath = path.join(__dirname, '..', 'public', priere.video_url);
                if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            }
            if (priere.image_url) {
                const imagePath = path.join(__dirname, '..', 'public', priere.image_url);
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            }
        }

        await dbRun('DELETE FROM baume_prieres WHERE id = ?', [id]);
        res.json({ success: true, message: 'Prière supprimée avec succès' });

    } catch (error) {
        console.error('❌ Erreur suppression prière:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression de la prière' });
    }
});

// Sauvegarder une réflexion
router.post('/api/baume-de-la-foi/reflexion/save', requireAuth, baumeUpload.single('media_file'), async (req, res) => {
    try {
        const { title, content, theme, publication_date, author, is_published, reference_biblique, media_type } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, error: 'Le titre et le contenu sont obligatoires' });
        }

        let mediaUrl = null;
        
        if (req.file) {
            mediaUrl = `/uploads/baume/${req.file.filename}`;
        }

        let videoUrl = null;
        let imageUrl = null;
        
        if (media_type === 'video' && mediaUrl) {
            videoUrl = mediaUrl;
        } else if (media_type === 'image' && mediaUrl) {
            imageUrl = mediaUrl;
        }

        const result = await dbRun(`
            INSERT INTO baume_reflexions (title, content, theme, publication_date, author, video_url, image_url, media_type, is_published, reference_biblique)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title.trim(),
            content.trim(),
            theme || 'faith',
            publication_date || new Date().toISOString().split('T')[0],
            author?.trim() || 'Baume de la Foi',
            videoUrl,
            imageUrl,
            media_type || 'none',
            is_published ? 1 : 0,
            reference_biblique?.trim() || null
        ]);

        res.json({ success: true, message: 'Réflexion créée avec succès', id: result.lastID });

    } catch (error) {
        console.error('❌ Erreur sauvegarde réflexion:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la sauvegarde de la réflexion' });
    }
});

// Récupérer une réflexion pour modification
router.get('/api/baume-de-la-foi/reflexion/edit/:id', requireAuthApi, async (req, res) => {
    try {
        const { id } = req.params;
        const reflexion = await dbGet('SELECT * FROM baume_reflexions WHERE id = ?', [id]);
        
        if (!reflexion) {
            return res.status(404).json({ success: false, error: 'Réflexion non trouvée' });
        }
        
        res.json({ success: true, data: reflexion });
    } catch (error) {
        console.error('❌ Erreur récupération réflexion pour édition:', error);
        res.status(500).json({ success: false, error: 'Erreur lors du chargement de la réflexion' });
    }
});

// Mettre à jour une réflexion
router.post('/api/baume-de-la-foi/reflexion/update/:id', requireAuth, baumeUpload.single('media_file'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, theme, author, is_published, existing_video_url, existing_image_url, existing_media_type, reference_biblique } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, error: 'Le titre et le contenu sont obligatoires' });
        }

        let videoUrl = existing_video_url || null;
        let imageUrl = existing_image_url || null;
        let mediaType = existing_media_type || 'none';

        if (req.file) {
            const isVideo = req.file.mimetype.startsWith('video/');
            const isImage = req.file.mimetype.startsWith('image/');
            const mediaUrl = `/uploads/baume/${req.file.filename}`;
            
            if (isVideo) {
                videoUrl = mediaUrl;
                mediaType = 'video';
            } else if (isImage) {
                imageUrl = mediaUrl;
                mediaType = 'image';
            }
        }

        await dbRun(`
            UPDATE baume_reflexions 
            SET title = ?, content = ?, theme = ?, author = ?, 
                is_published = ?, video_url = ?, image_url = ?, 
                media_type = ?, updated_at = CURRENT_TIMESTAMP,
                reference_biblique = ?
            WHERE id = ?
        `, [
            title.trim(),
            content.trim(),
            theme || 'faith',
            author?.trim() || 'Baume de la Foi',
            is_published ? 1 : 0,
            videoUrl,
            imageUrl,
            mediaType,
            reference_biblique?.trim() || null,
            id
        ]);

        const updatedReflexion = await dbGet('SELECT * FROM baume_reflexions WHERE id = ?', [id]);
        res.json({ success: true, message: 'Réflexion mise à jour avec succès', data: updatedReflexion });

    } catch (error) {
        console.error('❌ Erreur mise à jour réflexion:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour de la réflexion' });
    }
});

// Supprimer une réflexion
router.post('/api/baume-de-la-foi/reflexion/delete/:id', requireAuthApi, async (req, res) => {
    try {
        const { id } = req.params;

        const reflexion = await dbGet('SELECT video_url, image_url FROM baume_reflexions WHERE id = ?', [id]);
        
        if (reflexion) {
            if (reflexion.video_url) {
                const videoPath = path.join(__dirname, '..', 'public', reflexion.video_url);
                if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            }
            if (reflexion.image_url) {
                const imagePath = path.join(__dirname, '..', 'public', reflexion.image_url);
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            }
        }

        await dbRun('DELETE FROM baume_reflexions WHERE id = ?', [id]);
        res.json({ success: true, message: 'Réflexion supprimée avec succès' });

    } catch (error) {
        console.error('❌ Erreur suppression réflexion:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression de la réflexion' });
    }
});

// Récupérer tous les témoignages
router.get('/api/baume-de-la-foi/temoignages', requireAuthApi, async (req, res) => {
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

// Récupérer un témoignage spécifique
router.get('/api/baume-de-la-foi/temoignage/:id', requireAuthApi, async (req, res) => {
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

// Approuver ou rejeter un témoignage
router.post('/api/baume-de-la-foi/temoignage/:id/approve', requireAuthApi, async (req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;
        
        const status = approved ? 'approved' : 'rejected';
        const isApproved = approved ? 1 : 0;

        const result = await dbRun(`
            UPDATE baume_temoignages 
            SET status = ?, is_approved = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, isApproved, id]);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Témoignage non trouvé' });
        }

        res.json({ 
            success: true, 
            message: `Témoignage ${approved ? 'approuvé' : 'rejeté'} avec succès` 
        });
    } catch (error) {
        console.error('❌ Erreur approbation témoignage:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour du témoignage' });
    }
});

// Supprimer un témoignage
router.delete('/api/baume-de-la-foi/temoignage/:id', requireAuthApi, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await dbRun('DELETE FROM baume_temoignages WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Témoignage non trouvé' });
        }

        res.json({ 
            success: true, 
            message: 'Témoignage supprimé avec succès' 
        });
    } catch (error) {
        console.error('❌ Erreur suppression témoignage:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression du témoignage' });
    }
});

// Route de test pour vérifier que le module fonctionne
router.get('/api/baume-de-la-foi/debug', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Module admin-baume-fix fonctionne !',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;