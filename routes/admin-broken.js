const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// ========== CONFIGURATION MULTTER ==========

// Configuration de Multer pour les données de formulaire (sans fichiers)
const formDataUpload = multer({});
const { db, dbAll, dbGet, dbRun } = require('../config/database');

// ========== ADMINISTRATION ALBUM ==========
router.get('/album', (req, res) => {
    try {
        // Vérifier si l'utilisateur est admin ou superadmin
        if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
            return res.redirect('/admin/login');
        }
        
        res.render('admin/album-admin', {
            title: 'Administration Album - TELEX',
            page: 'admin-album',
            user: req.user
        });
    } catch (error) {
        console.error('❌ Erreur route /admin/album:', error);
        res.render('admin/album-admin', {
            title: 'Administration Album - TELEX',
            page: 'admin-album',
            user: req.user
        });
    }
});

// Route pour la page de planification des programmes
router.get('/schedule', async (req, res) => {
    try {
        // Récupérer tous les programmes planifiés
        const programs = await dbAll(`
            SELECT id, title, program_type, schedule_time, program_date, broadcast_type, 
                   presenter, is_active, created_at
            FROM programs 
            WHERE broadcast_type = 'scheduled' 
            ORDER BY program_date, schedule_time
        `);

        // Organiser les programmes par jour
        const schedule = {};
        const joursSemaine = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        
        joursSemaine.forEach(jour => {
            schedule[jour] = [];
        });

        // Vérifier si des programmes existent dans la base
        let hasDbPrograms = false;
        if (programs && programs.length > 0) {
            hasDbPrograms = true;
            programs.forEach(program => {
                if (program.program_date) {
                    const programDate = new Date(program.program_date);
                    const jourIndex = programDate.getDay();
                    const jourName = joursSemaine[jourIndex === 0 ? 6 : jourIndex - 1];
                    
                    schedule[jourName].push({
                        id: program.id,
                        title: program.title,
                        type: program.program_type,
                        time: program.schedule_time,
                        presenter: program.presenter,
                        isActive: program.is_active,
                        date: program.program_date,
                        fromDb: true // Marquer comme venant de la base
                    });
                }
            });
        }

        // Si aucun programme dans la base, ajouter les programmes par défaut
        if (!hasDbPrograms) {
            const defaultPrograms = [
                { jour: 'Lundi', heure: '12:00', emission: '1 notion en 3 minutes', type: 'Éducatif', presenter: 'Prof. Rakoto', typeClass: 'education' },
                { jour: 'Lundi', heure: '18:00', emission: 'TELEX Actus', type: 'Information', presenter: 'Sarah & Tom', typeClass: 'information' },
                { jour: 'Mardi', heure: '20:00', emission: 'Décryptage & Reportages', type: 'Décryptage', presenter: 'Antoine', typeClass: 'decryptage' },
                { jour: 'Mercredi', heure: '18:00', emission: 'Zoom Écologie', type: 'Environnement', presenter: 'Emma', typeClass: 'environnement' },
                { jour: 'Mercredi', heure: '20:00', emission: 'Face à Face', type: 'Débat', presenter: 'Divers intervenants', typeClass: 'debats' },
                { jour: 'Jeudi', heure: '18:00', emission: 'Travailler à Mada', type: 'Économie', presenter: 'M. Randria', typeClass: 'economie' },
                { jour: 'Jeudi', heure: '19:00', emission: 'À Cœur Ouvert', type: 'Sociétal', presenter: 'Claire', typeClass: 'societe' },
                { jour: 'Vendredi', heure: '17:00', emission: 'La Question des Jeunes', type: 'Jeunesse', presenter: 'Étudiants ambassadeurs', typeClass: 'jeunesse' },
                { jour: 'Vendredi', heure: '19:00', emission: 'Culture & Identité', type: 'Culture', presenter: 'Léa & Jules', typeClass: 'culture' },
                { jour: 'Samedi', heure: '17:00', emission: 'Telex Sports', type: 'Sport', presenter: 'Marc & Sophie', typeClass: 'sport' }
            ];

            defaultPrograms.forEach(program => {
                schedule[program.jour].push({
                    id: null, // Pas d'ID dans la base
                    title: program.emission,
                    type: `Programme ${program.type}`,
                    time: program.heure,
                    presenter: program.presenter,
                    isActive: true, // Actif par défaut
                    date: null, // Pas de date spécifique
                    fromDb: false // Marquer comme programme par défaut
                });
            });
        }

        // Trier les programmes par heure pour chaque jour
        Object.keys(schedule).forEach(jour => {
            schedule[jour].sort((a, b) => {
                const timeA = a.time.split('h')[0] * 60 + (a.time.split('h')[1] || 0);
                const timeB = b.time.split('h')[0] * 60 + (b.time.split('h')[1] || 0);
                return timeA - timeB;
            });
        });

        res.render('admin/schedule', {
            page: 'schedule',
            schedule,
            joursSemaine,
            hasDbPrograms // Indiquer si les programmes viennent de la base
        });
    } catch (error) {
        console.error('Erreur page schedule:', error);
        res.status(500).send('Erreur serveur');
    }
});

