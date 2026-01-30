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
            createProgramScheduleTable(); // Ajouter la création de la table program_schedule
        }, 2000);
    }
});

// Initialisation simple
function initSimpleDatabase() {
    const tables = [
// Dans la fonction initSimpleDatabase(), modifiez la table news :
        `CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            excerpt TEXT,
            content TEXT NOT NULL,
            image_url TEXT,
            author TEXT DEFAULT 'TELEX',
            category TEXT DEFAULT 'Actualité',
            is_published INTEGER DEFAULT 1,
            views INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- AJOUTER CETTE LIGNE
        )`,
        
        `CREATE TABLE IF NOT EXISTS programs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        
        // Dans la fonction initSimpleDatabase(), remplacez la définition de la table contacts par :
        `CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            subject TEXT,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,          -- 0 = non lu, 1 = lu
            newsletter INTEGER DEFAULT 0,       -- 0 = pas abonné, 1 = abonné
            ip_address TEXT,                    -- IP du visiteur (optionnel)
            user_agent TEXT,                    -- Navigateur (optionnel)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        
    ];
    
    // Exécuter séquentiellement
    let currentIndex = 0;
    
    function createNextTable() {
        if (currentIndex >= tables.length) {
            console.log('✅ Base initialisée');
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

// Fonction pour initialiser les paramètres du footer
function initializeFooterSettings() {
    const defaultSettings = [
        { key: 'contact_email', value: 'contact@telex.fr', type: 'email' },
        { key: 'contact_phone', value: '01 23 45 67 89', type: 'text' },
        { key: 'contact_address', value: 'Campus Universitaire, Paris', type: 'text' },
        { key: 'youtube_url', value: 'https://www.youtube.com/@Telexmadagascar', type: 'url' },
        { key: 'instagram_url', value: 'https://www.instagram.com/telexmadagascar', type: 'url' },
        { key: 'facebook_url', value: 'https://www.facebook.com/Telexmadagascar', type: 'url' },
        { key: 'tiktok_url', value: 'https://www.tiktok.com/@telexmadagascar', type: 'url' },
        { key: 'twitter_url', value: 'https://twitter.com/TelexMadagascar', type: 'url' },
        { key: 'footer_logo', value: '/images/11.png', type: 'text' },
        { key: 'footer_description', value: 'Télévision étudiante jeune et engagée', type: 'text' }
    ];
    
    defaultSettings.forEach(setting => {
        db.run(
            `INSERT OR IGNORE INTO footer_settings (setting_key, setting_value, setting_type) VALUES (?, ?, ?)`,
            [setting.key, setting.value, setting.type],
            (err) => {
                if (err) {
                    console.error(`❌ Erreur initialisation ${setting.key}:`, err);
                } else {
                    console.log(`✅ Paramètre ${setting.key} initialisé`);
                }
            }
        );
    });
}

// Créer la table program_schedule pour la grille des programmes
async function createProgramScheduleTable() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS program_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT NOT NULL CHECK (day IN ('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche')),
            time TEXT NOT NULL CHECK (time LIKE '__:__'),
            program_name TEXT NOT NULL,
            program_type TEXT NOT NULL CHECK (program_type IN ('Info', 'Culture', 'Débat', 'Sport', 'Cinéma', 'Musique', 'Divertissement', 'Documentaire', 'Autre')),
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    await dbRun(createTableQuery);
    
    // Insérer les données par défaut si la table est vide
    const count = await dbGet('SELECT COUNT(*) as count FROM program_schedule');
    if (count.count === 0) {
        const defaultPrograms = [
            ['Lundi', '18:00', 'Le Journal Campus', 'Info'],
            ['Mardi', '19:30', 'Culture Express', 'Culture'],
            ['Mercredi', '20:00', 'Débat Campus', 'Débat'],
            ['Jeudi', '18:30', 'TELEX Sports', 'Sport'],
            ['Vendredi', '21:00', 'Ciné Club', 'Cinéma']
        ];
        
        for (const program of defaultPrograms) {
            await dbRun(
                'INSERT INTO program_schedule (day, time, program_name, program_type) VALUES (?, ?, ?, ?)',
                program
            );
        }
        console.log('✅ Table program_schedule créée avec données par défaut');
    }
}

// Fonctions de base
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
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}
// Ajoutez cette fonction après initSimpleDatabase()
function updateContactsTable() {
    const checkColumn = `PRAGMA table_info(contacts)`;
    db.all(checkColumn, (err, columns) => {
        if (err) {
            console.error('❌ Erreur vérification colonnes:', err);
            return;
        }
        
        const hasNewsletter = columns.some(col => col.name === 'newsletter');
        const hasIpAddress = columns.some(col => col.name === 'ip_address');
        const hasUserAgent = columns.some(col => col.name === 'user_agent');
        
        if (!hasNewsletter) {
            db.run('ALTER TABLE contacts ADD COLUMN newsletter INTEGER DEFAULT 0', (err) => {
                if (err) console.error('❌ Erreur ajout newsletter:', err);
                else console.log('✅ Colonne newsletter ajoutée');
            });
        }
        
        if (!hasIpAddress) {
            db.run('ALTER TABLE contacts ADD COLUMN ip_address TEXT', (err) => {
                if (err) console.error('❌ Erreur ajout ip_address:', err);
                else console.log('✅ Colonne ip_address ajoutée');
            });
        }
        
        if (!hasUserAgent) {
            db.run('ALTER TABLE contacts ADD COLUMN user_agent TEXT', (err) => {
                if (err) console.error('❌ Erreur ajout user_agent:', err);
                else console.log('✅ Colonne user_agent ajoutée');
            });
        }
    });
}
// NEW
function checkAndUpdateTables() {
    console.log('🔍 Vérification des tables...');
    
    // Vérifier et ajouter updated_at à news si manquant
    db.all("PRAGMA table_info(news)", (err, columns) => {
        if (err) {
            console.error('❌ Erreur vérification news:', err);
            return;
        }
        
        const hasUpdatedAt = columns.some(col => col.name === 'updated_at');
        
        if (!hasUpdatedAt) {
            console.log('🔄 Ajout de updated_at à la table news...');
            db.run("ALTER TABLE news ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP", (err) => {
                if (err) {
                    console.error('❌ Erreur ajout updated_at:', err.message);
                } else {
                    console.log('✅ Colonne updated_at ajoutée à news');
                    
                    // Mettre à jour les dates existantes
                    db.run("UPDATE news SET updated_at = created_at WHERE updated_at IS NULL", (err) => {
                        if (err) {
                            console.error('❌ Erreur mise à jour dates:', err);
                        } else {
                            console.log('✅ Dates updated_at mises à jour');
                        }
                    });
                }
            });
        }
    });
    
    // Vérifier et ajouter updated_at à contacts si manquant (pour complétude)
    db.all("PRAGMA table_info(contacts)", (err, columns) => {
        if (err) {
            console.log('ℹ️ Table contacts non trouvée');
            return;
        }
        
        const hasUpdatedAt = columns.some(col => col.name === 'updated_at');
        
        if (!hasUpdatedAt) {
            console.log('🔄 Ajout de updated_at à la table contacts...');
            db.run("ALTER TABLE contacts ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP", (err) => {
                if (err) {
                    console.error('❌ Erreur ajout updated_at contacts:', err.message);
                } else {
                    console.log('✅ Colonne updated_at ajoutée à contacts');
                }
            });
        }
    });
}
// NOUVELLE FONCTION : Initialiser les utilisateurs par défaut
function initializeDefaultUsers() {
    const bcrypt = require('bcryptjs');
    
    // Vérifier si des utilisateurs existent déjà
    db.get('SELECT COUNT(*) as count FROM users', async (err, result) => {
        if (err) {
            console.error('❌ Erreur vérification users:', err);
            return;
        }
        
        if (result.count === 0) {
            console.log('👥 Création des utilisateurs par défaut...');
            
            // Hash du mot de passe
            const hashedAdmin = await bcrypt.hash('admin123', 10);
            const hashedTelex = await bcrypt.hash('telex2026', 10);
            
            const defaultUsers = [
                ['admin', hashedAdmin, 'admin@telex.com', 'Administrateur Principal', 'superadmin', 1],
                ['telex', hashedTelex, 'contact@telex.com', 'Gestionnaire TELEX', 'admin', 1]
            ];
            
            const stmt = db.prepare(
                'INSERT OR IGNORE INTO users (username, password, email, full_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)'
            );
            
            defaultUsers.forEach(user => {
                stmt.run(user, (err) => {
                    if (err) {
                        console.error('❌ Erreur création user:', err);
                    }
                });
            });
            
            stmt.finalize();
            console.log('✅ Utilisateurs par défaut créés');
        } else {
            console.log(`✅ ${result.count} utilisateur(s) existant(s)`);
        }
    });
}

// NOUVELLE FONCTION : Vérifier et mettre à jour la table gallery
function updateGalleryTable() {
    console.log('🔍 Vérification de la table gallery...');
    
    db.all("PRAGMA table_info(gallery)", (err, columns) => {
        if (err) {
            console.error('❌ Erreur vérification gallery:', err);
            return;
        }
        
        const columnNames = columns.map(col => col.name);
        
        // Vérifier et ajouter les colonnes manquantes
        const missingColumns = [
            { name: 'description', sql: 'ALTER TABLE gallery ADD COLUMN description TEXT' },
            { name: 'category', sql: 'ALTER TABLE gallery ADD COLUMN category TEXT DEFAULT "autres"' },
            { name: 'is_active', sql: 'ALTER TABLE gallery ADD COLUMN is_active INTEGER DEFAULT 1' },
            { name: 'updated_at', sql: 'ALTER TABLE gallery ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
        ];
        
        missingColumns.forEach(({ name, sql }) => {
            if (!columnNames.includes(name)) {
                console.log(`🔄 Ajout de la colonne ${name} à gallery...`);
                db.run(sql, (err) => {
                    if (err) {
                        console.error(`❌ Erreur ajout ${name}:`, err.message);
                    } else {
                        console.log(`✅ Colonne ${name} ajoutée à gallery`);
                    }
                });
            } else {
                console.log(`✅ Colonne ${name} existe déjà dans gallery`);
            }
        });
    });
}

// NOUVELLE FONCTION : Vérifier et mettre à jour la table programs
function updateProgramsTable() {
    console.log('🔍 Vérification de la table programs...');
    
    db.all("PRAGMA table_info(programs)", (err, columns) => {
        if (err) {
            console.error('❌ Erreur vérification programs:', err);
            return;
        }
        
        const columnNames = columns.map(col => col.name);
        
        // Vérifier et ajouter les colonnes manquantes
        const missingColumns = [
            { name: 'presenter', sql: 'ALTER TABLE programs ADD COLUMN presenter TEXT' },
            { name: 'schedule_time', sql: 'ALTER TABLE programs ADD COLUMN schedule_time TEXT' },
            { name: 'category', sql: 'ALTER TABLE programs ADD COLUMN category TEXT' },
            { name: 'duration', sql: 'ALTER TABLE programs ADD COLUMN duration TEXT' },
            { name: 'updated_at', sql: 'ALTER TABLE programs ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
        ];
        
        missingColumns.forEach(({ name, sql }) => {
            if (!columnNames.includes(name)) {
                console.log(`🔄 Ajout de la colonne ${name} à programs...`);
                db.run(sql, (err) => {
                    if (err) {
                        console.error(`❌ Erreur ajout ${name}:`, err.message);
                    } else {
                        console.log(`✅ Colonne ${name} ajoutée à programs`);
                    }
                });
            } else {
                console.log(`✅ Colonne ${name} existe déjà dans programs`);
            }
        });
    });
}

// NOUVELLE FONCTION : Vérifier les tables des utilisateurs
function checkAndUpdateTables() {
    console.log('🔍 Vérification des tables...');
    
    // Mettre à jour la table programs d'abord
    updateProgramsTable();
    
    // Vérifier la table users
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.log('ℹ️ Table users non trouvée, création...');
            // Créer la table users si elle n'existe pas
            db.run(`CREATE TABLE IF NOT EXISTS users (
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
            )`, (err) => {
                if (err) {
                    console.error('❌ Erreur création table users:', err);
                } else {
                    console.log('✅ Table users créée');
                    initializeDefaultUsers();
                }
            });
        } else {
            console.log('✅ Table users existe déjà');
        }
    });
}

module.exports = { db, dbAll, dbGet, dbRun };