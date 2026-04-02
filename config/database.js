require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Chemin de la base
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'telex.db');

// Créer dossier si nécessaire
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Connexion
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Erreur SQLite:', err.message);
    } else {
        console.log(`✅ SQLite connecté: ${DB_PATH}`);
        initSimpleDatabase();
        // Appeler la mise à jour des tables après l'initialisation
        setTimeout(() => {
            updateProgramsTable();
            updateGalleryTable();
            checkAndUpdateTables();
            initializeFooterSettings();
            createProgramScheduleTable();
            removeShareFacebookFromNews(); // SOLUTION ULTIME
            addMissingColumnsToNews(); // Ajouter les colonnes manquantes
            generateNewsSlugs(); // Générer les slugs pour les actualités existantes
            updateBaumeTemoignagesTable(); // Mettre à jour la table des témoignages
            updateProgramsTableWithPublicFlag(); // Ajouter le champ show_on_public
            updateCookieConsentsTable(); // Ajouter la colonne consent_given
            initializeAboutData(); // Initialiser les données de la page about
        }, 2000);
    }
});

// Initialisation simple
function initSimpleDatabase() {
    const tables = [
        // TABLE NEWS CORRECTE - SANS share_facebook
        `CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            excerpt TEXT,
            content TEXT NOT NULL,
            image_url TEXT,
            video_url TEXT,
            author TEXT DEFAULT 'TELEX',
            category TEXT DEFAULT 'Actualité',
            program_type TEXT DEFAULT 'Actualités',
            is_published INTEGER DEFAULT 1,
            views INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // TABLE PROGRAMS COMPLÈTE
        `CREATE TABLE IF NOT EXISTS programs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            video_url TEXT,
            presenter TEXT DEFAULT 'TELEX',
            schedule_time TEXT DEFAULT 'À déterminer',
            duration TEXT DEFAULT '30 min',
            program_type TEXT DEFAULT 'Actualités',
            broadcast_type TEXT DEFAULT 'announcement',
            program_date DATE,
            share_facebook INTEGER DEFAULT 1,
            share_twitter INTEGER DEFAULT 0,
            share_linkedin INTEGER DEFAULT 0,
            share_whatsapp INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            subject TEXT,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            newsletter INTEGER DEFAULT 0,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(email, subject, DATE(created_at))
        )`,
        
        `CREATE TABLE IF NOT EXISTS contact_replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_id INTEGER NOT NULL,
            reply_message TEXT NOT NULL,
            reply_subject TEXT NOT NULL,
            include_original INTEGER DEFAULT 0,
            full_message TEXT NOT NULL,
            sent_via_mailto INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
        )`,
        
        `CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            description TEXT,
            image_url TEXT NOT NULL,
            category TEXT DEFAULT 'autres',
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS footer_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT,
            setting_type TEXT DEFAULT 'text',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            full_name TEXT,
            role TEXT DEFAULT 'admin',
            is_active INTEGER DEFAULT 1,
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Tables pour le Baume de la Foi
        `CREATE TABLE IF NOT EXISTS baume_prieres (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'comfort',
            reference_biblique TEXT,
            author TEXT DEFAULT 'Baume de la Foi',
            image_url TEXT,
            video_url TEXT,
            media_type TEXT DEFAULT 'none',
            is_published INTEGER DEFAULT 1,
            views INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS baume_temoignages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author_name TEXT NOT NULL,
            author_email TEXT,
            author_phone TEXT,
            ville TEXT,
            content TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            is_approved INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS baume_reflexions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            theme TEXT DEFAULT 'faith',
            image_url TEXT,
            video_url TEXT,
            media_type TEXT DEFAULT 'none',
            author TEXT DEFAULT 'Baume de la Foi',
            publication_date DATE,
            is_published INTEGER DEFAULT 1,
            reference_biblique TEXT,
            views INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS baume_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT,
            setting_type TEXT DEFAULT 'text',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // TABLE PROGRAM_SCHEDULE
        `CREATE TABLE IF NOT EXISTS program_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            program_id INTEGER NOT NULL,
            day_of_week INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
        )`,
        
        // TABLE COOKIE_CONSENTS - Pour le suivi des visiteurs
        `CREATE TABLE IF NOT EXISTS cookie_consents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            consent_type TEXT NOT NULL,
            preferences TEXT,
            user_agent TEXT,
            ip_address TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // TABLE ABOUT - Pour le contenu de la page À Propos
        `CREATE TABLE IF NOT EXISTS about (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hero_title TEXT NOT NULL DEFAULT 'À propos de Telex',
            hero_subtitle TEXT NOT NULL DEFAULT 'Découvrez notre histoire, notre équipe et notre vision',
            hero_intro TEXT NOT NULL DEFAULT 'Fondée par des étudiants passionnés, Telex est bien plus qu\'une télévision étudiante. C\'est un laboratoire d\'innovation, une école de talents et un média numérique pour la jeunesse engagée.',
            hero_image TEXT DEFAULT '/images/camera.png',
            history_title TEXT NOT NULL DEFAULT 'Notre Histoire',
            history_paragraph1 TEXT NOT NULL DEFAULT 'Telex est né en 2024 de la passion commune d\'un groupe d\'étudiants déterminés à créer une télévision étudiante et un média numérique à leur image : innovants, indépendants et engagés. En partant d\'un simple projet d\'association, nous avons construit pas à pas une véritable chaîne de télévision étudiante reconnue aujourd\'hui comme la référence en matière d\'audiovisuel étudiant.',
            history_paragraph2 TEXT NOT NULL DEFAULT 'Notre aventure a commencé avec une petite équipe de 10 passionnés et un studio improvisé. Aujourd\'hui, nous comptons plus de 50 membres actifs, un studio professionnel et une audience grandissante. Chaque jour, nous repoussons les limites de la créativité étudiante pour offrir des contenus de qualité.',
            team_title TEXT NOT NULL DEFAULT 'Notre Équipe',
            team_intro TEXT NOT NULL DEFAULT 'Notre force réside dans la diversité de nos profils. Journalistes, techniciens, monteurs, graphistes, communicants - tous étudiants et tous animés par la même passion pour l\'audiovisuel. Chaque membre contribue avec ses compétences uniques pour créer des contenus exceptionnels.',
            team_redaction_title TEXT NOT NULL DEFAULT 'Rédaction',
            team_redaction_count TEXT NOT NULL DEFAULT '2 journalistes et reporters',
            team_redaction_image TEXT DEFAULT '/images/TELEX INTEGRATION.png',
            team_redaction_description TEXT NOT NULL DEFAULT 'Notre équipe éditoriale travaille sur l\'écriture, les reportages et la vérification des informations.',
            team_redaction_skills TEXT NOT NULL DEFAULT 'Journalisme, Reportage, Édition',
            team_technique_title TEXT NOT NULL DEFAULT 'Technique',
            team_technique_count TEXT NOT NULL DEFAULT '2 techniciens audiovisuels',
            team_technique_image TEXT DEFAULT '/images/femme telex.png',
            team_technique_description TEXT NOT NULL DEFAULT 'Spécialistes de la prise de vue, du son et de l\'éclairage pour une production de qualité professionnelle.',
            team_technique_skills TEXT NOT NULL DEFAULT 'Caméra, Son, Éclairage',
            team_postproduction_title TEXT NOT NULL DEFAULT 'Post-production',
            team_postproduction_count TEXT NOT NULL DEFAULT '3 monteurs vidéo',
            team_postproduction_image TEXT DEFAULT '/images/ordi_telex.png',
            team_postproduction_description TEXT NOT NULL DEFAULT 'Experts en montage, étalonnage et effets spéciaux pour donner vie à nos contenus audiovisuels.',
            team_postproduction_skills TEXT NOT NULL DEFAULT 'Montage, Étalonnage, Motion Design',
            team_communication_title TEXT NOT NULL DEFAULT 'Communication',
            team_communication_count TEXT NOT NULL DEFAULT '1 chargés de communication',
            team_communication_image TEXT DEFAULT '/images/Présentation du Telex.png',
            team_communication_description TEXT NOT NULL DEFAULT 'Gestion des réseaux sociaux, relations presse et stratégie de diffusion pour maximiser notre audience.',
            team_communication_skills TEXT NOT NULL DEFAULT 'Réseaux sociaux, Stratégie, Community',
            stats_title TEXT NOT NULL DEFAULT 'Nos Chiffres',
            stats_members_count TEXT NOT NULL DEFAULT '50+',
            stats_hours_count TEXT NOT NULL DEFAULT '200+',
            stats_views_count TEXT NOT NULL DEFAULT '15K+',
            stats_programs_count TEXT NOT NULL DEFAULT '4',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];
    
    // Exécuter séquentiellement
    let currentIndex = 0;
    
    function createNextTable() {
        if (currentIndex >= tables.length) {
            console.log('✅ Base initialisée');
            // Lancer les migrations après la création des tables
            migrateDatabase();
            return;
        }
        
        db.run(tables[currentIndex], function(err) {
            if (err) {
                console.error(`❌ Table ${currentIndex + 1}:`, err.message);
            } else {
                console.log(`✅ Table ${currentIndex + 1} créée`);
            }
            currentIndex++;
            setTimeout(createNextTable, 100);
        });
    }
    
    createNextTable();
}

// ============================================
// SOLUTION ULTIME - SUPPRIMER share_facebook DE news
// ============================================
function removeShareFacebookFromNews() {
    console.log('🔄 CORRECTION ULTIME: Suppression de share_facebook de news...');
    
    db.serialize(() => {
        // Vérifier si la colonne share_facebook existe
        db.all("PRAGMA table_info(news)", (err, columns) => {
            if (err) {
                console.error('❌ Erreur vérification news:', err);
                return;
            }
            
            const columnNames = columns.map(col => col.name);
            const hasShareFb = columnNames.includes('share_facebook');
            
            if (hasShareFb) {
                console.log('⚠️ Colonne share_facebook trouvée dans news - SUPPRESSION IMMÉDIATE...');
                
                // 1. Créer une table temporaire SANS share_facebook
                db.run(`CREATE TABLE news_temp (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    excerpt TEXT,
                    content TEXT NOT NULL,
                    image_url TEXT,
                    video_url TEXT,
                    author TEXT DEFAULT 'TELEX',
                    category TEXT DEFAULT 'Actualité',
                    program_type TEXT DEFAULT 'Actualités',
                    is_published INTEGER DEFAULT 1,
                    views INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`, function(err) {
                    if (err) {
                        console.error('❌ Erreur création news_temp:', err);
                        return;
                    }
                    
                    // 2. Copier les données (sans share_facebook)
                    db.run(`INSERT INTO news_temp 
                        (id, title, excerpt, content, image_url, video_url, author, category, program_type, is_published, views, created_at, updated_at)
                        SELECT 
                        id, title, excerpt, content, image_url, video_url, author, category, program_type, is_published, views, created_at, updated_at
                        FROM news`, function(err) {
                        if (err) {
                            console.error('❌ Erreur copie données:', err);
                            return;
                        }
                        
                        // 3. Supprimer l'ancienne table
                        db.run("DROP TABLE news", function(err) {
                            if (err) {
                                console.error('❌ Erreur suppression news:', err);
                                return;
                            }
                            
                            // 4. Renommer la table temporaire
                            db.run("ALTER TABLE news_temp RENAME TO news", function(err) {
                                if (err) {
                                    console.error('❌ Erreur renommage:', err);
                                } else {
                                    console.log('✅ SUCCÈS: Table news corrigée sans share_facebook!');
                                }
                            });
                        });
                    });
                });
            } else {
                console.log('✅ Table news déjà correcte (pas de share_facebook)');
            }
        });
    });
}

// ============================================
// AJOUTER LES COLONNES MANQUANTES À news
// ============================================
function addMissingColumnsToNews() {
    console.log('🔄 Vérification des colonnes manquantes dans news...');
    
    db.all("PRAGMA table_info(news)", (err, columns) => {
        if (err) {
            console.error('❌ Erreur:', err);
            return;
        }
        
        const columnNames = columns.map(col => col.name);
        
        // Liste des colonnes qui DEVRAIENT être dans news
        const requiredColumns = [
            { name: 'program_type', type: "TEXT DEFAULT 'Actualités'" },
            { name: 'video_url', type: 'TEXT' },
            { name: 'views', type: 'INTEGER DEFAULT 0' },
            { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
            { name: 'slug', type: 'TEXT' }
        ];
        
        requiredColumns.forEach(column => {
            if (!columnNames.includes(column.name)) {
                console.log(`🔄 Ajout de ${column.name} à news...`);
                db.run(`ALTER TABLE news ADD COLUMN ${column.name} ${column.type}`, (err) => {
                    if (err) {
                        console.error(`❌ Erreur ajout ${column.name}:`, err.message);
                    } else {
                        console.log(`✅ Colonne ${column.name} ajoutée à news`);
                    }
                });
            }
        });
    });
}

// Migration pour ajouter les champs manquants
function migrateDatabase() {
    console.log('🔄 Vérification des migrations...');
    
    // Vérifier les colonnes de la table programs
    db.all("PRAGMA table_info(programs)", (err, columns) => {
        if (err) {
            console.error('❌ Erreur vérification colonnes programs:', err);
            return;
        }
        
        const columnNames = columns.map(col => col.name);
        const columnsToAdd = [
            { name: 'video_url', type: 'TEXT' },
            { name: 'presenter', type: 'TEXT DEFAULT \'TELEX\'' },
            { name: 'schedule_time', type: 'TEXT DEFAULT \'À déterminer\'' },
            { name: 'duration', type: 'TEXT DEFAULT \'30 min\'' },
            { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
            { name: 'broadcast_type', type: 'TEXT DEFAULT \'announcement\'' },
            { name: 'program_date', type: 'DATE' },
            { name: 'share_facebook', type: 'INTEGER DEFAULT 1' },
            { name: 'share_twitter', type: 'INTEGER DEFAULT 0' },
            { name: 'share_linkedin', type: 'INTEGER DEFAULT 0' },
            { name: 'share_whatsapp', type: 'INTEGER DEFAULT 0' }
        ];
        
        columnsToAdd.forEach(column => {
            if (!columnNames.includes(column.name)) {
                console.log(`🔄 Ajout de la colonne ${column.name} à la table programs...`);
                db.run(`ALTER TABLE programs ADD COLUMN ${column.name} ${column.type}`, (err) => {
                    if (err) console.error(`❌ Erreur ajout colonne ${column.name}:`, err.message);
                    else console.log(`✅ Colonne ${column.name} ajoutée avec succès`);
                });
            }
        });
    });
    
    // Vérifier les colonnes de baume_prieres
    db.all("PRAGMA table_info(baume_prieres)", (err, columns) => {
        if (err) {
            console.error('❌ Erreur vérification colonnes baume_prieres:', err);
            return;
        }
        
        const columnNames = columns.map(col => col.name);
        const columnsToAdd = [
            { name: 'video_url', type: 'TEXT' },
            { name: 'image_url', type: 'TEXT' },
            { name: 'media_type', type: 'TEXT DEFAULT \'none\'' },
            { name: 'views', type: 'INTEGER DEFAULT 0' }
        ];
        
        columnsToAdd.forEach(column => {
            if (!columnNames.includes(column.name)) {
                console.log(`🔄 Ajout de la colonne ${column.name} à la table baume_prieres...`);
                db.run(`ALTER TABLE baume_prieres ADD COLUMN ${column.name} ${column.type}`, (err) => {
                    if (err) console.error(`❌ Erreur ajout colonne ${column.name}:`, err.message);
                    else console.log(`✅ Colonne ${column.name} ajoutée à baume_prieres`);
                });
            }
        });
    });
    
    // Vérifier les colonnes de baume_reflexions
    db.all("PRAGMA table_info(baume_reflexions)", (err, columns) => {
        if (err) {
            console.error('❌ Erreur vérification colonnes baume_reflexions:', err);
            return;
        }
        
        const columnNames = columns.map(col => col.name);
        const columnsToAdd = [
            { name: 'video_url', type: 'TEXT' },
            { name: 'image_url', type: 'TEXT' },
            { name: 'media_type', type: 'TEXT DEFAULT \'none\'' },
            { name: 'views', type: 'INTEGER DEFAULT 0' }
        ];
        
        columnsToAdd.forEach(column => {
            if (!columnNames.includes(column.name)) {
                console.log(`🔄 Ajout de la colonne ${column.name} à la table baume_reflexions...`);
                db.run(`ALTER TABLE baume_reflexions ADD COLUMN ${column.name} ${column.type}`, (err) => {
                    if (err) console.error(`❌ Erreur ajout colonne ${column.name}:`, err.message);
                    else console.log(`✅ Colonne ${column.name} ajoutée à baume_reflexions`);
                });
            }
        });
    });
}

// FONCTION - Création de la table program_schedule
function createProgramScheduleTable() {
    console.log('🔄 Création de la table program_schedule...');
    
    const sql = `CREATE TABLE IF NOT EXISTS program_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        program_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
    )`;
    
    db.run(sql, function(err) {
        if (err) {
            console.error('❌ Erreur création table program_schedule:', err.message);
        } else {
            console.log('✅ Table program_schedule créée avec succès');
            
            // Créer les index
            db.run(`CREATE INDEX IF NOT EXISTS idx_program_schedule_program_id ON program_schedule(program_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_program_schedule_day_time ON program_schedule(day_of_week, start_time)`);
        }
    });
}

// Fonctions de mise à jour
function updateProgramsTable() {
    console.log('🔄 Vérification table programs...');
    
    // Vérifier et ajouter les colonnes manquantes pour la table programs
    const requiredColumns = [
        { name: 'views', type: 'INTEGER DEFAULT 0' },
        { name: 'total_views', type: 'INTEGER DEFAULT 0' },
        { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];
    
    requiredColumns.forEach(column => {
        db.run(`ALTER TABLE programs ADD COLUMN ${column.name} ${column.type}`, function(err) {
            if (err && !err.message.includes('duplicate column name')) {
                console.error(`❌ Erreur ajout colonne ${column.name} à programs:`, err.message);
            } else if (!err) {
                console.log(`✅ Colonne ${column.name} ajoutée à programs`);
            } else {
                console.log(`ℹ️ Colonne ${column.name} existe déjà dans programs`);
            }
        });
    });
}

function updateGalleryTable() {
    console.log('🔄 Vérification table gallery...');
    db.all("PRAGMA table_info(gallery)", (err, columns) => {
        if (err) return;
        if (!columns.some(col => col.name === 'updated_at')) {
            db.run("ALTER TABLE gallery ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        }
    });
}

function checkAndUpdateTables() {
    console.log('🔄 Vérification générale des tables...');
}

function initializeFooterSettings() {
    console.log('🔄 Initialisation des paramètres du footer...');
    
    const defaultSettings = [
        ['contact_email', 'contact@telex.fr', 'text'],
        ['contact_phone', '01 23 45 67 89', 'text'],
        ['contact_address', 'Campus Universitaire, Paris', 'text'],
        ['contact_phone_2', '+261 34 12 345 67', 'text'],
        ['footer_logo', '/images/11.png', 'text'],
        ['footer_description', 'Télévision étudiante jeune et engagée', 'text'],
        ['copyright_text', '© 2026 Telex - Tous droits réservés', 'text'],
        ['youtube_url', 'https://www.youtube.com/@Telexmadagascar', 'url'],
        ['instagram_url', 'https://www.instagram.com/telexmadagascar', 'url'],
        ['facebook_url', 'https://www.facebook.com/Telexmadagascar', 'url'],
        ['tiktok_url', 'https://www.tiktok.com/@telexmadagascar', 'url'],
        ['twitter_url', 'https://twitter.com/TelexMadagascar', 'url']
    ];
    
    defaultSettings.forEach(([key, value, type]) => {
        db.run(
            `INSERT OR IGNORE INTO footer_settings (setting_key, setting_value, setting_type) 
             VALUES (?, ?, ?)`,
            [key, value, type]
        );
    });
    
    console.log('✅ Paramètres du footer initialisés');
}

// Fonction pour mettre à jour la table baume_temoignages avec les colonnes manquantes
function updateBaumeTemoignagesTable() {
    console.log('🔄 Vérification de la table baume_temoignages...');
    
    // Vérifier si la colonne author_phone existe
    db.all("PRAGMA table_info(baume_temoignages)", (err, columns) => {
        if (err) {
            console.error('❌ Erreur lors de la vérification des colonnes:', err);
            return;
        }
        
        const columnNames = columns.map(col => col.name);
        
        // Ajouter la colonne author_phone si elle n'existe pas
        if (!columnNames.includes('author_phone')) {
            db.run(`ALTER TABLE baume_temoignages ADD COLUMN author_phone TEXT`, (err) => {
                if (err) {
                    console.error('❌ Erreur lors de l\'ajout de la colonne author_phone:', err);
                } else {
                    console.log('✅ Colonne author_phone ajoutée à baume_temoignages');
                }
            });
        } else {
            console.log('ℹ️ Colonne author_phone déjà présente dans baume_temoignages');
        }
        
        // Ajouter la colonne ville si elle n'existe pas
        if (!columnNames.includes('ville')) {
            db.run(`ALTER TABLE baume_temoignages ADD COLUMN ville TEXT`, (err) => {
                if (err) {
                    console.error('❌ Erreur lors de l\'ajout de la colonne ville:', err);
                } else {
                    console.log('✅ Colonne ville ajoutée à baume_temoignages');
                }
            });
        } else {
            console.log('ℹ️ Colonne ville déjà présente dans baume_temoignages');
        }
    });
}

// Fonction pour ajouter le champ show_on_public à la table programs
function updateProgramsTableWithPublicFlag() {
    console.log('🔄 Vérification de la table programs...');
    
    // Vérifier si la colonne show_on_public existe
    db.all("PRAGMA table_info(programs)", (err, columns) => {
        if (err) {
            console.error('❌ Erreur lors de la vérification des colonnes programs:', err);
            return;
        }
        
        const columnNames = columns.map(col => col.name);
        
        // Ajouter la colonne show_on_public si elle n'existe pas
        if (!columnNames.includes('show_on_public')) {
            db.run(`ALTER TABLE programs ADD COLUMN show_on_public INTEGER DEFAULT 1`, (err) => {
                if (err) {
                    console.error('❌ Erreur lors de l\'ajout de la colonne show_on_public:', err);
                } else {
                    console.log('✅ Colonne show_on_public ajoutée à programs');
                }
            });
        } else {
            console.log('ℹ️ Colonne show_on_public déjà présente dans programs');
        }
    });
}

// Fonctions de base promisifiées
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Erreur dbRun:', err);
                reject(err);
            } else {
                // Log uniquement si lastID est disponible (pour les INSERT)
                if (this.lastID) {
                    console.log('✅ dbRun INSERT - lastID:', this.lastID);
                }
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
}

// ============================================
// GÉNÉRER LES SLUGS POUR LES ACTUALITÉS
// ============================================
function generateNewsSlugs() {
    console.log('🔄 Génération des slugs pour les actualités...');
    
    // Fonction pour créer un slug à partir d'un titre
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
    
    // Récupérer toutes les actualités sans slug
    db.all("SELECT id, title FROM news WHERE slug IS NULL OR slug = ''", async (err, news) => {
        if (err) {
            console.error('❌ Erreur récupération actualités:', err);
            return;
        }
        
        console.log(`📝 ${news.length} actualités à mettre à jour avec des slugs`);
        
        for (const item of news) {
            const slug = createSlug(item.title);
            
            // Vérifier si le slug existe déjà
            const existing = await new Promise((resolve, reject) => {
                db.get("SELECT id FROM news WHERE slug = ? AND id != ?", [slug, item.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            let finalSlug = slug;
            if (existing) {
                // Si le slug existe, ajouter l'ID
                finalSlug = `${slug}-${item.id}`;
            }
            
            // Mettre à jour l'actualité avec le slug
            db.run("UPDATE news SET slug = ? WHERE id = ?", [finalSlug, item.id], (err) => {
                if (err) {
                    console.error(`❌ Erreur mise à jour slug pour ${item.title}:`, err);
                } else {
                    console.log(`✅ Slug généré: ${finalSlug} pour "${item.title}"`);
                }
            });
        }
    });
}

// Fonction pour mettre à jour la table cookie_consents avec la colonne consent_given
function updateCookieConsentsTable() {
    console.log('🔄 Vérification de la table cookie_consents...');
    
    // Vérifier si la colonne consent_given existe
    db.all("PRAGMA table_info(cookie_consents)", (err, columns) => {
        if (err) {
            console.error('❌ Erreur lors de la vérification des colonnes cookie_consents:', err);
            return;
        }
        
        const columnNames = columns.map(col => col.name);
        
        // Ajouter la colonne consent_given si elle n'existe pas
        if (!columnNames.includes('consent_given')) {
            db.run(`ALTER TABLE cookie_consents ADD COLUMN consent_given INTEGER DEFAULT 1`, (err) => {
                if (err) {
                    console.error('❌ Erreur lors de l\'ajout de la colonne consent_given:', err);
                } else {
                    console.log('✅ Colonne consent_given ajoutée à la table cookie_consents');
                }
            });
        } else {
            console.log('✅ La colonne consent_given existe déjà dans cookie_consents');
        }
    });
}

// Fonction pour initialiser les données de la page about si la table est vide
async function initializeAboutData() {
    try {
        console.log('🔄 Vérification des données de la page about...');
        
        // Vérifier si la table about est vide
        const row = await dbGet('SELECT COUNT(*) as count FROM about');
        
        if (row.count === 0) {
            console.log('📝 La table about est vide, insertion des données par défaut...');
            
            // Insérer les données par défaut
            await dbRun(`
                INSERT INTO about (
                    hero_title, hero_subtitle, hero_intro, hero_image,
                    history_title, history_paragraph1, history_paragraph2,
                    team_title, team_intro,
                    team_redaction_title, team_redaction_count, team_redaction_image, team_redaction_description, team_redaction_skills,
                    team_technique_title, team_technique_count, team_technique_image, team_technique_description, team_technique_skills,
                    team_postproduction_title, team_postproduction_count, team_postproduction_image, team_postproduction_description, team_postproduction_skills,
                    team_communication_title, team_communication_count, team_communication_image, team_communication_description, team_communication_skills,
                    stats_title, stats_members_count, stats_hours_count, stats_views_count, stats_programs_count
                ) VALUES (
                    'À propos de Telex',
                    'Découvrez notre histoire, notre équipe et notre vision',
                    'Fondée par des étudiants passionnés, Telex est bien plus qu\\une télévision étudiante. C\\est un laboratoire d\\innovation, une école de talents et un média numérique pour la jeunesse engagée.',
                    '/images/camera.png',
                    'Notre Histoire',
                    'Telex est né en 2024 de la passion commune d\\un groupe d\\étudiants déterminés à créer une télévision étudiante et un média numérique à leur image : innovants, indépendants et engagés. En partant d\\un simple projet d\\association, nous avons construit pas à pas une véritable chaîne de télévision étudiante reconnue aujourd\\hui comme la référence en matière d\\audiovisuel étudiant.',
                    'Notre aventure a commencé avec une petite équipe de 10 passionnés et un studio improvisé. Aujourd\\hui, nous comptons plus de 50 membres actifs, un studio professionnel et une audience grandissante. Chaque jour, nous repoussons les limites de la créativité étudiante pour offrir des contenus de qualité.',
                    'Notre Équipe',
                    'Notre force réside dans la diversité de nos profils. Journalistes, techniciens, monteurs, graphistes, communicateurs - tous étudiants et tous animés par la même passion pour l\\audiovisuel. Chaque membre contribue avec ses compétences uniques pour créer des contenus exceptionnels.',
                    'Rédaction',
                    '2 journalistes et reporters',
                    '/images/TELEX INTEGRATION.png',
                    'Notre équipe éditoriale travaille sur l\\écriture, les reportages et la vérification des informations.',
                    'Journalisme, Reportage, Édition',
                    'Technique',
                    '2 techniciens audiovisuels',
                    '/images/femme telex.png',
                    'Spécialistes de la prise de vue, du son et de l\éclairage pour une production de qualité professionnelle.',
                    'Caméra, Son, Éclairage',
                    'Post-production',
                    '3 monteurs vidéo',
                    '/images/ordi_telex.png',
                    'Experts en montage, étalonnage et effets spéciaux pour donner vie à nos contenus audiovisuels.',
                    'Montage, Étalonnage, Motion Design',
                    'Communication',
                    '1 chargé de communication',
                    '/images/Présentation du Telex.png',
                    'Gestion des réseaux sociaux, relations presse et stratégie de diffusion pour maximiser notre audience.',
                    'Réseaux sociaux, Stratégie, Community',
                    'Nos Chiffres',
                    '50+',
                    '200+',
                    '15K+',
                    '4'
                )
            `);
            
            console.log('✅ Données par défaut de la page about insérées avec succès');
        } else {
            console.log('✅ La table about contient déjà des données');
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des données about:', error);
    }
}

module.exports = { db, dbAll, dbGet, dbRun, initializeAboutData };