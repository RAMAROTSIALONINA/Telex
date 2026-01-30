const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../config/database');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ========== MIDDLEWARE AUTH ==========
function requireAuth(req, res, next) {
    // Vérifier si la session et l'utilisateur existent
    if (!req.session || !req.session.user || !req.session.user.loggedIn) {
        console.log('⚠️  [Admin Middleware] Utilisateur non connecté');
        return res.redirect('/admin/login');
    }
    
    // Vérifier si l'utilisateur a le rôle admin (ou superadmin)
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin') {
        console.log('⚠️  [Admin Middleware] Rôle insuffisant:', req.session.user.role);
        req.flash('error', 'Accès non autorisé');
        return res.redirect('/admin/dashboard');
    }
    
    next();
}

// Pour les routes superadmin seulement
function requireSuperAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.loggedIn) {
        return res.redirect('/admin/login');
    }
    
    if (req.session.user.role !== 'superadmin') {
        req.flash('error', 'Accès réservé aux super-administrateurs');
        return res.redirect('/admin/dashboard');
    }
    
    next();
}

// ========== LOGIN ==========
router.get('/login', (req, res) => {
    console.log('🔑 Page login - Session actuelle:', req.session.user || 'none');
    
    // Si déjà connecté, rediriger vers dashboard
    if (req.session && req.session.user && req.session.user.loggedIn) {
        console.log('🔑 Déjà connecté, redirection vers dashboard');
        return res.redirect('/admin/dashboard');
    }
    
    res.render('admin/login', {
        title: 'Connexion Admin - TELEX',
        error: req.flash('error')[0] || null,
        success_msg: req.flash('success')
    });
});

router.post('/login', async (req, res) => {
    console.log('🔑 Tentative de connexion:', req.body.username);
    
    const { username, password } = req.body;
    
    try {
        // Rechercher l'utilisateur dans la base de données
        const user = await dbGet('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
        
        if (user) {
            console.log('🔑 Utilisateur trouvé dans la base:', user.username);
            
            // Vérifier le mot de passe
            const isValid = await bcrypt.compare(password, user.password);
            
            if (isValid) {
                console.log('🔑 Mot de passe correct pour:', user.username);
                
                // Mettre à jour la date de dernière connexion
                await dbRun('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
                
                // Créer la session
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    loggedIn: true
                };
                
                // Forcer la sauvegarde de la session
                req.session.save((err) => {
                    if (err) {
                        console.error('❌ Erreur sauvegarde session:', err);
                        req.flash('error', 'Erreur technique lors de la connexion');
                        return res.redirect('/admin/login');
                    }
                    
                    console.log('✅ Session créée pour:', user.username);
                    console.log('✅ Session ID:', req.sessionID);
                    console.log('✅ Session user:', req.session.user);
                    
                    req.flash('success', `Bienvenue ${user.full_name || user.username} !`);
                    return res.redirect('/admin/dashboard');
                });
                
                return;
            }
        }
        
        // Fallback pour la compatibilité
        console.log('🔑 Tentative avec identifiants par défaut');
        if ((username === 'admin' && password === 'admin123') || 
            (username === 'telex' && password === 'telex2026')) {
            
            const role = username === 'admin' ? 'superadmin' : 'admin';
            
            req.session.user = {
                username: username,
                role: role,
                loggedIn: true
            };
            
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Erreur sauvegarde session fallback:', err);
                    req.flash('error', 'Erreur technique lors de la connexion');
                    return res.redirect('/admin/login');
                }
                
                console.log('✅ Session fallback créée pour:', username);
                req.flash('success', `Bienvenue ${username} !`);
                return res.redirect('/admin/dashboard');
            });
            
            return;
        }
        
        console.log('❌ Identifiants incorrects pour:', username);
        req.flash('error', 'Identifiants incorrects');
        res.redirect('/admin/login');
        
    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        req.flash('error', 'Erreur lors de la connexion');
        res.redirect('/admin/login');
    }
});

// ========== LOGOUT ==========
router.get('/logout', (req, res) => {
    console.log('🚪 Déconnexion de:', req.session.user ? req.session.user.username : 'inconnu');
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Erreur destruction session:', err);
        }
        console.log('✅ Session détruite');
        res.redirect('/admin/login');
    });
});