// Route pour mettre à jour la planification
router.post('/schedule/update', async (req, res) => {
    try {
        const { programId, newDate, newTime, isActive } = req.body;
        
        await dbRun(`
            UPDATE programs 
            SET program_date = ?, schedule_time = ?, is_active = ?
            WHERE id = ?
        `, [newDate, newTime, isActive === 'true' ? 1 : 0, programId]);
        
        res.json({ success: true, message: 'Programme mis à jour avec succès' });
    } catch (error) {
        console.error('Erreur mise à jour schedule:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Route pour supprimer un programme de la planification
router.post('/schedule/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await dbRun('DELETE FROM programs WHERE id = ?', [id]);
        
        res.json({ success: true, message: 'Programme supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression schedule:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Route pour ajouter un nouveau programme à la planification
router.post('/schedule/add', async (req, res) => {
    try {
        const { title, description, presenter, schedule_time, program_type, duration, program_date, broadcast_type, is_active, image_url, video_url, quickAdd, jour, heure } = req.body;
        
        // Si ajout rapide selon le jour et l'heure
        if (quickAdd === 'true' && jour && heure) {
            const defaultPrograms = {
                'Lundi': [
                    { heure: '12:00', emission: '1 notion en 3 minutes', type: 'Programme Éducatif', presenter: 'Prof. Rakoto', program_type: 'Programme Éducatif' },
                    { heure: '18:00', emission: 'TELEX Actus', type: 'Programme d\'Information', presenter: 'Sarah & Tom', program_type: 'Programme d\'Information' }
                ],
                'Mardi': [
                    { heure: '20:00', emission: 'Décryptage & Reportages', type: 'Programme Décryptage & Reportages', presenter: 'Antoine', program_type: 'Programme Décryptage & Reportages' }
                ],
                'Mercredi': [
                    { heure: '18:00', emission: 'Zoom Écologie', type: 'Programme Environnement', presenter: 'Emma', program_type: 'Programme Environnement' },
                    { heure: '20:00', emission: 'Face à Face', type: 'Programme Débats', presenter: 'Divers intervenants', program_type: 'Programme Débats' }
                ],
                'Jeudi': [
                    { heure: '18:00', emission: 'Travailler à Mada', type: 'Programme Économie & Travail', presenter: 'M. Randria', program_type: 'Programme Économie & Travail' },
                    { heure: '19:00', emission: 'À Cœur Ouvert', type: 'Programme Humain & Sociétal', presenter: 'Claire', program_type: 'Programme Humain & Sociétal' }
                ],
                'Vendredi': [
                    { heure: '17:00', emission: 'La Question des Jeunes', type: 'Programme Jeunesse', presenter: 'Étudiants ambassadeurs', program_type: 'Programme Jeunesse' },
                    { heure: '19:00', emission: 'Culture & Identité', type: 'Programme Culture & Identité', presenter: 'Léa & Jules', program_type: 'Programme Culture & Identité' }
                ],
                'Samedi': [
                    { heure: '17:00', emission: 'Telex Sports', type: 'Programme Sport', presenter: 'Marc & Sophie', program_type: 'Programme Sport' }
                ]
            };
            
            // Trouver le programme correspondant
            const dayPrograms = defaultPrograms[jour];
            const program = dayPrograms ? dayPrograms.find(p => p.heure === heure) : null;
            
            if (program) {
                const result = await dbRun(
                    `INSERT INTO programs (title, description, presenter, schedule_time, program_type, duration, program_date, broadcast_type, is_active, image_url, video_url, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                    [
                        program.emission,
                        `Programme ${program.type}`,
                        program.presenter,
                        program.heure,
                        program.program_type,
                        '30 min',
                        new Date().toISOString().split('T')[0], // Date du jour
                        'scheduled',
                        1,
                        '/images/programmes.png',
                        null,
                        new Date().toISOString().split('T')[0]
                    ]
                );
                
                return res.json({ 
                    success: true, 
                    message: 'Programme ajouté avec succès',
                    programId: result.lastID
                });
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Aucun programme trouvé pour ce jour et cette heure' 
                });
            }
        }
        
        // Validation des champs obligatoires pour l'ajout manuel
        if (!title || !schedule_time || !program_date || !program_type || !broadcast_type) {
            return res.status(400).json({ 
                success: false, 
                message: 'Les champs titre, heure, date, type et type de diffusion sont obligatoires' 
            });
        }
        
        // Validation du type de diffusion
        if (!['scheduled', 'replay', 'announcement'].includes(broadcast_type)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Type de diffusion invalide' 
            });
        }
        
        // Validation des champs pour les programmes planifiés
        if (broadcast_type === 'scheduled') {
            if (!program_date || !schedule_time) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'La date et l\'heure sont obligatoires pour un programme planifié' 
                });
            }
        }
        
        // Insérer dans la base de données
        const result = await dbRun(
            `INSERT INTO programs (title, description, presenter, schedule_time, program_type, duration, program_date, broadcast_type, is_active, image_url, video_url, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
                title.trim(),
                description?.trim() || null,
                presenter?.trim() || 'TELEX',
                schedule_time.trim(),
                program_type.trim(),
                duration?.trim() || '30 min',
                program_date.trim(),
                broadcast_type,
                is_active === 'true' ? 1 : 0,
                image_url?.trim() || null,
                video_url?.trim() || null
            ]
        );
        
        res.json({ 
            success: true, 
            message: 'Programme ajouté avec succès',
            programId: result.lastID
        });
    } catch (error) {
        console.error('Erreur ajout programme schedule:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Route pour la page publique du Baume de la Foi
router.get('/baume-de-la-foi-public', async (req, res) => {
    try {
        // Récupérer les prières publiques
        const prieres = await dbAll(`
            SELECT id, title, content, category, reference_biblique, author, created_at, views, video_url
            FROM baume_prieres 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 6
        `);

        // Récupérer les témoignages approuvés
        const temoignages = await dbAll(`
            SELECT id, author_name, content, created_at
            FROM baume_temoignages 
            WHERE is_approved = 1 
            ORDER BY created_at DESC 
            LIMIT 6
        `);

        // Récupérer les réflexions publiques
        const reflexions = await dbAll(`
            SELECT id, title, content, theme, author, created_at, views, video_url
            FROM baume_reflexions 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT 6
        `);

        res.render('pages/baume-de-la-foi', {
            page: 'baume-de-la-foi',
            prieres,
            temoignages,
            reflexions
        });
    } catch (error) {
        console.error('Erreur page Baume de la Foi publique:', error);
        res.status(500).send('Erreur serveur');
    }
});

// ========== ABOUT ==========
router.get('/about', requireAuth, async (req, res) => {
    try {
        console.log('🔍 === DEBUG ROUTE /ADMIN/ABOUT ===');
        console.log('🔍 Session user:', !!req.session.user);
        
        // Étape 1: Vérifier si la table about existe
        const tableExists = await dbGet(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='about'
        `);
        console.log('📋 Table about existe:', !!tableExists);
        
        if (!tableExists) {
            console.log('❌ Table about n\'existe pas');
            return res.status(500).send(`
                <div style="padding: 20px; font-family: Arial; max-width: 600px; margin: 50px auto;">
                    <h1 style="color: #dc3545;">❌ Erreur critique</h1>
                    <p><strong>La table 'about' n'existe pas dans la base de données.</strong></p>
                    <p><strong>Solution:</strong> Redémarrez le serveur pour créer la table.</p>
                    <a href="/admin/dashboard" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">← Retour au dashboard</a>
                </div>
            `);
        }
        
        // Étape 2: Compter les entrées
        const countResult = await dbGet('SELECT COUNT(*) as count FROM about');
        console.log('📊 Nombre d\'entrées dans about:', countResult.count);
        
        // Étape 3: Récupérer les données
        const aboutData = await dbGet(
            'SELECT * FROM about ORDER BY id DESC LIMIT 1'
        );
        
        console.log('📊 Données brutes reçues:', aboutData);
        console.log('📊 Type de aboutData:', typeof aboutData);
        console.log('📊 aboutData est null:', aboutData === null);
        
        if (aboutData) {
            console.log('📊 Clés disponibles:', Object.keys(aboutData));
        }
        
        // Étape 4: Vérifier les colonnes
        const columns = await dbAll('PRAGMA table_info(about)');
        const columnNames = columns.map(col => col.name);
        console.log('🏗️ Colonnes de la table:', columnNames.length, 'colonnes');
        
        // Colonnes attendues
        const expectedColumns = [
            'hero_title', 'hero_subtitle', 'hero_intro', 'hero_image',
            'history_title', 'history_paragraph1', 'history_paragraph2',
            'team_title', 'team_intro',
            'team_redaction_title', 'team_redaction_count', 'team_redaction_image', 'team_redaction_description', 'team_redaction_skills',
            'team_technique_title', 'team_technique_count', 'team_technique_image', 'team_technique_description', 'team_technique_skills',
            'team_postproduction_title', 'team_postproduction_count', 'team_postproduction_image', 'team_postproduction_description', 'team_postproduction_skills',
            'team_communication_title', 'team_communication_count', 'team_communication_image', 'team_communication_description', 'team_communication_skills',
            'stats_title', 'stats_members_count', 'stats_hours_count', 'stats_views_count', 'stats_programs_count'
        ];
        
        const missingColumns = expectedColumns.filter(col => !columnNames.includes(col));
        if (missingColumns.length > 0) {
            console.log('❌ Colonnes manquantes:', missingColumns);
            return res.status(500).send(`
                <div style="padding: 20px; font-family: Arial; max-width: 600px; margin: 50px auto;">
                    <h1 style="color: #dc3545;">❌ Colonnes manquantes</h1>
                    <p><strong>Colonnes manquantes:</strong> ${missingColumns.join(', ')}</p>
                    <a href="/admin/dashboard" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">← Retour au dashboard</a>
                </div>
            `);
        }
        
        // Afficher un résumé du debug dans l'interface
        const debugInfo = `
            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 15px; margin: 20px 0; font-family: monospace; font-size: 12px;">
                <h4 style="margin: 0 0 10px 0; color: #495057;">🔍 DEBUG INFO - /admin/about</h4>
                <div style="display: grid; grid-template-columns: 200px 1fr; gap: 5px;">
                    <strong>Table exists:</strong> <span style="color: ${!!tableExists ? '#28a745' : '#dc3545'}">${!!tableExists ? '✅ YES' : '❌ NO'}</span>
                    <strong>Entries count:</strong> <span style="color: #007bff">${countResult.count}</span>
                    <strong>Data type:</strong> <span style="color: #007bff">${typeof aboutData}</span>
                    <strong>Keys count:</strong> <span style="color: #007bff">${aboutData ? Object.keys(aboutData).length : 0}</span>
                    <strong>Columns count:</strong> <span style="color: #007bff">${columnNames.length}</span>
                    <strong>Missing columns:</strong> <span style="color: ${missingColumns.length > 0 ? '#dc3545' : '#28a745'}">${missingColumns.length}</span>
                </div>
                ${missingColumns.length > 0 ? `<div style="margin-top: 10px; padding: 10px; background: #f8d7da; border-radius: 3px;"><strong>Missing:</strong> ${missingColumns.join(', ')}</div>` : ''}
            </div>
        `;
        
        // Si aucune donnée, utiliser les valeurs par défaut
        const defaultData = {
            hero_title: 'À propos de Telex',
            hero_subtitle: 'Découvrez notre histoire, notre équipe et notre vision',
            hero_intro: 'Fondée par des étudiants passionnés, Telex est bien plus qu\'une télévision étudiante. C\'est un laboratoire d\'innovation, une école de talents et un média numérique pour la jeunesse engagée.',
            hero_image: '/images/camera.png',
            history_title: 'Notre Histoire',
            history_paragraph1: 'Telex est né en 2024 de la passion commune d\'un groupe d\'étudiants déterminés à créer une télévision étudiante et un média numérique à leur image : innovants, indépendants et engagés. En partant d\'un simple projet d\'association, nous avons construit pas à pas une véritable chaîne de télévision étudiante reconnue aujourd\'hui comme la référence en matière d\'audiovisuel étudiant.',
            history_paragraph2: 'Notre aventure a commencé avec une petite équipe de 10 passionnés et un studio improvisé. Aujourd\'hui, nous comptons plus de 50 membres actifs, un studio professionnel et une audience grandissante. Chaque jour, nous repoussons les limites de la créativité étudiante pour offrir des contenus de qualité.',
            team_title: 'Notre Équipe',
            team_intro: 'Notre force réside dans la diversité de nos profils. Journalistes, techniciens, monteurs, graphistes, communicants - tous étudiants et tous animés par la même passion pour l\'audiovisuel. Chaque membre contribue avec ses compétences uniques pour créer des contenus exceptionnels.',
            team_redaction_title: 'Rédaction',
            team_redaction_count: '2 journalistes et reporters',
            team_redaction_image: '/images/TELEX INTEGRATION.png',
            team_redaction_description: 'Notre équipe éditoriale travaille sur l\'écriture, les reportages et la vérification des informations.',
            team_redaction_skills: 'Journalisme, Reportage, Édition',
            team_technique_title: 'Technique',
            team_technique_count: '2 techniciens audiovisuels',
            team_technique_image: '/images/femme telex.png',
            team_technique_description: 'Spécialistes de la prise de vue, du son et de l\'éclairage pour une production de qualité professionnelle.',
            team_technique_skills: 'Caméra, Son, Éclairage',
            team_postproduction_title: 'Post-production',
            team_postproduction_count: '3 monteurs vidéo',
            team_postproduction_image: '/images/ordi_telex.png',
            team_postproduction_description: 'Experts en montage, étalonnage et effets spéciaux pour donner vie à nos contenus audiovisuels.',
            team_postproduction_skills: 'Montage, Étalonnage, Motion Design',
            team_communication_title: 'Communication',
            team_communication_count: '1 chargés de communication',
            team_communication_image: '/images/Présentation du Telex.png',
            team_communication_description: 'Gestion des réseaux sociaux, relations presse et stratégie de diffusion pour maximiser notre audience.',
            team_communication_skills: 'Réseaux sociaux, Stratégie, Community',
            stats_title: 'Nos Chiffres',
            stats_members_count: '50+',
            stats_hours_count: '200+',
            stats_views_count: '15K+',
            stats_programs_count: '4'
        };
        
        // Utiliser les données de la base ou les valeurs par défaut
        const data = aboutData ? aboutData : defaultData;
        
        // S'assurer que toutes les clés nécessaires existent
        const safeData = {
            hero_title: data.hero_title || defaultData.hero_title,
            hero_subtitle: data.hero_subtitle || defaultData.hero_subtitle,
            hero_intro: data.hero_intro || defaultData.hero_intro,
            hero_image: data.hero_image || defaultData.hero_image,
            history_title: data.history_title || defaultData.history_title,
            history_paragraph1: data.history_paragraph1 || defaultData.history_paragraph1,
            history_paragraph2: data.history_paragraph2 || defaultData.history_paragraph2,
            team_title: data.team_title || defaultData.team_title,
            team_intro: data.team_intro || defaultData.team_intro,
            team_redaction_title: data.team_redaction_title || defaultData.team_redaction_title,
            team_redaction_count: data.team_redaction_count || defaultData.team_redaction_count,
            team_redaction_image: data.team_redaction_image || defaultData.team_redaction_image,
            team_redaction_description: data.team_redaction_description || defaultData.team_redaction_description,
            team_redaction_skills: data.team_redaction_skills || defaultData.team_redaction_skills,
            team_technique_title: data.team_technique_title || defaultData.team_technique_title,
            team_technique_count: data.team_technique_count || defaultData.team_technique_count,
            team_technique_image: data.team_technique_image || defaultData.team_technique_image,
            team_technique_description: data.team_technique_description || defaultData.team_technique_description,
            team_technique_skills: data.team_technique_skills || defaultData.team_technique_skills,
            team_postproduction_title: data.team_postproduction_title || defaultData.team_postproduction_title,
            team_postproduction_count: data.team_postproduction_count || defaultData.team_postproduction_count,
            team_postproduction_image: data.team_postproduction_image || defaultData.team_postproduction_image,
            team_postproduction_description: data.team_postproduction_description || defaultData.team_postproduction_description,
            team_postproduction_skills: data.team_postproduction_skills || defaultData.team_postproduction_skills,
            team_communication_title: data.team_communication_title || defaultData.team_communication_title,
            team_communication_count: data.team_communication_count || defaultData.team_communication_count,
            team_communication_image: data.team_communication_image || defaultData.team_communication_image,
            team_communication_description: data.team_communication_description || defaultData.team_communication_description,
            team_communication_skills: data.team_communication_skills || defaultData.team_communication_skills,
            stats_title: data.stats_title || defaultData.stats_title,
            stats_members_count: data.stats_members_count || defaultData.stats_members_count,
            stats_hours_count: data.stats_hours_count || defaultData.stats_hours_count,
            stats_views_count: data.stats_views_count || defaultData.stats_views_count,
            stats_programs_count: data.stats_programs_count || defaultData.stats_programs_count
        };
        
        console.log('📊 Données About récupérées:', safeData);
        console.log('✅ === FIN DEBUG - TOUT EST OK ===');
        
        // Rendre la page avec le debug info en haut
        res.render('admin/about-admin', {
            title: 'Admin - À Propos | TELEX',
            page: 'admin-about',
            user: req.session.user,
            about: safeData,
            debugInfo: debugInfo
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération données about:', error);
        res.status(500).send(`
            <div style="padding: 20px; font-family: Arial; max-width: 600px; margin: 50px auto;">
                <h1 style="color: #dc3545;">❌ Erreur serveur</h1>
                <p><strong>Message:</strong> ${error.message}</p>
                <pre style="background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto;">${error.stack}</pre>
                <a href="/admin/dashboard" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">← Retour au dashboard</a>
            </div>
        `);
    }
});

module.exports = router;
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'programs');
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

const programsUpload = multer({
    storage: programsStorage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB (augmenté de 50MB)
    fileFilter: function (req, file, cb) {
        const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

        if (allowedImageMimes.includes(file.mimetype) || allowedVideoMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images (JPEG, JPG, PNG, GIF, WebP) et vidéos (MP4, WebM, OGG) sont autorisées'));
        }
    }
});

// Configuration de Multer pour les news
const newsStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadDir;
        if (file.mimetype.startsWith('image/')) {
            uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'news');
        } else if (file.mimetype.startsWith('video/')) {
            uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'videos');
        }

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

const newsUpload = multer({
    storage: newsStorage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB (augmenté de 50MB)
    fileFilter: function (req, file, cb) {
        const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

        if (allowedImageMimes.includes(file.mimetype) || allowedVideoMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images (JPEG, JPG, PNG, GIF, WebP) et vidéos (MP4, WebM, OGG) sont autorisées'));
        }
    }
});

// Configuration de Multer pour la gallery
const galleryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'gallery');
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

const galleryUpload = multer({
    storage: galleryStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (augmenté de 5MB)
    fileFilter: function (req, file, cb) {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images (JPEG, JPG, PNG, GIF, WebP) sont autorisées'));
        }
    }
});

// Configuration de Multer pour les vidéos du Baume de la Foi
const baumeStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadDir;
        if (file.mimetype.startsWith('image/')) {
            uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'baume', 'images');
        } else if (file.mimetype.startsWith('video/')) {
            uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'baume', 'videos');
        }

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
        const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

        if (allowedImageMimes.includes(file.mimetype) || allowedVideoMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Seules les images (JPEG, JPG, PNG, GIF, WebP) et vidéos (MP4, WebM, OGG) sont autorisées'));
        }
    }
});

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

// Middleware d'authentification pour les routes API (renvoie du JSON)
function requireAuthApi(req, res, next) {
    // Vérifier si la session et l'utilisateur existent
    if (!req.session || !req.session.user || !req.session.user.loggedIn) {
        console.log('⚠️  [API Middleware] Utilisateur non connecté');
        return res.status(401).json({ success: false, error: 'Non authentifié' });
    }

    // Vérifier si l'utilisateur a le rôle admin (ou superadmin)
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin') {
        console.log('⚠️  [API Middleware] Rôle insuffisant:', req.session.user.role);
        return res.status(403).json({ success: false, error: 'Accès non autorisé' });
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

// ========== ROUTE RACINE ADMIN ==========
router.get('/', (req, res) => {
    console.log('🔑 Accès admin racine - redirection vers login');

    // Si déjà connecté, rediriger vers dashboard
    if (req.session && req.session.user && req.session.user.loggedIn) {
        console.log('🔑 Déjà connecté, redirection vers dashboard');
        return res.redirect('/admin/dashboard');
    }

    // Sinon rediriger vers login
    res.redirect('/admin/login');
});

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
        if (username === 'tsialonina' && password === 'tsialonina1214') {

            const role = 'superadmin';

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
        // Statistiques existantes
        const stats = {
            totalNews: (await dbGet('SELECT COUNT(*) as count FROM news WHERE is_published = 1')).count || 0,
            totalPrograms: (await dbGet('SELECT COUNT(*) as count FROM programs WHERE is_active = 1')).count || 0,
            totalContacts: (await dbGet('SELECT COUNT(*) as count FROM contacts')).count || 0,
            totalGallery: (await dbGet('SELECT COUNT(*) as count FROM gallery')).count || 0
        };

        // Ajouter les statistiques de consentements cookies
        try {
            const consentStats = await dbGet(`
                SELECT COUNT(*) as count 
                FROM cookie_consents
            `);
            stats.cookieConsents = consentStats.count || 0;
        } catch (error) {
            // Si la table n'existe pas encore, afficher 0
            stats.cookieConsents = 0;
        }

        // Ajouter les statistiques des vues totales des actualités
        try {
            const newsViewsStats = await dbGet(`
                SELECT SUM(views) as totalViews 
                FROM news 
                WHERE views IS NOT NULL
            `);
            stats.totalNewsViews = newsViewsStats.totalViews || 0;
        } catch (error) {
            // En cas d'erreur, afficher 0
            stats.totalNewsViews = 0;
        }

        // Ajouter les statistiques des vues totales des programmes
        try {
            const programsViewsStats = await dbGet(`
                SELECT SUM(views) as totalViews 
                FROM programs 
                WHERE views IS NOT NULL
            `);
            stats.totalProgramsViews = programsViewsStats.totalViews || 0;
        } catch (error) {
            // En cas d'erreur, afficher 0
            stats.totalProgramsViews = 0;
        }

        // Ajouter les statistiques du Baume de la Foi
        try {
            // Compter les prières publiées
            const prieresCount = await dbGet('SELECT COUNT(*) as count FROM baume_prieres WHERE is_published = 1');
            stats.baumePrieres = prieresCount.count || 0;
            
            // Compter les réflexions publiées
            const reflexionsCount = await dbGet('SELECT COUNT(*) as count FROM baume_reflexions WHERE is_published = 1');
            stats.baumeReflexions = reflexionsCount.count || 0;
            
            // Compter les témoignages approuvés
            const temoignagesCount = await dbGet('SELECT COUNT(*) as count FROM baume_temoignages WHERE is_approved = 1');
            stats.baumeTemoignages = temoignagesCount.count || 0;
            
            // Calculer le total des contenus Baume
            stats.baumeTotalCount = stats.baumePrieres + stats.baumeReflexions + stats.baumeTemoignages;
            
            // Calculer les vues totales (prières + réflexions)
            const baumeViewsStats = await dbGet(`
                SELECT 
                    (SELECT SUM(views) FROM baume_prieres WHERE views IS NOT NULL) +
                    (SELECT SUM(views) FROM baume_reflexions WHERE views IS NOT NULL) as totalViews
            `);
            stats.baumeTotalViews = baumeViewsStats.totalViews || 0;
        } catch (error) {
            // En cas d'erreur, afficher 0
            stats.baumePrieres = 0;
            stats.baumeReflexions = 0;
            stats.baumeTemoignages = 0;
            stats.baumeTotalCount = 0;
            stats.baumeTotalViews = 0;
        }

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
                totalGallery: 0,
                cookieConsents: 0,
                totalNewsViews: 0,
                totalProgramsViews: 0,
                baumePrieres: 0,
                baumeReflexions: 0,
                baumeTemoignages: 0,
                baumeTotalCount: 0,
                baumeTotalViews: 0
            }
        });
    }
});

// ========== NEWS ==========

router.get('/news', requireAuth, async (req, res) => {
    try {
        const newsData = await dbAll('SELECT * FROM news ORDER BY created_at DESC');
        res.render('admin/news', {
            title: 'Gestion des actualités - TELEX',
            user: req.session.user,
            news: newsData || []
        });
    } catch (error) {
        console.error('Erreur chargement actualités:', error);
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
        console.error('Erreur édition:', error);
        req.flash('error', 'Erreur lors du chargement de l\'actualité');
        res.redirect('/admin/news');
    }
});

router.post('/news/save', requireAuth, newsUpload.fields([{ name: 'image_file', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res) => {
    try {
        const { id, title, excerpt, content, author, category, image_url, video_url, is_published, remove_image, remove_video, media_type } = req.body;

        if (!title || !content) {
            req.flash('error', 'Le titre et le contenu sont obligatoires');
            return res.redirect(id ? `/admin/news/edit/${id}` : '/admin/news/new');
        }

        // Générer un slug à partir du titre
        function createSlug(title) {
            return title
                .toLowerCase()
                .trim()
                .replace(/[àáâãäå]/g, 'a')
                .replace(/[èéêë]/g, 'e')
                .replace(/[ìíîï]/g, 'i')
                .replace(/[òóôõö]/g, 'o')
                .replace(/[ùúûü]/g, 'u')
                .replace(/[ýÿ]/g, 'y')
                .replace(/[ç]/g, 'c')
                .replace(/[ñ]/g, 'n')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        }

        let slug = createSlug(title);
        
        // Vérifier si le slug existe déjà (pour éviter les doublons)
        if (!id) {
            // Pour une nouvelle actualité
            const existingSlug = await dbGet('SELECT id FROM news WHERE slug = ?', [slug]);
            if (existingSlug) {
                slug = `${slug}-${Date.now()}`; // Ajouter timestamp pour éviter les doublons
            }
        } else {
            // Pour une édition, vérifier si le slug est utilisé par une autre actualité
            const existingSlug = await dbGet('SELECT id FROM news WHERE slug = ? AND id != ?', [slug, id]);
            if (existingSlug) {
                slug = `${slug}-${id}`; // Ajouter l'ID pour éviter les doublons
            }
        }

        let finalImageUrl = null;
        let finalVideoUrl = null;

        // RÈGLE : Si c'est une édition, récupérer d'abord les médias existants
        if (id) {
            const currentNews = await dbGet('SELECT image_url, video_url FROM news WHERE id = ?', [id]);
            if (currentNews) {
                finalImageUrl = currentNews.image_url;
                finalVideoUrl = currentNews.video_url;
                console.log('🔍 DEBUG: Médias existants - Image:', finalImageUrl, 'Vidéo:', finalVideoUrl);
            }
        }

        // RÈGLE : Supprimer uniquement si demandé explicitement
        if (remove_image === '1') {
            console.log('🔍 DEBUG: Suppression explicite de l\'image demandée');
            if (finalImageUrl && finalImageUrl.includes('/uploads/news/')) {
                const filename = path.basename(finalImageUrl);
                const filePath = path.join(__dirname, '..', 'public', 'uploads', 'news', filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('🔍 DEBUG: Fichier image supprimé:', filename);
                }
            }
            finalImageUrl = null;
        }

        if (remove_video === '1') {
            console.log('🔍 DEBUG: Suppression explicite de la vidéo demandée');
            if (finalVideoUrl && finalVideoUrl.includes('/uploads/videos/')) {
                const filename = path.basename(finalVideoUrl);
                const filePath = path.join(__dirname, '..', 'public', 'uploads', 'videos', filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('🔍 DEBUG: Fichier vidéo supprimé:', filename);
                }
            }
            finalVideoUrl = null;
        }

        // RÈGLE : Nouveau fichier uploaded = remplacer l'ancien
        if (req.files && req.files.image_file && req.files.image_file[0]) {
            console.log('🔍 DEBUG: Nouvelle image uploadée');
            finalImageUrl = `/uploads/news/${req.files.image_file[0].filename}`;
        }

        if (req.files && req.files.video_file && req.files.video_file[0]) {
            console.log('🔍 DEBUG: Nouvelle vidéo uploadée');
            finalVideoUrl = `/uploads/videos/${req.files.video_file[0].filename}`;
        }

        // RÈGLE : URL externe (si fournie) = remplacer
        if (image_url && image_url.trim() !== '') {
            console.log('🔍 DEBUG: URL image externe fournie');
            finalImageUrl = image_url.trim();
        }

        if (video_url && video_url.trim() !== '') {
            console.log('🔍 DEBUG: URL vidéo externe fournie');
            finalVideoUrl = video_url.trim();
        }

        console.log('🔍 DEBUG: Résultat final - Image:', finalImageUrl, 'Vidéo:', finalVideoUrl);

        if (id) {
            await dbRun(
                `UPDATE news SET 
                 title = ?, excerpt = ?, content = ?, author = ?, 
                 category = ?, image_url = ?, video_url = ?, is_published = ?, 
                 slug = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [title.trim(),
                excerpt?.trim() || '',
                content.trim(),
                author || 'TELEX',
                category || 'Actualité',
                finalImageUrl,
                finalVideoUrl,
                is_published ? 1 : 0,
                slug,
                id]
            );
            req.flash('success', 'Actualité mise à jour avec succès');
        } else {
            await dbRun(
                `INSERT INTO news (title, excerpt, content, author, category, image_url, video_url, is_published, slug) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title.trim(),
                excerpt?.trim() || '',
                content.trim(),
                author?.trim() || 'TELEX',
                category?.trim() || 'politique',
                    finalImageUrl,
                    finalVideoUrl,
                is_published ? 1 : 0,
                slug]
            );
            req.flash('success', 'Actualité créée avec succès');
        }

        res.redirect('/admin/news');
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        req.flash('error', 'Erreur lors de la sauvegarde: ' + error.message);
        res.redirect('/admin/news');
    }
});

// Route d'auto-sauvegarde pour les actualités
router.post('/news/autosave', requireAuth, newsUpload.fields([{ name: 'image_file', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res) => {
    try {
        const { id, title, excerpt, content, author, category, image_url, video_url, is_published, remove_image, remove_video, media_type } = req.body;

        // Validation minimale pour l'auto-sauvegarde
        if (!title || !content) {
            return res.json({ success: false, error: 'Titre et contenu requis' });
        }

        let finalImageUrl = null;
        let finalVideoUrl = null;

        // Logique de choix exclusif entre image et vidéo (similaire à la route principale)
        if (media_type === 'image') {
            finalVideoUrl = null;
            if (req.files && req.files.image_file && req.files.image_file[0]) {
                finalImageUrl = `/uploads/news/${req.files.image_file[0].filename}`;
            } else if (image_url && image_url.trim() !== '') {
                finalImageUrl = image_url.trim();
            }
        } else if (media_type === 'video') {
            finalImageUrl = null;
            if (req.files && req.files.video_file && req.files.video_file[0]) {
                finalVideoUrl = `/uploads/videos/${req.files.video_file[0].filename}`;
            } else if (video_url && video_url.trim() !== '') {
                finalVideoUrl = video_url.trim();
            }
        }

        // Gestion des suppressions
        if (remove_image === '1') {
            finalImageUrl = null;
        }
        if (remove_video === '1') {
            finalVideoUrl = null;
        }

        if (id) {
            // Mise à jour d'une actualité existante
            await dbRun(
                `UPDATE news SET 
                 title = ?, excerpt = ?, content = ?, author = ?, 
                 category = ?, image_url = ?, video_url = ?, is_published = ?, 
                 updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [title.trim(),
                excerpt?.trim() || '',
                content.trim(),
                author?.trim() || 'TELEX',
                category?.trim() || 'politique',
                finalImageUrl,
                finalVideoUrl,
                is_published ? 1 : 0,
                id]
            );
        } else {
            // Création d'une nouvelle actualité (brouillon)
            const result = await dbRun(
                `INSERT INTO news (title, excerpt, content, author, category, image_url, video_url, is_published, slug) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title.trim(),
                excerpt?.trim() || '',
                content.trim(),
                author?.trim() || 'TELEX',
                category?.trim() || 'politique',
                finalImageUrl,
                finalVideoUrl,
                is_published ? 1 : 0,
                slug]
            );
            id = result.id;
        }

        res.json({ 
            success: true, 
            message: 'Brouillon sauvegardé',
            id: id
        });

    } catch (error) {
        console.error('Erreur auto-sauvegarde:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de l\'auto-sauvegarde' 
        });
    }
});

router.get('/news/delete/:id', requireAuth, async (req, res) => {
    try {
        const newsId = req.params.id;
        const newsItem = await dbGet('SELECT title, image_url, video_url FROM news WHERE id = ?', [newsId]);

        if (!newsItem) {
            req.flash('error', 'Actualité non trouvée');
            return res.redirect('/admin/news');
        }

        // Supprimer l'image si elle existe
        if (newsItem.image_url && newsItem.image_url.includes('/uploads/news/')) {
            const filename = path.basename(newsItem.image_url);
            const filePath = path.join(__dirname, '..', 'public', 'uploads', 'news', filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Supprimer la vidéo si elle existe
        if (newsItem.video_url && newsItem.video_url.includes('/uploads/videos/')) {
            const filename = path.basename(newsItem.video_url);
            const filePath = path.join(__dirname, '..', 'public', 'uploads', 'videos', filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await dbRun('DELETE FROM news WHERE id = ?', [newsId]);

        req.flash('success', `Actualité "${newsItem.title}" supprimée avec succès`);
        res.redirect('/admin/news');
    } catch (error) {
        console.error('Erreur suppression:', error);
        req.flash('error', 'Erreur lors de la suppression de l\'actualité');
        res.redirect('/admin/news');
    }
});

// ========== PROGRAMS ==========
router.get('/programs', requireAuth, async (req, res) => {
    try {
        // Récupérer uniquement les programmes non-planifiés (articles)
        const programs = await dbAll(`
            SELECT id, title, description, presenter, program_type, video_url, image_url, 
                   is_active, created_at, updated_at, broadcast_type, program_date, schedule_time,
                   views, total_views
            FROM programs 
            WHERE broadcast_type != 'scheduled' OR broadcast_type IS NULL 
            ORDER BY created_at DESC
        `);
        
        // Calculer les statistiques pour la page programmes
        const stats = {
            totalProgramsViews: 0
        };
        try {
            const programsViewsStats = await dbGet(`
                SELECT SUM(views) as totalViews 
                FROM programs 
                WHERE views IS NOT NULL
            `);
            stats.totalProgramsViews = programsViewsStats.totalViews || 0;
        } catch (error) {
            stats.totalProgramsViews = 0;
        }
        
        res.render('admin/programs', {
            title: 'Programmes - TELEX',
            user: req.session.user,
            programs: programs || [],
            stats: stats
        });
    } catch (error) {
        console.error('Erreur programmes:', error);
        res.render('admin/programs', {
            title: 'Programmes - TELEX',
            user: req.session.user,
            programs: [],
            stats: { totalProgramsViews: 0 }
        });
    }
});

// Route pour afficher le formulaire de création de programme
router.get('/programs/new', requireAuth, (req, res) => {
    res.render('admin/programs_new', {
        title: 'Nouveau Programme - TELEX',
        user: req.session.user,
        success_msg: req.flash('success'),
        error_msg: req.flash('error')
    });
});

router.post('/programs/save', requireAuth, programsUpload.fields([{ name: 'image_file', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res) => {
    try {
        console.log('🔍 DEBUG programs/save - req.body:', req.body);
        console.log('🔍 DEBUG programs/save - req.files:', req.files);

        const { title, description, presenter, schedule_time, program_type, duration, program_date, broadcast_type, is_active, video_url } = req.body;

        console.log('🔍 DEBUG - Variables extraites:', { title, description, presenter, video_url, broadcast_type, is_active });

        // Validation basique
        if (!title || !description) {
            req.flash('error', 'Le titre et la description sont obligatoires');
            return res.redirect('/admin/programs/new');
        }

        // Validation du type de diffusion
        if (!broadcast_type || !['announcement', 'scheduled', 'replay'].includes(broadcast_type)) {
            req.flash('error', 'Le type de diffusion est obligatoire');
            return res.redirect('/admin/programs/new');
        }

        // Validation des champs obligatoires selon le type
        if (broadcast_type === 'scheduled' && (!program_date || !schedule_time)) {
            req.flash('error', 'La date et l\'heure sont obligatoires pour un programme planifié');
            return res.redirect('/admin/programs/new');
        }

        // Préparer les URLs des médias
        let finalImageUrl = '';
        let finalVideoUrl = video_url?.trim() || '';

        // Gérer les fichiers uploadés
        if (req.files && req.files.image_file && req.files.image_file.length > 0) {
            const imageFile = req.files.image_file[0];
            finalImageUrl = `/uploads/programs/${imageFile.filename}`;
            console.log('🔍 DEBUG - Image uploadée:', finalImageUrl);
        }

        if (req.files && req.files.video_file && req.files.video_file.length > 0) {
            const videoFile = req.files.video_file[0];
            finalVideoUrl = `/uploads/programs/${videoFile.filename}`;
            console.log('🔍 DEBUG - Vidéo uploadée:', finalVideoUrl);
        }

        console.log('🔍 DEBUG - URLs finales:', { finalImageUrl, finalVideoUrl });

        // Insérer dans la base de données
        const result = await dbRun(
            `INSERT INTO programs (title, description, presenter, schedule_time, program_type, duration, program_date, broadcast_type, is_active, image_url, video_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                description.trim(),
                presenter?.trim() || 'TELEX',
                schedule_time?.trim() || 'À déterminer',
                program_type?.trim() || 'Actualités',
                duration?.trim() || '30 min',
                program_date?.trim() || null,
                broadcast_type.trim(),
                is_active ? 1 : 0,
                finalImageUrl,
                finalVideoUrl
            ]
        );

        req.flash('success', `Programme "${title}" créé avec succès !`);
        res.redirect('/admin/programs');

    } catch (error) {
        console.error('❌ Erreur création programme:', error);
        res.redirect('/admin/programs/new');
    }
});

// Route pour afficher la page d'édition d'un programme
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
        return res.redirect('/admin/programs');
    }
});

// Route pour mettre à jour un programme
router.post('/programs/update/:id', requireAuth, programsUpload.fields([{ name: 'image_file', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res) => {
    try {
        const { title, description, presenter, schedule_time, program_type, duration, program_date, broadcast_type, is_active, image_url, video_url, media_type, remove_image, remove_video } = req.body;
        const id = req.params.id;

        // Fonction utilitaire pour éviter le crash sur trim()
        const safeTrim = (str) => (str && typeof str === 'string') ? str.trim() : '';
        const safeValue = (str) => (str && typeof str === 'string') ? str.trim() : str;

        // Validation basique
        if (!title || !description) {
            req.flash('error', 'Le titre et la description sont obligatoires');
            return res.redirect(`/admin/programs/edit/${id}`);
        }

        // Validation du type de diffusion
        if (!broadcast_type || !['announcement', 'scheduled', 'replay'].includes(broadcast_type)) {
            req.flash('error', 'Le type de diffusion est obligatoire');
            return res.redirect(`/admin/programs/edit/${id}`);
        }

        // Récupérer le programme actuel pour gérer les suppressions de fichiers
        const currentProgram = await dbGet('SELECT * FROM programs WHERE id = ?', [id]);
        if (!currentProgram) {
            req.flash('error', 'Programme non trouvé');
            return res.redirect('/admin/programs');
        }

        // Préparer les URLs des médias
        let finalImageUrl = safeTrim(image_url) || currentProgram.image_url;
        let finalVideoUrl = safeTrim(video_url) || currentProgram.video_url;

        // Si le formulaire renvoie une valeur vide explicite (ex: champ vidé ou masqué), on garde l'ancien sauf si remove flag est mis.
        // MAIS attention : le formulaire envoie image_url via input hidden populate avec l'ancienne valeur.
        // Donc safeTrim(image_url) est probablement l'ancienne valeur.

        // Logique de suppression de fichier physique
        const deleteFile = (filePathUrl) => {
            if (filePathUrl && filePathUrl.startsWith('/uploads/')) {
                const filename = path.basename(filePathUrl);
                // Déterminer le dossier parent en fonction du type (programs, news, etc) - ici c'est programs
                // Attention, programsUpload met tout dans public/uploads/programs
                const fullPath = path.join(__dirname, '..', 'public', 'uploads', 'programs', filename);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                        console.log(`Fichier supprimé : ${fullPath}`);
                    } catch (err) {
                        console.error(`Erreur suppression fichier ${fullPath}:`, err);
                    }
                }
            }
        };

        // Gérer les nouveaux uploads (prioritaires)
        if (req.files && req.files.image_file && req.files.image_file.length > 0) {
            // Supprimer l'ancienne image si elle existe
            if (currentProgram.image_url) deleteFile(currentProgram.image_url);

            const imageFile = req.files.image_file[0];
            finalImageUrl = `/uploads/programs/${imageFile.filename}`;
            // Si on upload une image, on s'assure que remove_image n'est pas pris en compte pour annuler l'upload
        }

        if (req.files && req.files.video_file && req.files.video_file.length > 0) {
            // Supprimer l'ancienne vidéo si elle existe
            if (currentProgram.video_url) deleteFile(currentProgram.video_url);

            const videoFile = req.files.video_file[0];
            finalVideoUrl = `/uploads/programs/${videoFile.filename}`;
        }

        // Gérer les suppressions explicites (flags du frontend)
        if (remove_image === '1' && (!req.files || !req.files.image_file)) {
            if (currentProgram.image_url) deleteFile(currentProgram.image_url);
            finalImageUrl = null;
        }

        if (remove_video === '1' && (!req.files || !req.files.video_file)) {
            if (currentProgram.video_url) deleteFile(currentProgram.video_url);
            finalVideoUrl = null;
        }

        // Gestion de l'exclusivité via media_type (si utilisé)
        // Le frontend envoie media_type = 'image' ou 'video'
        if (media_type === 'image') {
            // Si mode image, on s'assure que la vidéo est nulle (si c'est la volonté du design)
            // MAIS attention, si l'utilisateur veut juste changer l'image sans toucher à la vidéo (si le design permet les deux),
            // il ne faut pas supprimer la vidéo.
            // Vu le design avec radio buttons "Image" OU "Vidéo", c'est exclusif.
            // Donc si on passe en mode image, on supprime la vidéo existante.
            if (finalVideoUrl) {
                deleteFile(finalVideoUrl);
                finalVideoUrl = null;
            }
        } else if (media_type === 'video') {
            // Si mode vidéo, on supprime l'image
            if (finalImageUrl) {
                deleteFile(finalImageUrl);
                finalImageUrl = null;
            }
        }

        // Pour la vidéo par URL (champ texte), si modifié :
        if (!req.files?.video_file && video_url && video_url.trim() !== currentProgram.video_url) {
            // Si l'utilisateur a changé l'URL manuellement et qu'il y avait un fichier avant, on supprime le fichier
            if (currentProgram.video_url && currentProgram.video_url.startsWith('/uploads/')) {
                deleteFile(currentProgram.video_url);
            }
            finalVideoUrl = video_url.trim();
        }

        // Mettre à jour dans la base de données
        await dbRun(
            `UPDATE programs SET 
             title = ?, description = ?, presenter = ?, schedule_time = ?, 
             program_type = ?, duration = ?, program_date = ?, broadcast_type = ?, is_active = ?, image_url = ?, video_url = ? 
             WHERE id = ?`,
            [
                safeTrim(title),
                safeTrim(description),
                safeTrim(presenter) || 'TELEX',
                safeTrim(schedule_time) || 'À déterminer',
                safeTrim(program_type) || 'Actualités',
                safeTrim(duration) || '30 min',
                safeValue(program_date) || null,
                safeTrim(broadcast_type),
                is_active ? 1 : 0,
                finalImageUrl,
                finalVideoUrl,
                id
            ]
        );

        req.flash('success', `Programme "${safeTrim(title)}" mis à jour avec succès !`);
        res.redirect('/admin/programs');

    } catch (error) {
        console.error('❌ Erreur mise à jour programme:', error);
        req.flash('error', 'Erreur lors de la mise à jour du programme: ' + error.message);
        res.redirect(`/admin/programs/edit/${req.params.id}`);
    }
});

// Route pour supprimer un programme (GET pour matcher le lien frontend)
router.get('/programs/delete/:id', requireAuth, async (req, res) => {
    try {
        const programId = req.params.id;
        console.log('🗑️ [DELETE] Route de suppression appelée pour le programme ID:', programId);
        console.log('🗑️ [DELETE] Utilisateur connecté:', req.session.user);

        // Récupérer le programme pour avoir son titre
        const program = await dbGet('SELECT title FROM programs WHERE id = ?', [programId]);

        if (!program) {
            console.log('❌ [DELETE] Programme non trouvé:', programId);
            req.flash('error', 'Programme non trouvé');
            return res.redirect('/admin/programs');
        }

        console.log('✅ [DELETE] Programme trouvé:', program.title, '- Suppression en cours...');

        // Supprimer le programme
        await dbRun('DELETE FROM programs WHERE id = ?', [programId]);

        console.log('✅ [DELETE] Programme supprimé avec succès');
        req.flash('success', `Programme "${program.title}" supprimé avec succès`);
        res.redirect('/admin/programs');

    } catch (error) {
        console.error('❌ Erreur suppression programme:', error);
        req.flash('error', 'Erreur lors de la suppression du programme');
        res.redirect('/admin/programs');
    }
});

// Route pour nettoyer les programmes invalides (créés via la grille)
router.post('/programs/cleanup', requireAuth, async (req, res) => {
    try {
        // Supprimer tous les programmes avec show_on_public = 0 et sans description valide
        const result = await dbRun(`
            DELETE FROM programs 
            WHERE show_on_public = 0 
            AND (title LIKE '%L\'Essentiel%' 
                 OR title LIKE '%kjdfklsejkfsljk%'
                 OR title LIKE '%kghklfgjkclfjbhfkl%'
                 OR title LIKE '%kkkkk%'
                 OR title LIKE '%gggghg%'
                 OR title LIKE '%Tsy haiko%'
                 OR title LIKE '%c b;:c,b:l,%'
                 OR title LIKE '%Debas%'
                 OR LENGTH(title) < 3
                 OR title IS NULL
                 OR title = '')
        `);

        req.flash('success', `${result.changes} programmes invalides supprimés avec succès`);
        res.redirect('/admin/programs');

    } catch (error) {
        console.error('❌ Erreur nettoyage programmes:', error);
        req.flash('error', 'Erreur lors du nettoyage des programmes');
        res.redirect('/admin/programs');
    }
});

router.get('/contacts-improved', requireAuth, async (req, res) => {
    try {
        const contacts = await dbAll(`
            SELECT id, name, email, subject, message, 
                   created_at, is_read, newsletter,
                   ip_address
            FROM contacts 
            ORDER BY created_at DESC
        `);

        const unreadCount = contacts.filter(c => !c.is_read).length;
        const readCount = contacts.filter(c => c.is_read).length;

        res.render('admin/contacts-improved', {
            title: 'Messages de Contact - Administration TELEX',
            user: req.session.user,
            contacts: contacts || [],
            unreadCount: unreadCount,
            readCount: readCount,
            totalCount: contacts.length
        });
    } catch (error) {
        console.error('❌ Erreur chargement contacts améliorés:', error);
        res.render('admin/contacts-improved', {
            title: 'Messages de Contact - Administration TELEX',
            user: req.session.user,
            contacts: [],
            unreadCount: 0,
            readCount: 0,
            totalCount: 0
        });
    }
});

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

        res.render('admin/contacts-improved', {
            title: 'Messages de contact - TELEX',
            user: req.session.user,
            contacts: contacts || [],
            unreadCount: unreadCount,
            readCount: readCount,
            totalCount: contacts.length
        });
    } catch (error) {
        console.error('❌ Erreur chargement contacts:', error);
        res.render('admin/contacts-improved', {
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

router.post('/contacts/reply/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reply_message, reply_subject, include_original, full_message, send_directly } = req.body;
        
        console.log('📧 Sauvegarde de la réponse pour le contact:', id);
        
        // Vérifier que le contact existe
        const contact = await dbGet('SELECT * FROM contacts WHERE id = ?', [id]);
        if (!contact) {
            return res.status(404).json({ success: false, error: 'Contact non trouvé' });
        }
        
        // Insérer la réponse dans la base de données
        const result = await dbRun(`
            INSERT INTO contact_replies (contact_id, reply_message, reply_subject, include_original, full_message, sent_via_mailto)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, reply_message, reply_subject, include_original ? 1 : 0, full_message, send_directly ? 0 : 1]);
        
        console.log('✅ Réponse sauvegardée avec ID:', result.id);
        
        // Désactivé: fonctionnalité d'envoi d'email direct
        // Utilisation uniquement du fallback mailto
        console.log('📧 Utilisation du client email par défaut...');
        const mailtoLink = 'mailto:' + encodeURIComponent(contact.email) + 
                         '?subject=' + encodeURIComponent(reply_subject) + 
                         '&body=' + encodeURIComponent(full_message);
        
        console.log('🔗 Lien mailto généré:', mailtoLink);
        
        return res.json({ 
            success: true, 
            message: 'Réponse sauvegardée! Utilisez votre client email pour envoyer.',
            reply_id: result.id,
            mailto_link: mailtoLink,
            email_sent: false
        });
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde réponse:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/contacts/replies/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Récupérer toutes les réponses pour ce contact
        const replies = await dbAll(`
            SELECT * FROM contact_replies 
            WHERE contact_id = ? 
            ORDER BY created_at ASC
        `, [id]);
        
        res.json({ 
            success: true, 
            replies: replies
        });
        
    } catch (error) {
        console.error('❌ Erreur chargement réponses:', error);
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
            [...new Set(gallery.map(item => item.program_type))].length : 0;

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

// Route pour uploader des images dans la galerie
router.post('/gallery/upload', requireAuth, galleryUpload.array('images', 10), async (req, res) => {
    try {
        console.log('🔍 DEBUG gallery/upload - req.files:', req.files);
        console.log('🔍 DEBUG gallery/upload - req.body:', req.body);
        
        const { category, tags } = req.body;
        
        if (!req.files || req.files.length === 0) {
            req.flash('error', 'Veuillez sélectionner au moins une image');
            return res.redirect('/admin/gallery');
        }
        
        // Traiter chaque image uploadée
        const uploadPromises = req.files.map(async (file) => {
            try {
                // Insérer dans la base de données
                const result = await dbRun(
                    `INSERT INTO gallery (title, image_url, category, description, created_at) 
                     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [
                        file.originalname,
                        `/uploads/gallery/${file.filename}`,
                        category || 'autres',
                        tags || ''
                    ]
                );
                
                console.log('✅ Image uploadée:', file.originalname, 'ID:', result.id);
                return { success: true, filename: file.filename, id: result.id };
                
            } catch (error) {
                console.error('❌ Erreur upload image:', error);
                return { success: false, error: error.message };
            }
        });
        
        const results = await Promise.all(uploadPromises);
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        if (successful.length > 0) {
            req.flash('success', `${successful.length} image(s) uploadée(s) avec succès !`);
        }
        
        if (failed.length > 0) {
            req.flash('error', `${failed.length} image(s) n'ont pas pu être uploadée(s)`);
        }
        
        res.redirect('/admin/gallery');
        
    } catch (error) {
        console.error('❌ Erreur upload galerie:', error);
        req.flash('error', 'Erreur lors de l\'upload: ' + error.message);
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
            contact_phone_2, contact_phone_3,
            youtube_url, instagram_url, facebook_url, tiktok_url, twitter_url,
            footer_logo, footer_description, copyright_text
        } = req.body;

        const settings = {
            contact_email, contact_phone, contact_address,
            contact_phone_2, contact_phone_3,
            youtube_url, instagram_url, facebook_url, tiktok_url, twitter_url,
            footer_logo, footer_description, copyright_text
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

// ========== BAUME DE LA FOI ADMIN ==========

// Page d'administration du Baume de la Foi
router.get('/baume-de-la-foi', requireAuth, async (req, res) => {
    try {
        // Récupérer les statistiques
        const stats = await dbAll(`
            SELECT 
                (SELECT COUNT(*) FROM baume_prieres WHERE is_published = 1) as prieres_count,
                (SELECT COUNT(*) FROM baume_temoignages WHERE is_approved = 1) as temoignages_approuves,
                (SELECT COUNT(*) FROM baume_temoignages WHERE status = 'pending') as temoignages_en_attente,
                (SELECT COUNT(*) FROM baume_reflexions WHERE is_published = 1) as reflexions_count,
                (SELECT SUM(views) FROM baume_prieres) + (SELECT SUM(views) FROM baume_reflexions) as total_views
        `);

        // Récupérer l'activité récente
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

        // Récupérer les prières existantes
        const prieres = await dbAll(`
            SELECT id, title, content, category, created_at, is_published, video_url, views
            FROM baume_prieres 
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        // Récupérer les réflexions existantes
        const reflexions = await dbAll(`
            SELECT id, title, content, theme, created_at, is_published, image_url, video_url, media_type, views
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
            success_msg: null,
            error_msg: null
        });
    } catch (error) {
        console.error('❌ Erreur chargement admin Baume de la Foi:', error);
        res.redirect('/admin');
    }
});

// Sauvegarder une prière avec média (image ou vidéo)
router.post('/baume-de-la-foi/priere/save', requireAuth, baumeUpload.single('media_file'), async (req, res) => {
    try {
        const { title, content, category, reference_biblique, author, is_published } = req.body;

        if (!title || !content) {
            req.flash('error', 'Le titre et le contenu sont obligatoires');
            return res.redirect('/admin/baume-de-la-foi');
        }

        let mediaUrl = null;
        
        // Gérer l'upload du média (image ou vidéo)
        if (req.file) {
            const isImage = req.file.mimetype.startsWith('image/');
            const subfolder = isImage ? 'images' : 'videos';
            mediaUrl = `/uploads/baume/${subfolder}/${req.file.filename}`;
        }

        // Insérer la prière
        await dbRun(`
            INSERT INTO baume_prieres (title, content, category, reference_biblique, author, is_published, video_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            title.trim(),
            content.trim(),
            category || 'comfort',
            reference_biblique?.trim() || null,
            author?.trim() || 'Baume de la Foi',
            is_published ? 1 : 0,
            mediaUrl
        ]);

        req.flash('success', 'Prière créée avec succès');
        res.redirect('/admin/baume-de-la-foi');

    } catch (error) {
        console.error('❌ Erreur sauvegarde prière:', error);
        req.flash('error', 'Erreur lors de la sauvegarde de la prière');
        res.redirect('/admin/baume-de-la-foi');
    }
});

// Sauvegarder une réflexion avec média (image ou vidéo)
router.post('/baume-de-la-foi/reflexion/save', requireAuth, baumeUpload.single('media_file'), async (req, res) => {
    try {
        const { title, content, theme, publication_date, author, is_published } = req.body;

        if (!title || !content) {
            req.flash('error', 'Le titre et le contenu sont obligatoires');
            return res.redirect('/admin/baume-de-la-foi');
        }

        // Gérer l'upload du média (image ou vidéo)
        let imageUrl = null;
        let videoUrl = null;
        let mediaType = null;
        
        if (req.file) {
            const isImage = req.file.mimetype.startsWith('image/');
            const subfolder = isImage ? 'images' : 'videos';
            const mediaUrl = `/uploads/baume/${subfolder}/${req.file.filename}`;
            
            if (isImage) {
                imageUrl = mediaUrl;
                mediaType = 'image';
            } else {
                videoUrl = mediaUrl;
                mediaType = 'video';
            }
        }

        // Insérer la réflexion
        await dbRun(`
            INSERT INTO baume_reflexions (title, content, theme, publication_date, author, image_url, video_url, is_published, reference_biblique, media_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title.trim(),
            content.trim(),
            theme || 'faith',
            publication_date || new Date().toISOString().split('T')[0],
            author?.trim() || 'Baume de la Foi',
            imageUrl,
            videoUrl,
            is_published ? 1 : 0,
            null,
            mediaType
        ]);

        req.flash('success', 'Réflexion créée avec succès');
        res.redirect('/admin/baume-de-la-foi');

    } catch (error) {
        console.error('❌ Erreur sauvegarde réflexion:', error);
        req.flash('error', 'Erreur lors de la sauvegarde de la réflexion');
        res.redirect('/admin/baume-de-la-foi');
    }
});

// Supprimer une prière
router.post('/baume-de-la-foi/priere/delete/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Récupérer la prière pour supprimer la vidéo si nécessaire
        const priere = await dbGet('SELECT video_url FROM baume_prieres WHERE id = ?', [id]);
        
        if (priere && priere.video_url) {
            const videoPath = path.join(__dirname, '..', 'public', priere.video_url);
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
            }
        }

        // Supprimer la prière
        await dbRun('DELETE FROM baume_prieres WHERE id = ?', [id]);

        req.flash('success', 'Prière supprimée avec succès');
        res.redirect('/admin/baume-de-la-foi');

    } catch (error) {
        console.error('❌ Erreur suppression prière:', error);
        req.flash('error', 'Erreur lors de la suppression de la prière');
        res.redirect('/admin/baume-de-la-foi');
    }
});

// Supprimer une réflexion
router.post('/baume-de-la-foi/reflexion/delete/:id', requireAuthApi, async (req, res) => {
    try {
        const { id } = req.params;

        // Récupérer la réflexion pour supprimer les médias si nécessaire
        const reflexion = await dbGet('SELECT image_url, video_url FROM baume_reflexions WHERE id = ?', [id]);
        
        if (reflexion) {
            // Supprimer l'image si elle existe
            if (reflexion.image_url) {
                const imagePath = path.join(__dirname, '..', 'public', reflexion.image_url);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            
            // Supprimer la vidéo si elle existe
            if (reflexion.video_url) {
                const videoPath = path.join(__dirname, '..', 'public', reflexion.video_url);
                if (fs.existsSync(videoPath)) {
                    fs.unlinkSync(videoPath);
                }
            }
        }

        // Supprimer la réflexion
        await dbRun('DELETE FROM baume_reflexions WHERE id = ?', [id]);

        res.json({ success: true, message: 'Réflexion supprimée avec succès' });

    } catch (error) {
        console.error('❌ Erreur suppression réflexion:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la suppression de la réflexion' });
    }
});

// API pour les statistiques du Baume de la Foi
router.get('/baume-de-la-foi/stats', requireAuth, async (req, res) => {
    try {
        const stats = await dbAll(`
            SELECT 
                (SELECT COUNT(*) FROM baume_prieres WHERE is_published = 1) as prieres_count,
                (SELECT COUNT(*) FROM baume_temoignages WHERE is_approved = 1) as temoignages_approuves,
                (SELECT COUNT(*) FROM baume_temoignages WHERE status = 'pending') as temoignages_en_attente,
                (SELECT COUNT(*) FROM baume_reflexions WHERE is_published = 1) as reflexions_count,
                (SELECT SUM(views) FROM baume_prieres) + (SELECT SUM(views) FROM baume_reflexions) as total_views
        `);

        res.json({ 
            success: true, 
            data: stats[0] || {} 
        });
    } catch (error) {
        console.error('❌ Erreur stats Baume de la Foi:', error);
        res.status(500).json({ success: false, error: 'Erreur lors du chargement des statistiques' });
    }
});

// API pour incrémenter les vues
router.post('/api/baume/view/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        
        let table;
        if (type === 'priere') {
            table = 'baume_prieres';
        } else if (type === 'reflexion') {
            table = 'baume_reflexions';
        } else {
            return res.status(400).json({ success: false, error: 'Type invalide' });
        }
        
        await dbRun(`UPDATE ${table} SET views = views + 1 WHERE id = ?`, [id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erreur incrément vues:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour' });
    }
});

// ========== ROUTES POUR LES TÉMOIGNAGES (ADMIN) ==========

// GET - Récupérer tous les témoignages pour l'administration
router.get('/baume-de-la-foi/temoignages', requireAuth, async (req, res) => {
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

// GET - Récupérer un témoignage spécifique
router.get('/baume-de-la-foi/temoignage/:id', requireAuth, async (req, res) => {
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

// POST - Approuver ou rejeter un témoignage
router.post('/baume-de-la-foi/temoignage/:id/approve', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;

        await dbRun(`
            UPDATE baume_temoignages 
            SET is_approved = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [
            approved ? 1 : 0,
            approved ? 'approved' : 'rejected',
            id
        ]);

        res.json({ 
            success: true, 
            message: approved ? 'Témoignage approuvé avec succès' : 'Témoignage rejeté avec succès'
        });
    } catch (error) {
        console.error('❌ Erreur approbation témoignage:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour du témoignage' });
    }
});

// DELETE - Supprimer un témoignage
router.delete('/baume-de-la-foi/temoignage/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await dbRun('DELETE FROM baume_temoignages WHERE id = ?', [id]);

        res.json({ 
            success: true, 
            message: 'Témoignage supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du programme:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur lors de la suppression du programme' 
        });
    }
});

// ========== ROUTES API POUR LES OPÉRATIONS AJAX ==========

// GET - Récupérer tous les programmes
router.get('/schedule/api/programs', async (req, res) => {
    try {
        const programs = await dbAll(`
            SELECT id, title, description, presenter, schedule_time as time, program_type as type, 
                   duration, program_date as date, broadcast_type, is_active, image_url, video_url
            FROM programs 
            WHERE broadcast_type = 'scheduled' 
            ORDER BY program_date, schedule_time
        `);
        
        // Transformer les données pour correspondre au format attendu
        const formattedPrograms = programs.map(program => {
            // Extraire le jour de la date si disponible, sinon utiliser une logique par défaut
            let jour = 'Lundi'; // Valeur par défaut
            
            if (program.date) {
                const programDate = new Date(program.date);
                const dayOfWeek = programDate.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
                const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
                jour = jours[dayOfWeek];
            }
            
            // Nettoyer le type de programme
            const cleanType = program.type.replace('Programme ', '');
            
            // Déterminer la classe CSS
            const typeMap = {
                'Information': 'information',
                'Décryptage & Reportages': 'decryptage',
                'Débats': 'debats',
                'Humain & Sociétal': 'societe',
                'Éducatif': 'education',
                'Jeunesse': 'jeunesse',
                'Environnement': 'environnement',
                'Culture & Identité': 'culture',
                'Économie & Travail': 'economie',
                'Sport': 'sport'
            };
            
            return {
                id: program.id.toString(),
                jour: jour,
                heure: program.time,
                emission: program.title,
                type: cleanType,
                typeClass: typeMap[cleanType] || 'default'
            };
        });
        
        res.json({
            success: true,
            programs: formattedPrograms
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des programmes:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des programmes'
        });
    }
});

// GET - Récupérer tous les programmes
// Route pour la page de planification des programmes
router.get('/schedule', requireAuth, async (req, res) => {
    try {
        // Récupérer tous les programmes planifiés
        const programs = await dbAll(`
            SELECT id, title, program_type, schedule_time, program_date, broadcast_type, 
                   presenter, is_active, created_at
            FROM programs 
            WHERE broadcast_type = 'scheduled' 
            ORDER BY program_date, schedule_time
        `);

        // Organiser les programmes par jour
        const schedule = {};
        const joursSemaine = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        
        joursSemaine.forEach(jour => {
            schedule[jour] = [];
        });

        // Vérifier si des programmes existent dans la base
        let hasDbPrograms = false;
        if (programs && programs.length > 0) {
            hasDbPrograms = true;
            programs.forEach(program => {
                if (program.program_date) {
                    const programDate = new Date(program.program_date);
                    const jourIndex = programDate.getDay();
                    const jourName = joursSemaine[jourIndex === 0 ? 6 : jourIndex - 1];
                    
                    schedule[jourName].push({
                        id: program.id,
                        title: program.title,
                        type: program.program_type,
                        time: program.schedule_time,
                        presenter: program.presenter,
                        isActive: program.is_active,
                        date: program.program_date,
                        fromDb: true // Marquer comme venant de la base
                    });
                }
            });
        }

        // Si aucun programme dans la base, ajouter les programmes par défaut
        if (!hasDbPrograms) {
            const defaultPrograms = [
                { jour: 'Lundi', heure: '12:00', emission: '1 notion en 3 minutes', type: 'Éducatif', presenter: 'Prof. Rakoto' },
                { jour: 'Lundi', heure: '18:00', emission: 'TELEX Actus', type: 'Information', presenter: 'Sarah & Tom' },
                { jour: 'Mardi', heure: '20:00', emission: 'Décryptage & Reportages', type: 'Décryptage', presenter: 'Antoine' },
                { jour: 'Mercredi', heure: '18:00', emission: 'Zoom Écologie', type: 'Environnement', presenter: 'Emma' },
                { jour: 'Mercredi', heure: '20:00', emission: 'Face à Face', type: 'Débat', presenter: 'Divers intervenants' },
                { jour: 'Jeudi', heure: '18:00', emission: 'Travailler à Mada', type: 'Économie', presenter: 'M. Randria' },
                { jour: 'Jeudi', heure: '19:00', emission: 'À Cœur Ouvert', type: 'Sociétal', presenter: 'Claire' },
                { jour: 'Vendredi', heure: '17:00', emission: 'La Question des Jeunes', type: 'Jeunesse', presenter: 'Étudiants ambassadeurs' },
                { jour: 'Vendredi', heure: '19:00', emission: 'Culture & Identité', type: 'Culture', presenter: 'Léa & Jules' },
                { jour: 'Samedi', heure: '17:00', emission: 'Telex Sports', type: 'Sport', presenter: 'Marc & Sophie' }
            ];

            defaultPrograms.forEach(program => {
                schedule[program.jour].push({
                    id: null, // Pas d'ID dans la base
                    title: program.emission,
                    type: program.type,
                    time: program.heure,
                    presenter: program.presenter,
                    isActive: true, // Actif par défaut
                    date: null, // Pas de date spécifique
                    fromDb: false // Marquer comme programme par défaut
                });
            });
        }

        // Trier les programmes par heure pour chaque jour
        Object.keys(schedule).forEach(jour => {
            schedule[jour].sort((a, b) => a.time.localeCompare(b.time));
        });

        res.render('admin/schedule', {
            title: 'Planification des Programmes - TELEX',
            user: req.session.user,
            schedule,
            joursSemaine,
            hasDbPrograms,
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });
    } catch (error) {
        console.error('Erreur page schedule:', error);
        req.flash('error', 'Erreur lors du chargement de la planification');
        res.redirect('/admin/dashboard');
    }
});

// Route pour mettre à jour un programme (version API)
router.put('/schedule/program/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, type, time, presenter, isActive, date } = req.body;

        if (!title || !time) {
            return res.status(400).json({ 
                success: false, 
                message: 'Le titre et l\'heure sont obligatoires' 
            });
        }

        await dbRun(`
            UPDATE programs 
            SET title = ?, program_type = ?, schedule_time = ?, presenter = ?, 
                is_active = ?, program_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            title.trim(),
            type?.trim() || 'Programme d\'Information',
            time.trim(),
            presenter?.trim() || 'TELEX',
            isActive ? 1 : 0,
            date || null,
            id
        ]);

        res.json({ 
            success: true, 
            message: 'Programme mis à jour avec succès' 
        });
    } catch (error) {
        console.error('Erreur mise à jour programme:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur lors de la mise à jour' 
        });
    }
});

// Route pour supprimer un programme (version API)
router.delete('/schedule/program/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const program = await dbGet('SELECT title FROM programs WHERE id = ?', [id]);
        if (!program) {
            return res.status(404).json({ 
                success: false, 
                message: 'Programme non trouvé' 
            });
        }

        await dbRun('DELETE FROM programs WHERE id = ?', [id]);

        res.json({ 
            success: true, 
            message: `Programme "${program.title}" supprimé avec succès` 
        });
    } catch (error) {
        console.error('Erreur suppression programme:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur lors de la suppression' 
        });
    }
});

// Route pour ajouter un programme (version API)
router.post('/schedule/program', async (req, res) => {
    try {
        const { title, type, time, presenter, isActive, date, jour } = req.body;

        if (!title || !time || !jour) {
            return res.status(400).json({ 
                success: false, 
                message: 'Le titre, l\'heure et le jour sont obligatoires' 
            });
        }

        // Créer une date fictive basée sur le jour
        const joursMap = {
            'Lundi': 1,
            'Mardi': 2,
            'Mercredi': 3,
            'Jeudi': 4,
            'Vendredi': 5,
            'Samedi': 6,
            'Dimanche': 0
        };
        
        const today = new Date();
        const currentDayOfWeek = today.getDay();
        const targetDayOfWeek = joursMap[jour];
        
        let targetDate = new Date(today);
        const dayDiff = targetDayOfWeek - currentDayOfWeek;
        targetDate.setDate(today.getDate() + dayDiff);
        const programDate = targetDate.toISOString().split('T')[0];

        const result = await dbRun(
            `INSERT INTO programs (title, program_type, schedule_time, presenter, is_active, program_date, broadcast_type, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, 'scheduled', CURRENT_TIMESTAMP)`,
            [
                title.trim(),
                type?.trim() || 'Programme d\'Information',
                time.trim(),
                presenter?.trim() || 'TELEX',
                isActive ? 1 : 0,
                programDate
            ]
        );

        res.json({ 
            success: true, 
            message: 'Programme ajouté avec succès',
            id: result.lastID,
            program: {
                id: result.lastID,
                title: title.trim(),
                type: type?.trim() || 'Programme d\'Information',
                time: time.trim(),
                presenter: presenter?.trim() || 'TELEX',
                isActive: isActive ? 1 : 0,
                date: programDate,
                jour
            }
        });
    } catch (error) {
        console.error('Erreur ajout programme:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur lors de l\'ajout' 
        });
    }
});

// Route pour ajouter rapidement un programme par défaut
router.post('/schedule/quick-add', async (req, res) => {
    try {
        const { jour, heure } = req.body;

        const defaultPrograms = {
            'Lundi': [
                { heure: '12:00', emission: '1 notion en 3 minutes', type: 'Éducatif', presenter: 'Prof. Rakoto' },
                { heure: '18:00', emission: 'TELEX Actus', type: 'Information', presenter: 'Sarah & Tom' }
            ],
            'Mardi': [
                { heure: '20:00', emission: 'Décryptage & Reportages', type: 'Décryptage', presenter: 'Antoine' }
            ],
            'Mercredi': [
                { heure: '18:00', emission: 'Zoom Écologie', type: 'Environnement', presenter: 'Emma' },
                { heure: '20:00', emission: 'Face à Face', type: 'Débat', presenter: 'Divers intervenants' }
            ],
            'Jeudi': [
                { heure: '18:00', emission: 'Travailler à Mada', type: 'Économie', presenter: 'M. Randria' },
                { heure: '19:00', emission: 'À Cœur Ouvert', type: 'Sociétal', presenter: 'Claire' }
            ],
            'Vendredi': [
                { heure: '17:00', emission: 'La Question des Jeunes', type: 'Jeunesse', presenter: 'Étudiants ambassadeurs' },
                { heure: '19:00', emission: 'Culture & Identité', type: 'Culture', presenter: 'Léa & Jules' }
            ],
            'Samedi': [
                { heure: '17:00', emission: 'Telex Sports', type: 'Sport', presenter: 'Marc & Sophie' }
            ]
        };

        const dayPrograms = defaultPrograms[jour];
        const program = dayPrograms ? dayPrograms.find(p => p.heure === heure) : null;

        if (!program) {
            return res.status(404).json({ 
                success: false, 
                message: 'Programme par défaut non trouvé pour ce jour et cette heure' 
            });
        }

        // Créer une date fictive
        const joursMap = {
            'Lundi': 1,
            'Mardi': 2,
            'Mercredi': 3,
            'Jeudi': 4,
            'Vendredi': 5,
            'Samedi': 6,
            'Dimanche': 0
        };
        
        const today = new Date();
        const currentDayOfWeek = today.getDay();
        const targetDayOfWeek = joursMap[jour];
        
        let targetDate = new Date(today);
        const dayDiff = targetDayOfWeek - currentDayOfWeek;
        targetDate.setDate(today.getDate() + dayDiff);
        const programDate = targetDate.toISOString().split('T')[0];

        const result = await dbRun(
            `INSERT INTO programs (title, program_type, schedule_time, presenter, is_active, program_date, broadcast_type, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, 'scheduled', CURRENT_TIMESTAMP)`,
            [
                program.emission,
                `Programme ${program.type}`,
                program.heure,
                program.presenter,
                1,
                programDate
            ]
        );

        res.json({ 
            success: true, 
            message: 'Programme ajouté avec succès',
            id: result.lastID,
            program: {
                id: result.lastID,
                title: program.emission,
                type: program.type,
                time: program.heure,
                presenter: program.presenter,
                isActive: 1,
                date: programDate,
                jour
            }
        });

    } catch (error) {
        console.error('Erreur ajout rapide programme:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur lors de l\'ajout rapide' 
        });
    }
});

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireAuthApi = requireAuthApi;
module.exports.requireSuperAdmin = requireSuperAdmin;