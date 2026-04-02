// Script simple de traduction pour index et about
class SimpleLanguageManager {
    constructor() {
        this.currentLang = localStorage.getItem('telex-lang') || 'fr';
        this.translations = {};
        this.loadTranslations();
    }

    async loadTranslations() {
        try {
            const response = await fetch('/api/translations');
            if (response.ok) {
                this.translations = await response.json();
                // Initialiser la langue après le chargement des traductions
                this.updateTranslatedElements();
                this.updateLanguageLinks();
            }
        } catch (error) {
            console.error('Erreur chargement traductions:', error);
        }
    }

    getTranslation(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang] || this.translations.fr;
        
        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                break;
            }
        }
        
        return value || key;
    }

    setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('telex-lang', lang);
        document.documentElement.lang = lang;
        
        // Mettre à jour les éléments traduits
        this.updateTranslatedElements();
        
        // Mettre à jour les liens de langue
        this.updateLanguageLinks();
        
        // Notifier les autres pages
        this.notifyLanguageChange(lang);
    }

    updateTranslatedElements() {
        // Mettre à jour tous les éléments avec data-translate
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.getTranslation(key);
            
            if (element.tagName === 'INPUT' && element.type === 'submit') {
                element.value = translation;
            } else {
                element.textContent = translation;
            }
        });
    }

    updateLanguageLinks() {
        // Mettre à jour les liens du dropdown de langue
        const frLink = document.querySelector('a[href="?lang=fr"]');
        const enLink = document.querySelector('a[href="?lang=en"]');
        const langSpan = document.querySelector('#languageDropdown span');
        
        if (frLink && enLink) {
            frLink.classList.toggle('active', this.currentLang === 'fr');
            enLink.classList.toggle('active', this.currentLang === 'en');
        }
        
        // Mettre à jour le texte du dropdown
        if (langSpan) {
            langSpan.textContent = this.currentLang === 'en' ? 'EN' : 'FR';
        }
    }

    notifyLanguageChange(lang) {
        // Émettre un événement pour les autres onglets
        const event = new CustomEvent('languageChange', {
            detail: { lang }
        });
        document.dispatchEvent(event);
        
        // Sauvegarder dans sessionStorage pour synchronisation
        sessionStorage.setItem('telex-lang-sync', JSON.stringify({
            lang,
            timestamp: Date.now()
        }));
    }

    init() {
        // Initialiser la langue depuis localStorage ou depuis le paramètre URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        
        if (urlLang && (urlLang === 'fr' || urlLang === 'en')) {
            this.currentLang = urlLang;
            localStorage.setItem('telex-lang', urlLang);
        }
        
        document.documentElement.lang = this.currentLang;
        
        // Écouter les changements de langue depuis d'autres onglets
        document.addEventListener('languageChange', (event) => {
            const { lang } = event.detail;
            if (lang !== this.currentLang) {
                this.currentLang = lang;
                localStorage.setItem('telex-lang', lang);
                document.documentElement.lang = lang;
                this.updateTranslatedElements();
                this.updateLanguageLinks();
            }
        });

        // Vérifier la synchronisation au chargement
        const syncData = sessionStorage.getItem('telex-lang-sync');
        if (syncData) {
            const { lang, timestamp } = JSON.parse(syncData);
            if (Date.now() - timestamp < 5000) { // 5 secondes
                this.setLanguage(lang);
                sessionStorage.removeItem('telex-lang-sync');
            }
        }

        // Initialiser les sélecteurs de langue
        this.initLanguageSelectors();
    }

    initLanguageSelectors() {
        // Cibler les liens du dropdown de langue
        document.querySelectorAll('a[href="?lang=fr"], a[href="?lang=en"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = link.getAttribute('href').includes('lang=en') ? 'en' : 'fr';
                this.setLanguage(lang);
            });
        });
    }
}

// Initialiser
const languageManager = new SimpleLanguageManager();
languageManager.init();
