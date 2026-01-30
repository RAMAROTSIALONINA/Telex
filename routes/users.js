const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../config/database');
const bcrypt = require('bcryptjs');

// ========== SIMPLE MIDDLEWARE ==========
function requireAuth(req, res, next) {
    if (!req.session.user) {
        console.log('🔐 [Users] Pas de session user');
        return res.redirect('/admin/login');
    }
    next();
}

function requireSuperAdmin(req, res, next) {
    if (!req.session.user) {
        console.log('🔐 [SuperAdmin] Pas de session user');
        return res.redirect('/admin/login');
    }
    
    if (req.session.user.role !== 'superadmin') {
        console.log('🔐 [SuperAdmin] Rôle insuffisant:', req.session.user.role);
        req.flash('error', 'Accès réservé aux super-administrateurs');
        return res.redirect('/admin/dashboard');
    }
    
    next();
}


// ========== LISTE DES UTILISATEURS ==========
router.get('/', requireSuperAdmin, async (req, res) => {
    try {
        console.log('📋 Chargement de la liste des utilisateurs...');
        
        const users = await dbAll('SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC');
        
        res.render('admin/users', {
            title: 'Gestion des utilisateurs - TELEX',
            userSession: req.session.user,
            users: users || [],
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });
    } catch (error) {
        console.error('❌ Erreur chargement utilisateurs:', error);
        req.flash('error', 'Erreur lors du chargement des utilisateurs');
        res.redirect('/admin/dashboard');
    }
});

// ========== NOUVEL UTILISATEUR ==========
router.get('/new', requireSuperAdmin, (req, res) => {
    console.log('➕ Page nouveau utilisateur');
    
    res.render('admin/user_edit', {
        title: 'Nouvel utilisateur - TELEX',
        userSession: req.session.user,
        userData: null,
        roles: ['superadmin', 'admin', 'editor', 'viewer'],
        success_msg: req.flash('success'),
        error_msg: req.flash('error')
    });
});

// ========== ÉDITER UTILISATEUR ==========
router.get('/edit/:id', requireSuperAdmin, async (req, res) => {
    try {
        console.log('✏️  Édition utilisateur ID:', req.params.id);
        
        const userId = req.params.id;
        const userData = await dbGet('SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?', [userId]);
        
        if (!userData) {
            req.flash('error', 'Utilisateur non trouvé');
            return res.redirect('/admin/users');
        }
        
        res.render('admin/user_edit', {
            title: `Éditer ${userData.username} - TELEX`,
            userSession: req.session.user,
            userData: userData,
            roles: ['superadmin', 'admin', 'editor', 'viewer'],
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });
    } catch (error) {
        console.error('❌ Erreur édition utilisateur:', error);
        req.flash('error', 'Erreur lors du chargement de l\'utilisateur');
        res.redirect('/admin/users');
    }
});

// ========== SAUVEGARDER UTILISATEUR ==========
router.post('/save', requireSuperAdmin, async (req, res) => {
    try {
        console.log('💾 Sauvegarde utilisateur:', req.body);
        
        const { id, username, email, full_name, role, is_active, password, confirm_password } = req.body;
        
        // Validation
        if (!username || !email || !role) {
            req.flash('error', 'Le nom d\'utilisateur, email et rôle sont obligatoires');
            return res.redirect(id ? `/admin/users/edit/${id}` : '/admin/users/new');
        }
        
        // Vérifier si le username existe déjà (pour les nouveaux utilisateurs)
        if (!id) {
            const existingUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
            if (existingUser) {
                req.flash('error', 'Ce nom d\'utilisateur est déjà utilisé');
                return res.redirect('/admin/users/new');
            }
            
            // Pour les nouveaux utilisateurs, vérifier le mot de passe
            if (!password || password.length < 6) {
                req.flash('error', 'Le mot de passe doit contenir au moins 6 caractères');
                return res.redirect('/admin/users/new');
            }
            
            if (password !== confirm_password) {
                req.flash('error', 'Les mots de passe ne correspondent pas');
                return res.redirect('/admin/users/new');
            }
        }
        
        if (id) {
            // Mise à jour de l'utilisateur
            if (password && password.trim() !== '') {
                // Changer le mot de passe
                if (password.length < 6) {
                    req.flash('error', 'Le mot de passe doit contenir au moins 6 caractères');
                    return res.redirect(`/admin/users/edit/${id}`);
                }
                
                if (password !== confirm_password) {
                    req.flash('error', 'Les mots de passe ne correspondent pas');
                    return res.redirect(`/admin/users/edit/${id}`);
                }
                
                const hashedPassword = await bcrypt.hash(password, 10);
                await dbRun(
                    'UPDATE users SET username = ?, email = ?, full_name = ?, role = ?, is_active = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [username.trim(), email.trim(), full_name?.trim() || '', role, is_active ? 1 : 0, hashedPassword, id]
                );
            } else {
                // Mettre à jour sans changer le mot de passe
                await dbRun(
                    'UPDATE users SET username = ?, email = ?, full_name = ?, role = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [username.trim(), email.trim(), full_name?.trim() || '', role, is_active ? 1 : 0, id]
                );
            }
            
            console.log(`✅ Utilisateur #${id} mis à jour`);
            req.flash('success', 'Utilisateur mis à jour avec succès');
        } else {
            // Création d'un nouvel utilisateur
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await dbRun(
                'INSERT INTO users (username, email, full_name, role, is_active, password) VALUES (?, ?, ?, ?, ?, ?)',
                [username.trim(), email.trim(), full_name?.trim() || '', role, is_active ? 1 : 0, hashedPassword]
            );
            
            console.log('✅ Nouvel utilisateur créé - ID:', result.id);
            req.flash('success', 'Utilisateur créé avec succès');
        }
        
        res.redirect('/admin/users');
    } catch (error) {
        console.error('❌ Erreur sauvegarde utilisateur:', error);
        req.flash('error', 'Erreur lors de la sauvegarde: ' + error.message);
        res.redirect('/admin/users');
    }
});

