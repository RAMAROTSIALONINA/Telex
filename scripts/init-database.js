const bcrypt = require('bcryptjs');
const { db, dbRun } = require('../config/database');

async function initializeWithSampleData() {
    console.log('📊 Initialisation avec données de démo...');
    
    try {
        // Créer un utilisateur admin par défaut
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await dbRun(
            'INSERT OR IGNORE INTO users (username, password, email) VALUES (?, ?, ?)',
            ['admin', hashedPassword, 'admin@telex.fr']
        );
        
        // Données de démo pour les actualités
        const sampleNews = [
            {
                title: 'TELEX lance sa nouvelle chaîne étudiante',
                content: 'Nous sommes fiers d\'annoncer le lancement officiel de TELEX, la première télévision entièrement gérée par des étudiants. Après plusieurs mois de préparation, nous sommes prêts à diffuser nos premiers programmes.',
                author: 'Équipe TELEX',
                category: 'Annonce',
                is_published: 1
            },
            {
                title: 'Interview exclusive avec le président de l\'université',
                content: 'Notre équipe a rencontré le président pour discuter de l\'avenir des médias étudiants et du soutien institutionnel à nos projets.',
                author: 'Marie Dubois',
                category: 'Interview',
                is_published: 1
            },
            {
                title: 'Atelier journalisme : les inscriptions sont ouvertes',
                content: 'Participez à notre atelier de formation au journalisme audiovisuel. Ouvert à tous les étudiants passionnés par les médias.',
                author: 'Équipe pédagogique',
                category: 'Formation',
                is_published: 1
            }
        ];
        
        for (const news of sampleNews) {
            await dbRun(
                `INSERT INTO news (title, content, author, category, is_published) 
                 VALUES (?, ?, ?, ?, ?)`,
                [news.title, news.content, news.author, news.category, news.is_published]
            );
        }
        
        // Données de démo pour les programmes
        const samplePrograms = [
            {
                title: 'Le Journal Campus',
                description: 'Le journal d\'actualité du monde étudiant. Toutes les semaines, découvrez les nouvelles du campus et les événements à ne pas manquer.',
                schedule: 'Lundi 18h',
                hosts: 'Sarah & Tom',
                youtube_url: 'https://youtube.com'
            },
            {
                title: 'Culture Express',
                description: 'L\'émission culturelle qui explore la scène artistique étudiante. Musique, cinéma, théâtre : découvrez les talents de demain.',
                schedule: 'Mercredi 20h',
                hosts: 'Léa & Jules',
                youtube_url: 'https://youtube.com'
            },
            {
                title: 'Débat Campus',
                description: 'Chaque semaine, des étudiants débattent sur des sujets de société. Un format dynamique et engagé pour entendre la voix de la jeunesse.',
                schedule: 'Vendredi 19h',
                hosts: 'Divers intervenants',
                youtube_url: 'https://youtube.com'
            },
            {
                title: 'TELEX Sports',
                description: 'Toute l\'actualité sportive universitaire. Reportages, interviews et analyses des compétitions étudiantes.',
                schedule: 'Samedi 17h',
                hosts: 'Marc & Sophie',
                youtube_url: 'https://youtube.com'
            }
        ];
        
        for (const program of samplePrograms) {
            await dbRun(
                `INSERT INTO programs (title, description, schedule, hosts, youtube_url) 
                 VALUES (?, ?, ?, ?, ?)`,
                [program.title, program.description, program.schedule, program.hosts, program.youtube_url]
            );
        }
        
        // Données de démo pour la galerie
        const sampleGallery = [
            {
                title: 'Tournage en extérieur',
                description: 'Notre équipe en plein tournage sur le campus universitaire',
                image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop',
                category: 'Coulisses'
            },
            {
                title: 'Studio TELEX',
                description: 'Notre studio équipé pour les émissions en direct',
                image_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w-600&h=400&fit=crop',
                category: 'Équipement'
            },
            {
                title: 'Équipe de reporters',
                description: 'Nos journalistes en formation',
                image_url: 'https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=600&h=400&fit=crop',
                category: 'Équipe'
            }
        ];
        
        for (const item of sampleGallery) {
            await dbRun(
                `INSERT INTO gallery (title, description, image_url, category) 
                 VALUES (?, ?, ?, ?)`,
                [item.title, item.description, item.image_url, item.category]
            );
        }
        
        console.log('✅ Données de démo ajoutées avec succès !');
        console.log('🔑 Identifiants admin par défaut :');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('\n⚠️  IMPORTANT : Changez ces identifiants immédiatement !');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
    } finally {
        process.exit();
    }
}

// Exécuter le script
initializeWithSampleData();