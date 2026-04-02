// Middleware simple de langue pour index et about uniquement
const fs = require('fs');
const path = require('path');

function loadTranslations() {
    const translationsPath = path.join(__dirname, '../locales/translations.json');
    
    if (fs.existsSync(translationsPath)) {
        const translationsData = fs.readFileSync(translationsPath, 'utf8');
        return JSON.parse(translationsData);
    }
    return { fr: {}, en: {} };
}

const translations = loadTranslations();

function getTranslation(key, lang) {
    const keys = key.split('.');
    let value = translations[lang] || translations.fr;
    
    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k];
        } else {
            break;
        }
    }
    
    return value || key;
}

function middleware() {
    return (req, res, next) => {
        // Détecter la langue depuis l'URL ou session
        const urlLang = req.query.lang;
        const sessionLang = req.session.lang;
        const browserLang = req.acceptsLanguages ? req.acceptsLanguages()[0] : 'fr';
        
        // Priorité: URL > Session > Navigateur > Français par défaut
        req.currentLang = urlLang || sessionLang || (browserLang && browserLang.startsWith('en') ? 'en' : 'fr');
        
        // Sauvegarder en session
        req.session.lang = req.currentLang;
        
        // Fonction de traduction pour les vues
        res.locals.__ = (key) => getTranslation(key, req.currentLang);
        res.locals.currentLang = req.currentLang;
        
        next();
    };
}

module.exports = {
    middleware,
    getTranslation
};