// ========== SUPPRIMER UTILISATEUR ==========
router.get('/delete/:id', requireSuperAdmin, async (req, res) => {
    try {
        console.log('🗑️  Suppression utilisateur ID:', req.params.id);
        
        const userId = req.params.id;
        
        // Empêcher la suppression de son propre compte
        if (parseInt(userId) === req.session.user.id) {
            req.flash('error', 'Vous ne pouvez pas supprimer votre propre compte');
            return res.redirect('/admin/users');
        }
        
        // Empêcher la suppression du dernier superadmin
        const superadminCount = await dbGet('SELECT COUNT(*) as count FROM users WHERE role = "superadmin"');
        if (superadminCount.count <= 1) {
            const userToDelete = await dbGet('SELECT role FROM users WHERE id = ?', [userId]);
            if (userToDelete && userToDelete.role === 'superadmin') {
                req.flash('error', 'Impossible de supprimer le dernier super-administrateur');
                return res.redirect('/admin/users');
            }
        }
        
        // Vérifier si l'utilisateur existe
        const userData = await dbGet('SELECT username FROM users WHERE id = ?', [userId]);
        if (!userData) {
            req.flash('error', 'Utilisateur non trouvé');
            return res.redirect('/admin/users');
        }
        
        // Supprimer l'utilisateur
        await dbRun('DELETE FROM users WHERE id = ?', [userId]);
        console.log(`✅ Utilisateur #${userId} supprimé`);
        
        req.flash('success', `Utilisateur "${userData.username}" supprimé avec succès`);
        res.redirect('/admin/users');
    } catch (error) {
        console.error('❌ Erreur suppression utilisateur:', error);
        req.flash('error', 'Erreur lors de la suppression');
        res.redirect('/admin/users');
    }
});

// ========== PROFIL UTILISATEUR ==========
router.get('/profile', requireAuth, async (req, res) => {
    try {
        console.log('👤 Chargement profil utilisateur');
        
        const userData = await dbGet('SELECT id, username, email, full_name, role, last_login FROM users WHERE id = ?', [req.session.user.id]);
        
        if (!userData) {
            req.flash('error', 'Utilisateur non trouvé');
            return res.redirect('/admin/dashboard');
        }
        
        res.render('admin/user_profile', {
            title: 'Mon profil - TELEX',
            userSession: req.session.user,
            userData: userData,
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });
    } catch (error) {
        console.error('❌ Erreur chargement profil:', error);
        req.flash('error', 'Erreur lors du chargement du profil');
        res.redirect('/admin/dashboard');
    }
});

router.post('/profile/save', requireAuth, async (req, res) => {
    try {
        console.log('💾 Sauvegarde profil utilisateur');
        
        const { email, full_name, current_password, new_password, confirm_password } = req.body;
        
        // Validation de l'email
        if (!email || !email.includes('@')) {
            req.flash('error', 'Email invalide');
            return res.redirect('/admin/users/profile');
        }
        
        // Si changement de mot de passe demandé
        if (current_password && new_password) {
            // Vérifier l'ancien mot de passe
            const user = await dbGet('SELECT password FROM users WHERE id = ?', [req.session.user.id]);
            
            if (!user) {
                req.flash('error', 'Utilisateur non trouvé');
                return res.redirect('/admin/users/profile');
            }
            
            const isValid = await bcrypt.compare(current_password, user.password);
            if (!isValid) {
                req.flash('error', 'Mot de passe actuel incorrect');
                return res.redirect('/admin/users/profile');
            }
            
            // Vérifier la longueur du nouveau mot de passe
            if (new_password.length < 6) {
                req.flash('error', 'Le nouveau mot de passe doit contenir au moins 6 caractères');
                return res.redirect('/admin/users/profile');
            }
            
            if (new_password !== confirm_password) {
                req.flash('error', 'Les nouveaux mots de passe ne correspondent pas');
                return res.redirect('/admin/users/profile');
            }
            
            // Hasher et sauvegarder le nouveau mot de passe
            const hashedPassword = await bcrypt.hash(new_password, 10);
            await dbRun(
                'UPDATE users SET email = ?, full_name = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [email.trim(), full_name?.trim() || '', hashedPassword, req.session.user.id]
            );
            
            req.flash('success', 'Profil et mot de passe mis à jour avec succès');
        } else {
            // Mettre à jour seulement les infos sans changer le mot de passe
            await dbRun(
                'UPDATE users SET email = ?, full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [email.trim(), full_name?.trim() || '', req.session.user.id]
            );
            
            req.flash('success', 'Profil mis à jour avec succès');
        }
        
        // Mettre à jour la session
        const updatedUser = await dbGet('SELECT username, email, full_name, role FROM users WHERE id = ?', [req.session.user.id]);
        if (updatedUser) {
            req.session.user = {
                ...req.session.user,
                username: updatedUser.username,
                email: updatedUser.email,
                full_name: updatedUser.full_name
            };
        }
        
        res.redirect('/admin/users/profile');
    } catch (error) {
        console.error('❌ Erreur sauvegarde profil:', error);
        req.flash('error', 'Erreur lors de la sauvegarde du profil');
        res.redirect('/admin/users/profile');
    }
});

module.exports = router;