// ========== DASHBOARD ==========
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const stats = {
            totalNews: (await dbGet('SELECT COUNT(*) as count FROM news WHERE is_published = 1')).count || 0,
            totalPrograms: (await dbGet('SELECT COUNT(*) as count FROM programs WHERE is_active = 1')).count || 0,
            totalContacts: (await dbGet('SELECT COUNT(*) as count FROM contacts')).count || 0,
            totalGallery: (await dbGet('SELECT COUNT(*) as count FROM gallery')).count || 0
        };
        
        res.render('admin/dashboard', {
            title: 'Tableau de bord - TELEX',
            user: req.session.user,
            stats: stats
        });
    } catch (error) {
        console.error('❌ Erreur dashboard:', error);
        res.render('admin/dashboard', {
            title: 'Tableau de bord - TELEX',
            user: req.session.user,
            stats: {
                totalNews: 0,
                totalPrograms: 0,
                totalContacts: 0,
                totalGallery: 0
            }
        });
    }
});

// ========== NEWS ==========
// Configuration de Multer pour les actualités
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'news');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'news-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Images seulement (jpeg, jpg, png, gif, webp)'));
        }
    }
});

router.get('/news', requireAuth, async (req, res) => {
    try {
        const newsData = await dbAll('SELECT * FROM news ORDER BY created_at DESC');
        
        res.render('admin/news', {
            title: 'Gestion des actualités - TELEX',
            user: req.session.user,
            news: newsData || []
        });
    } catch (error) {
        console.error('❌ Erreur chargement actualités:', error);
        res.render('admin/news', {
            title: 'Gestion des actualités - TELEX',
            user: req.session.user,
            news: []
        });
    }
});

router.get('/news/new', requireAuth, (req, res) => {
    res.render('admin/news_edit', {
        title: 'Nouvelle actualité - TELEX',
        user: req.session.user,
        news: null
    });
});

router.get('/news/edit/:id', requireAuth, async (req, res) => {
    try {
        const newsId = req.params.id;
        const newsItem = await dbGet('SELECT * FROM news WHERE id = ?', [newsId]);
        
        if (!newsItem) {
            req.flash('error', 'Actualité non trouvée');
            return res.redirect('/admin/news');
        }
        
        res.render('admin/news_edit', {
            title: `Éditer "${newsItem.title}" - TELEX`,
            user: req.session.user,
            news: newsItem
        });
    } catch (error) {
        console.error('❌ Erreur édition:', error);
        req.flash('error', 'Erreur lors du chargement de l\'actualité');
        res.redirect('/admin/news');
    }
});

