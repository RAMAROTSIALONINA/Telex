// routes/admin-album.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

// Configuration de multer pour l'upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const categoryId = req.params.categoryId || req.body.categoryId || 'autres';
        const uploadPath = path.join(__dirname, '../public/images/album', categoryId);
        
        // Créer le dossier s'il n'existe pas
        fs.mkdir(uploadPath, { recursive: true })
            .then(() => cb(null, uploadPath))
            .catch(err => cb(err));
    },
    filename: function (req, file, cb) {
        // Générer un nom unique
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Seules les images sont autorisées'));
        }
    }
});

// Middleware pour vérifier si l'utilisateur est admin
function isAdmin(req, res, next) {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    next();
}

// API: Récupérer toutes les catégories et leurs images
router.get('/categories', isAdmin, async (req, res) => {
    try {
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
                
                categoriesData.push({
                    id: category,
                    name: getCategoryName(category),
                    description: getCategoryDescription(category),
                    images: images
                });
            }
        }
        
        res.json({ 
            success: true, 
            data: categoriesData 
        });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur lors du chargement des catégories' });
    }
});

// API: Upload d'images
router.post('/upload/:categoryId', isAdmin, upload.array('images', 10), async (req, res) => {
    console.log('🔍 DEBUG: Upload API appelée');
    console.log('🔍 DEBUG: CategoryId params:', req.params.categoryId);
    console.log('🔍 DEBUG: Files reçus:', req.files ? req.files.length : 0);
    console.log('🔍 DEBUG: Body:', req.body);
    console.log('🔍 DEBUG: User:', req.user);
    
    try {
        const files = req.files;
        const categoryId = req.params.categoryId; // Utiliser req.params au lieu de req.body
        
        if (!files || files.length === 0) {
            console.log('🔍 DEBUG: Aucun fichier reçu');
            return res.status(400).json({ success: false, message: 'Aucune image uploadée' });
        }
        
        console.log('🔍 DEBUG: Traitement des fichiers...');
        const uploadedFiles = files.map(file => ({
            filename: file.filename,
            path: `/images/album/${categoryId}/${file.filename}`,
            originalName: file.originalname
        }));
        
        console.log('🔍 DEBUG: Fichiers uploadés:', uploadedFiles);
        
        res.json({ 
            success: true, 
            files: uploadedFiles,
            message: `${files.length} image(s) uploadée(s) avec succès`
        });
    } catch (error) {
        console.error('❌ Erreur upload:', error);
        console.error('❌ Stack trace:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de l\'upload' 
        });
    }
});

// API: Ajouter une catégorie
router.post('/categories', isAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;
        const categoryId = name.toLowerCase().replace(/\s+/g, '-');
        
        const categoryPath = path.join(__dirname, '../public/images/album', categoryId);
        await fs.mkdir(categoryPath, { recursive: true });
        
        res.json({ 
            success: true, 
            category: {
                id: categoryId,
                name: name,
                description: description,
                images: []
            }
        });
    } catch (error) {
        console.error('Erreur création catégorie:', error);
        res.status(500).json({ error: 'Erreur lors de la création de la catégorie' });
    }
});

// API: Supprimer une image
router.delete('/images/:categoryId/:filename', isAdmin, async (req, res) => {
    try {
        const { categoryId, filename } = req.params;
        const imagePath = path.join(__dirname, '../public/images/album', categoryId, filename);
        
        await fs.unlink(imagePath);
        res.json({ success: true, message: 'Image supprimée' });
    } catch (error) {
        console.error('Erreur suppression image:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// API: Supprimer une catégorie
router.delete('/categories/:categoryId', isAdmin, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const categoryPath = path.join(__dirname, '../public/images/album', categoryId);
        
        // Supprimer le dossier et son contenu
        await fs.rm(categoryPath, { recursive: true, force: true });
        
        res.json({ success: true, message: 'Catégorie supprimée' });
    } catch (error) {
        console.error('Erreur suppression catégorie:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// API: Statistiques de l'album
router.get('/stats', isAdmin, async (req, res) => {
    try {
        const albumPath = path.join(__dirname, '../public/images/album');
        
        // Créer le dossier s'il n'existe pas
        await fs.mkdir(albumPath, { recursive: true });
        
        // Lire tous les dossiers de catégories
        const categories = await fs.readdir(albumPath);
        
        let totalImages = 0;
        let totalSize = 0;
        
        for (const category of categories) {
            const categoryPath = path.join(albumPath, category);
            const stats = await fs.stat(categoryPath);
            
            if (stats.isDirectory()) {
                // Lire les images dans le dossier
                const files = await fs.readdir(categoryPath);
                const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
                
                totalImages += imageFiles.length;
                
                // Calculer la taille totale (approximation)
                for (const file of imageFiles) {
                    const filePath = path.join(categoryPath, file);
                    const fileStats = await fs.stat(filePath);
                    totalSize += fileStats.size;
                }
            }
        }
        
        const statsData = {
            totalImages,
            totalCategories: categories.length,
            storageUsed: Math.round(totalSize / (1024 * 1024) * 100) / 100, // en MB
            recentUploads: Math.floor(Math.random() * 10) + 1 // à implémenter avec des dates réelles
        };
        
        res.json({ 
            success: true, 
            data: statsData 
        });
    } catch (error) {
        console.error('❌ Erreur récupération statistiques:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des statistiques' 
        });
    }
});

// Helper functions
function getCategoryName(categoryId) {
    const names = {
        'culture': 'Événements Culturels',
        'sport': 'Événements Sportifs',
        'coutume': 'Événements Coutumes',
        'exceptionnel': 'Événements Exceptionnels',
        'autres': 'Autres Activités'
    };
    return names[categoryId] || categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
}

function getCategoryDescription(categoryId) {
    const descriptions = {
        'culture': 'Photos des événements culturels et festivals',
        'sport': 'Photos des compétitions et événements sportifs',
        'coutume': 'Photos des coutumes et traditions malgaches',
        'exceptionnel': 'Photos des moments exceptionnels',
        'autres': 'Photos diverses et variées'
    };
    return descriptions[categoryId] || 'Photos de la catégorie ' + categoryId;
}

module.exports = router;