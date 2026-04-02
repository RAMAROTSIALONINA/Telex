const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class VideoThumbnailGenerator {
    constructor() {
        this.videosDir = path.join(__dirname, '../public/uploads/videos');
        this.thumbnailsDir = path.join(__dirname, '../public/uploads/videos/thumbnails');
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.thumbnailsDir)) {
            fs.mkdirSync(this.thumbnailsDir, { recursive: true });
            console.log('📁 Création du dossier thumbnails:', this.thumbnailsDir);
        }
    }

    async generateThumbnail(videoPath, outputPath = null) {
        return new Promise((resolve, reject) => {
            const videoFileName = path.basename(videoPath);
            const videoNameWithoutExt = path.parse(videoFileName).name;
            const thumbnailFileName = `${videoNameWithoutExt}.jpg`;
            const finalThumbnailPath = outputPath || path.join(this.thumbnailsDir, thumbnailFileName);

            // Vérifier si le thumbnail existe déjà
            if (fs.existsSync(finalThumbnailPath)) {
                console.log(`✅ Thumbnail existe déjà: ${thumbnailFileName}`);
                resolve(finalThumbnailPath);
                return;
            }

            // Vérifier si la vidéo existe
            const fullVideoPath = path.join(this.videosDir, videoFileName);
            if (!fs.existsSync(fullVideoPath)) {
                console.error(`❌ Fichier vidéo non trouvé: ${fullVideoPath}`);
                reject(new Error('Fichier vidéo non trouvé'));
                return;
            }

            // Utiliser FFmpeg pour générer le thumbnail
            const command = `ffmpeg -i "${fullVideoPath}" -ss 00:00:01.000 -vframes 1 -vf "scale=1280:720:force_original_aspect_ratio=decrease" -q:v 2 "${finalThumbnailPath}"`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Erreur FFmpeg:', error);
                    console.error('❌ Stderr:', stderr);
                    
                    // Si FFmpeg n'est pas disponible, créer un placeholder
                    this.createPlaceholderThumbnail(thumbnailFileName)
                        .then(() => resolve(finalThumbnailPath))
                        .catch(reject);
                    return;
                }

                if (fs.existsSync(finalThumbnailPath)) {
                    console.log(`✅ Thumbnail généré avec succès: ${thumbnailFileName}`);
                    resolve(finalThumbnailPath);
                } else {
                    console.error('❌ Le thumbnail n\'a pas été généré');
                    reject(new Error('Échec de la génération du thumbnail'));
                }
            });
        });
    }

    async createPlaceholderThumbnail(thumbnailFileName) {
        return new Promise((resolve, reject) => {
            const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFileName);
            
            // Créer une image SVG placeholder
            const svgContent = `
                <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#E63946;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#1D3557;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <rect width="1280" height="720" fill="url(#grad)"/>
                    <text x="640" y="360" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle">
                        🎬 Vidéo
                    </text>
                    <text x="640" y="420" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
                        ${path.parse(thumbnailFileName).name}
                    </text>
                </svg>
            `;

            fs.writeFileSync(thumbnailPath.replace('.jpg', '.svg'), svgContent);
            
            // Convertir SVG en JPG si possible, sinon garder SVG
            try {
                const command = `convert "${thumbnailPath.replace('.jpg', '.svg')}" "${thumbnailPath}"`;
                exec(command, (error) => {
                    if (error) {
                        console.log('⚠️ Conversion SVG->JPG échouée, utilisation du SVG');
                        fs.renameSync(thumbnailPath.replace('.jpg', '.svg'), thumbnailPath);
                    }
                    resolve(thumbnailPath);
                });
            } catch (e) {
                fs.renameSync(thumbnailPath.replace('.jpg', '.svg'), thumbnailPath);
                resolve(thumbnailPath);
            }
        });
    }

    async generateAllThumbnails() {
        try {
            const videoFiles = fs.readdirSync(this.videosDir)
                .filter(file => /\.(mp4|webm|ogg|mov|avi)$/i.test(file));

            console.log(`🎬 Génération de thumbnails pour ${videoFiles.length} vidéos...`);

            for (const videoFile of videoFiles) {
                try {
                    await this.generateThumbnail(videoFile);
                } catch (error) {
                    console.error(`❌ Erreur pour ${videoFile}:`, error.message);
                }
            }

            console.log('✅ Génération des thumbnails terminée');
        } catch (error) {
            console.error('❌ Erreur lors de la lecture du dossier vidéos:', error);
        }
    }

    async checkFFmpeg() {
        return new Promise((resolve) => {
            exec('ffmpeg -version', (error) => {
                if (error) {
                    console.log('⚠️ FFmpeg n\'est pas installé. Utilisation de placeholders.');
                    resolve(false);
                } else {
                    console.log('✅ FFmpeg est disponible');
                    resolve(true);
                }
            });
        });
    }
}

module.exports = VideoThumbnailGenerator;

// Si ce script est exécuté directement
if (require.main === module) {
    const generator = new VideoThumbnailGenerator();
    
    generator.checkFFmpeg().then((hasFFmpeg) => {
        if (!hasFFmpeg) {
            console.log('⚠️ Installation de FFmpeg recommandée pour de meilleurs thumbnails');
            console.log('📦 Installation: sudo apt-get install ffmpeg (Linux) ou brew install ffmpeg (macOS)');
        }
        
        generator.generateAllThumbnails();
    });
}