router.post('/news/save', requireAuth, upload.single('image_file'), async (req, res) => {
    try {
        const { id, title, excerpt, content, author, category, image_url, is_published, remove_image } = req.body;
        
        if (!title || !content) {
            req.flash('error', 'Le titre et le contenu sont obligatoires');
            return res.redirect(id ? `/admin/news/edit/${id}` : '/admin/news/new');
        }
        
        let finalImageUrl = image_url;
        
        if (req.file) {
            finalImageUrl = `/uploads/news/${req.file.filename}`;
        }
        
        if (remove_image === '1') {
            finalImageUrl = null;
            
            if (id) {
                const currentNews = await dbGet('SELECT image_url FROM news WHERE id = ?', [id]);
                if (currentNews && currentNews.image_url && currentNews.image_url.includes('/uploads/news/')) {
                    const filename = path.basename(currentNews.image_url);
                    const filePath = path.join(__dirname, '..', 'public', 'uploads', 'news', filename);
                    
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            }
        }
        
        if (!req.file && image_url && image_url.trim() !== '') {
            finalImageUrl = image_url.trim();
        }
        
        if (id) {
            await dbRun(
                `UPDATE news SET 
                 title = ?, excerpt = ?, content = ?, author = ?, 
                 category = ?, image_url = ?, is_published = ?, 
                 updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [title.trim(), 
                 excerpt?.trim() || '', 
                 content.trim(), 
                 author?.trim() || 'TELEX', 
                 category?.trim() || 'Actualité', 
                 finalImageUrl, 
                 is_published ? 1 : 0, 
                 id]
            );
            req.flash('success', 'Actualité mise à jour avec succès');
        } else {
            await dbRun(
                `INSERT INTO news (title, excerpt, content, author, category, image_url, is_published) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [title.trim(), 
                 excerpt?.trim() || '', 
                 content.trim(), 
                 author?.trim() || 'TELEX', 
                 category?.trim() || 'Actualité', 
                 finalImageUrl, 
                 is_published ? 1 : 0]
            );
            req.flash('success', 'Actualité créée avec succès');
        }
        
        res.redirect('/admin/news');
    } catch (error) {
        console.error('❌ Erreur sauvegarde:', error);
        req.flash('error', 'Erreur lors de la sauvegarde: ' + error.message);
        res.redirect('/admin/news');
    }
});

router.get('/news/delete/:id', requireAuth, async (req, res) => {
    try {
        const newsId = req.params.id;
        const newsItem = await dbGet('SELECT title, image_url FROM news WHERE id = ?', [newsId]);
        
        if (!newsItem) {
            req.flash('error', 'Actualité non trouvée');
            return res.redirect('/admin/news');
        }
        
        if (newsItem.image_url && newsItem.image_url.includes('/uploads/news/')) {
            const filename = path.basename(newsItem.image_url);
            const filePath = path.join(__dirname, '..', 'public', 'uploads', 'news', filename);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        await dbRun('DELETE FROM news WHERE id = ?', [newsId]);
        
        req.flash('success', `Actualité "${newsItem.title}" supprimée avec succès`);
        res.redirect('/admin/news');
    } catch (error) {
        console.error('❌ Erreur suppression:', error);
        req.flash('error', 'Erreur lors de la suppression de l\'actualité');
        res.redirect('/admin/news');
    }
});

// ========== PROGRAMS ==========
router.get('/programs', requireAuth, async (req, res) => {
    try {
        const programs = await dbAll('SELECT * FROM programs ORDER BY created_at DESC');
        res.render('admin/programs', {
            title: 'Programmes - TELEX',
            user: req.session.user,
            programs: programs || []
        });
    } catch (error) {
        console.error('Erreur programmes:', error);
        res.render('admin/programs', {
            title: 'Programmes - TELEX',
            user: req.session.user,
            programs: []
        });
    }
});

// Route pour afficher le formulaire de création de programme
router.get('/programs/new', requireAuth, (req, res) => {
    res.render('admin/programs_new', {
        title: 'Nouveau Programme - TELEX',
        user: req.session.user,
        success_msg: req.flash('success'),
        error_msg: req.flash('error'),
        program: null
    });
});

// Route pour créer un nouveau programme (POST)
router.post('/programs/save', requireAuth, async (req, res) => {
    try {
        const { title, description, presenter, schedule_time, category, duration, is_active } = req.body;
        
        // Validation basique
        if (!title || !description) {
            req.flash('error', 'Le titre et la description sont obligatoires');
            return res.redirect('/admin/programs/new');
        }
        
        // Insérer dans la base de données
        const result = await dbRun(
            `INSERT INTO programs (title, description, presenter, schedule_time, category, duration, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                description.trim(),
                presenter?.trim() || 'TELEX',
                schedule_time?.trim() || 'À déterminer',
                category?.trim() || 'Actualités',
                duration?.trim() || '30 min',
                is_active ? 1 : 0
            ]
        );
        
        req.flash('success', `Programme "${title}" créé avec succès !`);
        res.redirect('/admin/programs');
        
    } catch (error) {
        console.error('❌ Erreur création programme:', error);
        req.flash('error', 'Erreur lors de la création du programme: ' + error.message);
        res.redirect('/admin/programs/new');
    }
});

// Route pour afficher le formulaire d'édition de programme
router.get('/programs/edit/:id', requireAuth, async (req, res) => {
    try {
        const programId = req.params.id;
        const program = await dbGet('SELECT * FROM programs WHERE id = ?', [programId]);
        
        if (!program) {
            req.flash('error', 'Programme non trouvé');
            return res.redirect('/admin/programs');
        }
        
        res.render('admin/programs_edit', {
            title: `Éditer "${program.title}" - TELEX`,
            user: req.session.user,
            program: program,
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });
        
    } catch (error) {
        console.error('❌ Erreur chargement programme:', error);
        req.flash('error', 'Erreur lors du chargement du programme');
        res.redirect('/admin/programs');
    }
});

// Route pour mettre à jour un programme
router.post('/programs/update/:id', requireAuth, async (req, res) => {
    try {
        const programId = req.params.id;
        const { title, description, presenter, schedule_time, category, duration, is_active } = req.body;
        
        // Vérifier si le programme existe
        const existingProgram = await dbGet('SELECT * FROM programs WHERE id = ?', [programId]);
        if (!existingProgram) {
            req.flash('error', 'Programme non trouvé');
            return res.redirect('/admin/programs');
        }
        
        // Validation
        if (!title || !description) {
            req.flash('error', 'Le titre et la description sont obligatoires');
            return res.redirect(`/admin/programs/edit/${programId}`);
        }
        
        // Mettre à jour dans la base de données
        await dbRun(
            `UPDATE programs 
             SET title = ?, description = ?, presenter = ?, schedule_time = ?, 
                 category = ?, duration = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [
                title.trim(),
                description.trim(),
                presenter?.trim() || 'TELEX',
                schedule_time?.trim() || 'À déterminer',
                category?.trim() || 'Actualités',
                duration?.trim() || '30 min',
                is_active ? 1 : 0,
                programId
            ]
        );
        
        req.flash('success', `Programme "${title}" mis à jour avec succès !`);
        res.redirect('/admin/programs');
        
    } catch (error) {
        console.error('❌ Erreur mise à jour programme:', error);
        req.flash('error', 'Erreur lors de la mise à jour du programme: ' + error.message);
        res.redirect(`/admin/programs/edit/${req.params.id}`);
    }
});

// Route pour supprimer un programme
router.get('/programs/delete/:id', requireAuth, async (req, res) => {
    try {
        const programId = req.params.id;
        
        // Récupérer le programme pour avoir son titre
        const program = await dbGet('SELECT title FROM programs WHERE id = ?', [programId]);
        
        if (!program) {
            req.flash('error', 'Programme non trouvé');
            return res.redirect('/admin/programs');
        }
        
        // Supprimer le programme
        await dbRun('DELETE FROM programs WHERE id = ?', [programId]);
        
        req.flash('success', `Programme "${program.title}" supprimé avec succès`);
        res.redirect('/admin/programs');
        
    } catch (error) {
        console.error('❌ Erreur suppression programme:', error);
        req.flash('error', 'Erreur lors de la suppression du programme');
        res.redirect('/admin/programs');
    }
});

// ========== CONTACTS ==========
router.get('/contacts', requireAuth, async (req, res) => {
    try {
        const contacts = await dbAll(`
            SELECT id, name, email, subject, message, 
                   created_at, is_read, newsletter 
            FROM contacts 
            ORDER BY created_at DESC
        `);
        
        const unreadCount = contacts.filter(c => !c.is_read).length;
        const readCount = contacts.filter(c => c.is_read).length;
        
        res.render('admin/contacts', {
            title: 'Messages de contact - TELEX',
            user: req.session.user,
            contacts: contacts || [],
            unreadCount: unreadCount,
            readCount: readCount,
            totalCount: contacts.length
        });
    } catch (error) {
        console.error('❌ Erreur chargement contacts:', error);
        res.render('admin/contacts', {
            title: 'Messages de contact - TELEX',
            user: req.session.user,
            contacts: [],
            unreadCount: 0,
            readCount: 0,
            totalCount: 0
        });
    }
});

router.get('/contacts/view/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await dbGet('SELECT * FROM contacts WHERE id = ?', [id]);
        
        if (!contact) {
            return res.status(404).render('pages/error', {
                title: 'Message non trouvé - TELEX',
                message: 'Le message demandé n\'existe pas ou a été supprimé.'
            });
        }
        
        if (!contact.is_read) {
            await dbRun(
                'UPDATE contacts SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );
        }
        
        res.render('admin/contact-view', {
            title: `Message de ${contact.name} - Admin TELEX`,
            contact: contact
        });
        
    } catch (error) {
        console.error('❌ Erreur vue message:', error);
        res.status(500).render('pages/error', {
            title: 'Erreur - TELEX',
            message: 'Une erreur est survenue lors du chargement du message.'
        });
    }
});

router.post('/contacts/mark-read/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await dbRun(
            'UPDATE contacts SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
        res.json({ success: true, message: 'Message marqué comme lu' });
    } catch (error) {
        console.error('❌ Erreur marquer comme lu:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/contacts/delete/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await dbGet('SELECT * FROM contacts WHERE id = ?', [id]);
        
        if (!contact) {
            req.flash('error', 'Message non trouvé');
            return res.redirect('/admin/contacts');
        }
        
        await dbRun('DELETE FROM contacts WHERE id = ?', [id]);
        
        req.flash('success', `Message de ${contact.name} supprimé avec succès`);
        res.redirect('/admin/contacts');
    } catch (error) {
        console.error('❌ Erreur suppression message:', error);
        req.flash('error', 'Erreur lors de la suppression du message');
        res.redirect('/admin/contacts');
    }
});

