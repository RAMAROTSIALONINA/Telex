// Middleware de gestion de langue
const fs = require('fs');
const path = require('path');

class LanguageManager {
    constructor() {
        this.translations = {};
        this.defaultLanguage = 'fr';
        this.supportedLanguages = ['fr', 'en'];
        this.loadTranslations();
    }

    loadTranslations() {
        this.supportedLanguages.forEach(lang => {
            const filePath = path.join(__dirname, '../locales', `${lang}.json`);
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    this.translations[lang] = JSON.parse(content);
                }
            } catch (error) {
                console.error(`Erreur de chargement des traductions pour ${lang}:`, error);
            }
        });
    }

    getLanguage(req) {
        // 1. Vérifier le paramètre URL
        const urlLang = req.query.lang || req.params.lang;
        if (urlLang && this.supportedLanguages.includes(urlLang)) {
            return urlLang;
        }

        // 2. Vérifier le cookie
        const cookieLang = req.cookies?.language;
        if (cookieLang && this.supportedLanguages.includes(cookieLang)) {
            return cookieLang;
        }

        // 3. Vérifier l'en-tête Accept-Language
        const acceptLanguage = req.headers['accept-language'];
        if (acceptLanguage) {
            const preferredLang = acceptLanguage.split(',')[0].split('-')[0];
            if (this.supportedLanguages.includes(preferredLang)) {
                return preferredLang;
            }
        }

        // 4. Langue par défaut
        return this.defaultLanguage;
    }

    translate(key, language = null) {
        // Utiliser la langue détectée si non spécifiée
        if (!language) {
            language = this.getLanguage(req);
        }
        
        const keys = key.split('.');
        let value = this.translations[language];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Fallback vers le français si la traduction n'existe pas
                value = this.translations['fr'];
                for (const fallbackKey of keys) {
                    if (value && typeof value === 'object' && fallbackKey in value) {
                        value = value[fallbackKey];
                        break; 
                    } else {
                        return key; // Retourner la clé si aucune traduction trouvée
                    }
                }
                break; 
            }
        }

        const result = typeof value === 'string' ? value : key;
        
        // Debug : Afficher les traductions dans la console
        console.log(` Traduction [${language}]: ${key} → ${result}`);
        
        return result;
    }

    middleware() {
        return (req, res, next) => {
            const language = this.getLanguage(req);
            
            // Définir la langue dans res.locals pour les templates
            res.locals.language = language;
            res.locals.__ = (key) => this.translate(key, language);
            res.locals.currentLang = language;
            res.locals.supportedLanguages = this.supportedLanguages;

            // Définir le cookie de langue
            if (req.query.lang && this.supportedLanguages.includes(req.query.lang)) {
                res.cookie('language', req.query.lang, {
                    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 an
                    httpOnly: true
                });
            }

            next();
        };
    }
}

module.exports = new LanguageManager();
