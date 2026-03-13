// Middleware pour détecter la localisation de l'utilisateur
const detectLocation = (req, res, next) => {
    // Récupérer le pays depuis l'IP ou depuis un paramètre
    const userIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    
    // Détection basique par IP (pour l'exemple)
    let userLocation = {
        country: 'FR', // Par défaut : France
        ip: userIP
    };
    
    // Vérifier si l'IP est locale à Madagascar (plages d'IP connues)
    const madagascarIPRanges = [
        '41.', // Plages d'IP Madagascar
        '154.',
        '197.',
        '196.'
    ];
    
    // Vérifier si l'IP commence par une plage Madagascar
    const isMadagascarIP = madagascarIPRanges.some(range => userIP && userIP.startsWith(range));
    
    if (isMadagascarIP) {
        userLocation.country = 'MG';
    }
    
    // Alternative : vérifier par header de pays (si disponible via Cloudflare, etc.)
    const countryHeader = req.headers['cf-ipcountry'] || req.headers['x-country-code'];
    if (countryHeader) {
        userLocation.country = countryHeader.toUpperCase();
    }
    
    // Alternative : vérifier par paramètre URL (pour testing)
    if (req.query.country) {
        userLocation.country = req.query.country.toUpperCase();
    }
    
    // Ajouter la localisation aux variables locales pour toutes les vues
    res.locals.userLocation = userLocation;
    
    next();
};

module.exports = detectLocation;