// ========== GALLERY ==========
router.get('/gallery', requireAuth, async (req, res) => {
    try {
        const gallery = await dbAll('SELECT * FROM gallery ORDER BY created_at DESC');
        
        const categoriesCount = gallery ? 
            [...new Set(gallery.map(item => item.category))].length : 0;
        
        const totalSize = gallery ? 
            (gallery.length * 1.2).toFixed(1) : '0';
        
        res.render('admin/gallery', {
            title: 'Galerie - TELEX',
            user: req.session.user,
            gallery: gallery || [],
            categoriesCount: categoriesCount,
            totalSize: totalSize
        });
    } catch (error) {
        console.error('❌ Erreur galerie:', error);
        res.render('admin/gallery', {
            title: 'Galerie - TELEX',
            user: req.session.user,
            gallery: [],
            categoriesCount: 0,
            totalSize: '0'
        });
    }
});

// Configuration de Multer pour la gallery
const galleryStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'gallery');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const galleryUpload = multer({
    storage: galleryStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Seules les images (JPEG, JPG, PNG, GIF, WebP) sont autorisées'));
        }
    }
});

// Route pour uploader des images
router.post('/gallery/upload', requireAuth, galleryUpload.array('images', 10), async (req, res) => {
    try {
        const { category, titles, descriptions } = req.body;
        
        if (!req.files || req.files.length === 0) {
            req.flash('error', 'Aucune image sélectionnée');
            return res.redirect('/admin/gallery');
        }
        
        const uploadedImages = [];
        
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const title = titles && titles[i] ? titles[i] : `Image ${i + 1}`;
            const description = descriptions && descriptions[i] ? descriptions[i] : '';
            
            const result = await dbRun(
                `INSERT INTO gallery (title, description, image_url, category) VALUES (?, ?, ?, ?)`,
                [title, description, `/uploads/gallery/${file.filename}`, category || 'autres']
            );
            
            uploadedImages.push({
                id: result.id,
                title: title,
                image_url: `/uploads/gallery/${file.filename}`
            });
        }
        
        req.flash('success', `${uploadedImages.length} image(s) ajoutée(s) avec succès !`);
        res.redirect('/admin/gallery');
        
    } catch (error) {
        console.error('❌ Erreur upload gallery:', error);
        req.flash('error', 'Erreur lors de l\'upload: ' + error.message);
        res.redirect('/admin/gallery');
    }
});

