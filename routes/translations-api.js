// Route API pour servir les traductions
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/', (req, res) => {
    try {
        const translationsPath = path.join(__dirname, '../locales/translations.json');
        
        if (fs.existsSync(translationsPath)) {
            const translationsData = fs.readFileSync(translationsPath, 'utf8');
            const translations = JSON.parse(translationsData);
            
            res.json(translations);
        } else {
            res.status(404).json({ error: 'Fichier de traductions non trouvé' });
        }
    } catch (error) {
        console.error('Erreur lecture traductions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
