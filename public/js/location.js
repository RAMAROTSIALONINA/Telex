class LocationDetector {
    constructor() {
        this.userLocation = null;
        this.init();
    }

    init() {
        this.detectByTimezone() || this.detectByLanguage();
        this.updateFooter();
    }

    detectByTimezone() {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (['Indian/Antananarivo', 'Africa/Nairobi'].includes(timezone)) {
                this.userLocation = { country: 'MG', method: 'timezone' };
                return true;
            }
        } catch (e) {}
        return false;
    }

    detectByLanguage() {
        try {
            const language = navigator.language || navigator.userLanguage;
            if (['mg-MG', 'fr-MG'].includes(language)) {
                this.userLocation = { country: 'MG', method: 'language' };
                return true;
            }
        } catch (e) {}
        return false;
    }

    updateFooter() {
        const contactList = document.querySelector('.footer-contact');
        if (!contactList) return;
        const location = (this.userLocation && this.userLocation.country === 'MG') ? 'MG' : 'INT';
        this.addContactLabels(contactList, location);
    }

    addContactLabels(contactList, location) {
        contactList.querySelectorAll('li').forEach(contact => {
            const html = contact.innerHTML;
            const text = contact.textContent.trim();
            const hasIcon = html.includes('fa-envelope') || html.includes('fa-phone') || html.includes('fa-map-marker');
            if (!hasIcon) return;

            if (location === 'MG') {
                if (html.includes('fa-phone') && (text.includes('+261') || text.includes('034'))) {
                    contact.innerHTML += ' <span class="badge bg-success ms-1">Local</span>';
                } else if (html.includes('fa-phone') && (text.includes('01 23') || text.includes('Paris'))) {
                    contact.innerHTML += ' <span class="badge bg-secondary ms-1">International</span>';
                }
            } else {
                if (html.includes('fa-phone') && (text.includes('01 23') || text.includes('Paris'))) {
                    contact.innerHTML += ' <span class="badge bg-primary ms-1">Principal</span>';
                } else if (html.includes('fa-phone') && (text.includes('+261') || text.includes('034'))) {
                    contact.innerHTML += ' <span class="badge bg-info ms-1">Madagascar</span>';
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new LocationDetector());
window.LocationDetector = LocationDetector;