// Route pour éditer une image
router.get('/gallery/edit/:id', requireAuth, async (req, res) => {
    try {
        const imageId = req.params.id;
        
        // Récupérer l'image à éditer
        const image = await dbGet('SELECT * FROM gallery WHERE id = ?', [imageId]);
        
        if (!image) {
            req.flash('error', 'Image non trouvée');
            return res.redirect('/admin/gallery');
        }
        
        res.render('admin/gallery_edit', {
            title: `Éditer "${image.title}" - TELEX`,
            user: req.session.user,
            image: image,
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });
        
    } catch (error) {
        console.error('❌ Erreur chargement image pour édition:', error);
        req.flash('error', 'Erreur lors du chargement de l\'image');
        res.redirect('/admin/gallery');
    }
});

// Route pour mettre à jour une image
router.post('/gallery/update/:id', requireAuth, async (req, res) => {
    try {
        const imageId = req.params.id;
        const { title, description, category } = req.body;
        
        // Vérifier si l'image existe
        const existingImage = await dbGet('SELECT * FROM gallery WHERE id = ?', [imageId]);
        if (!existingImage) {
            req.flash('error', 'Image non trouvée');
            return res.redirect('/admin/gallery');
        }
        
        // Validation
        if (!title) {
            req.flash('error', 'Le titre est obligatoire');
            return res.redirect(`/admin/gallery/edit/${imageId}`);
        }
        
        // Mettre à jour dans la base de données
        await dbRun(
            `UPDATE gallery 
             SET title = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [
                title.trim(),
                description?.trim() || '',
                category?.trim() || 'autres',
                imageId
            ]
        );
        
        req.flash('success', `Image "${title}" mise à jour avec succès !`);
        res.redirect('/admin/gallery');
        
    } catch (error) {
        console.error('❌ Erreur mise à jour image:', error);
        req.flash('error', 'Erreur lors de la mise à jour: ' + error.message);
        res.redirect(`/admin/gallery/edit/${req.params.id}`);
    }
});

// Route pour supprimer une image
router.get('/gallery/delete/:id', requireAuth, async (req, res) => {
    try {
        const imageId = req.params.id;
        
        // Récupérer l'image pour avoir son URL
        const image = await dbGet('SELECT * FROM gallery WHERE id = ?', [imageId]);
        
        if (!image) {
            req.flash('error', 'Image non trouvée');
            return res.redirect('/admin/gallery');
        }
        
        // Supprimer le fichier physique
        if (image.image_url && image.image_url.includes('/uploads/gallery/')) {
            const filename = path.basename(image.image_url);
            const filePath = path.join(__dirname, '..', 'public', 'uploads', 'gallery', filename);
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        // Supprimer de la base de données
        await dbRun('DELETE FROM gallery WHERE id = ?', [imageId]);
        
        req.flash('success', `Image "${image.title}" supprimée avec succès`);
        res.redirect('/admin/gallery');
        
    } catch (error) {
        console.error('❌ Erreur suppression image:', error);
        req.flash('error', 'Erreur lors de la suppression de l\'image');
        res.redirect('/admin/gallery');
    }
});

// ========== FOOTER SETTINGS ==========
router.get('/footer', requireAuth, async (req, res) => {
    try {
        const footerSettings = await dbAll('SELECT * FROM footer_settings ORDER BY setting_key');
        
        const settings = {};
        footerSettings.forEach(setting => {
            settings[setting.setting_key] = setting.setting_value;
        });
        
        res.render('admin/footer', {
            title: 'Paramètres Footer - TELEX',
            user: req.session.user,
            settings: settings,
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });
    } catch (error) {
        console.error('❌ Erreur chargement footer:', error);
        req.flash('error', 'Erreur lors du chargement des paramètres du footer');
        res.redirect('/admin/dashboard');
    }
});

router.post('/footer/update', requireAuth, async (req, res) => {
    try {
        const {
            contact_email, contact_phone, contact_address,
            youtube_url, instagram_url, facebook_url, tiktok_url, twitter_url,
            footer_logo, footer_description
        } = req.body;
        
        const settings = {
            contact_email, contact_phone, contact_address,
            youtube_url, instagram_url, facebook_url, tiktok_url, twitter_url,
            footer_logo, footer_description
        };
        
        for (const [key, value] of Object.entries(settings)) {
            await dbRun(
                `UPDATE footer_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?`,
                [value || '', key]
            );
        }
        
        req.flash('success', 'Paramètres du footer mis à jour avec succès !');
        res.redirect('/admin/footer');
        
    } catch (error) {
        console.error('❌ Erreur mise à jour footer:', error);
        req.flash('error', 'Erreur lors de la mise à jour des paramètres');
        res.redirect('/admin/footer');
    }
});

// ========== SETTINGS ==========

router.get('/settings', requireAuth, (req, res) => {
    res.render('admin/settings', {
        title: 'Paramètres - TELEX',
        user: req.session.user,
        success_msg: req.flash('success'),
        error_msg: req.flash('error')
    });
});

router.post('/update-password', requireAuth, async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;
        
        if (!current_password || !new_password || !confirm_password) {
            req.flash('error', 'Tous les champs sont obligatoires');
            return res.redirect('/admin/settings');
        }
        
        if (new_password.length < 6) {
            req.flash('error', 'Le nouveau mot de passe doit contenir au moins 6 caractères');
            return res.redirect('/admin/settings');
        }
        
        if (new_password !== confirm_password) {
            req.flash('error', 'Les mots de passe ne correspondent pas');
            return res.redirect('/admin/settings');
        }
        
        const user = await dbGet('SELECT password FROM users WHERE id = ?', [req.session.user.id]);
        
        if (!user) {
            req.flash('error', 'Utilisateur non trouvé');
            return res.redirect('/admin/settings');
        }
        
        const isValid = await bcrypt.compare(current_password, user.password);
        if (!isValid) {
            req.flash('error', 'Mot de passe actuel incorrect');
            return res.redirect('/admin/settings');
        }
        
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await dbRun(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, req.session.user.id]
        );
        
        req.flash('success', 'Mot de passe mis à jour avec succès');
        res.redirect('/admin/settings');
    } catch (error) {
        console.error('❌ Erreur mise à jour mot de passe:', error);
        req.flash('error', 'Erreur lors de la mise à jour du mot de passe');
        res.redirect('/admin/settings');
    }
});

// ========== GRILLE DES PROGRAMMES ==========

// Afficher la grille des programmes
router.get('/schedule', requireAuth, async (req, res) => {
    try {
        const programs = await dbAll(`
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

        res.render('admin/schedule', {
            title: 'Grille des Programmes - TELEX',
            user: req.session.user,
            programs: programs,
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });
    } catch (error) {
        console.error('❌ Erreur chargement grille:', error);
        req.flash('error', 'Erreur lors du chargement de la grille des programmes');
        res.redirect('/admin/dashboard');
    }
});

// Ajouter un programme à la grille
router.post('/schedule/add', requireAuth, async (req, res) => {
    try {
        const { day, time, program_name, program_type } = req.body;

        if (!day || !time || !program_name || !program_type) {
            req.flash('error', 'Tous les champs sont obligatoires');
            return res.redirect('/admin/schedule');
        }

        // Valider le format de l'heure
        if (!/^\d{2}:\d{2}$/.test(time)) {
            req.flash('error', 'L\'heure doit être au format HH:MM');
            return res.redirect('/admin/schedule');
        }

        await dbRun(
            'INSERT INTO program_schedule (day, time, program_name, program_type) VALUES (?, ?, ?, ?)',
            [day, time, program_name, program_type]
        );

        req.flash('success', 'Programme ajouté à la grille avec succès !');
        res.redirect('/admin/schedule');

    } catch (error) {
        console.error('❌ Erreur ajout programme:', error);
        req.flash('error', 'Erreur lors de l\'ajout du programme');
        res.redirect('/admin/schedule');
    }
});

// Mettre à jour un programme
router.post('/schedule/update/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { day, time, program_name, program_type } = req.body;

        if (!day || !time || !program_name || !program_type) {
            req.flash('error', 'Tous les champs sont obligatoires');
            return res.redirect('/admin/schedule');
        }

        // Valider le format de l'heure
        if (!/^\d{2}:\d{2}$/.test(time)) {
            req.flash('error', 'L\'heure doit être au format HH:MM');
            return res.redirect('/admin/schedule');
        }

        await dbRun(
            'UPDATE program_schedule SET day = ?, time = ?, program_name = ?, program_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [day, time, program_name, program_type, id]
        );

        req.flash('success', 'Programme mis à jour avec succès !');
        res.redirect('/admin/schedule');

    } catch (error) {
        console.error('❌ Erreur mise à jour programme:', error);
        req.flash('error', 'Erreur lors de la mise à jour du programme');
        res.redirect('/admin/schedule');
    }
});

// Supprimer un programme
router.post('/schedule/delete/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await dbRun('UPDATE program_schedule SET is_active = 0 WHERE id = ?', [id]);

        req.flash('success', 'Programme supprimé de la grille avec succès !');
        res.redirect('/admin/schedule');

    } catch (error) {
        console.error('❌ Erreur suppression programme:', error);
        req.flash('error', 'Erreur lors de la suppression du programme');
        res.redirect('/admin/schedule');
    }
});

// ========== EXPORT ==========
module.exports = router;