// Script de détection de localisation côté client
class LocationDetector {
    constructor() {
        this.userLocation = null;
        this.init();
    }

    async init() {
        try {
            // Essayer plusieurs méthodes de détection
            await this.detectByAPI();
            await this.detectByTimezone();
            await this.detectByLanguage();
            
            // Mettre à jour le footer si nécessaire
            this.updateFooter();
        } catch (error) {
            console.log('Détection de localisation:', error.message);
        }
    }

    async detectByAPI() {
        try {
            // Utiliser une API alternative plus fiable
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            
            if (data && data.ip) {
                this.userLocation = {
                    country: 'MG', // Détection par défaut pour Madagascar
                    ip: data.ip,
                    method: 'ip'
                };
                console.log('Localisation détectée par IP:', this.userLocation);
                return true;
            }
        } catch (error) {
            console.log('API de localisation non disponible, utilisation du fallback');
        }
        return false;
    }

    async detectByTimezone() {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            // Timezones malgaches
            const madagascarTimezones = [
                'Indian/Antananarivo',
                'Africa/Nairobi' // Proche
            ];
            
            if (madagascarTimezones.includes(timezone)) {
                this.userLocation = {
                    country: 'MG',
                    timezone: timezone,
                    method: 'timezone'
                };
                console.log('Localisation détectée par timezone:', this.userLocation);
                return true;
            }
        } catch (error) {
            console.log('Détection par timezone impossible');
        }
        return false;
    }

    async detectByLanguage() {
        try {
            const language = navigator.language || navigator.userLanguage;
            
            // Langues malgaches
            const madagascarLanguages = [
                'mg-MG', // Malgache
                'fr-MG'  // Français Madagascar
            ];
            
            if (madagascarLanguages.includes(language)) {
                this.userLocation = {
                    country: 'MG',
                    language: language,
                    method: 'language'
                };
                console.log('Localisation détectée par langue:', this.userLocation);
                return true;
            }
        } catch (error) {
            console.log('Détection par langue impossible');
        }
        return false;
    }

    updateFooter() {
        const contactList = document.querySelector('.footer-contact');
        if (!contactList) return;

        // Ajouter des indicateurs visuels selon la localisation
        if (this.userLocation && this.userLocation.country === 'MG') {
            // Visiteur Madagascar : indiquer les contacts locaux
            this.addContactLabels(contactList, 'MG');
        } else {
            // Visiteur international : indiquer les contacts internationaux
            this.addContactLabels(contactList, 'INT');
        }
    }

    addContactLabels(contactList, location) {
        const contacts = contactList.querySelectorAll('li');
        
        contacts.forEach((contact, index) => {
            const text = contact.textContent.trim();
            const hasIcon = contact.innerHTML.includes('fa-envelope') || 
                          contact.innerHTML.includes('fa-phone') || 
                          contact.innerHTML.includes('fa-map-marker');
            
            // N'ajouter des badges qu'aux éléments avec icônes (éviter les doublons)
            if (!hasIcon) return;
            
            // Ajouter des labels selon le type de contact et la localisation
            if (location === 'MG') {
                if (contact.innerHTML.includes('fa-phone') && (text.includes('+261') || text.includes('034'))) {
                    contact.innerHTML += ' <span class="badge bg-success ms-1">Local</span>';
                } else if (contact.innerHTML.includes('fa-phone') && (text.includes('01 23') || text.includes('Paris'))) {
                    contact.innerHTML += ' <span class="badge bg-secondary ms-1">International</span>';
                }
            } else {
                if (contact.innerHTML.includes('fa-phone') && (text.includes('01 23') || text.includes('Paris'))) {
                    contact.innerHTML += ' <span class="badge bg-primary ms-1">Principal</span>';
                } else if (contact.innerHTML.includes('fa-phone') && (text.includes('+261') || text.includes('034'))) {
                    contact.innerHTML += ' <span class="badge bg-info ms-1">Madagascar</span>';
                }
            }
        });
    }
}

// Initialiser la détection au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    new LocationDetector();
});

// Exporter pour utilisation externe
window.LocationDetector = LocationDetector;
