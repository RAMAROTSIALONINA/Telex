// NAVIGATION SIMPLE SANS AJAX
class SimpleNavigation {
    constructor() {
        this.currentPage = window.location.pathname.replace('/', '') || 'home';
        this.init();
    }
    
    init() {
        // Mettre à jour le menu
        this.updateMenu();
        
        // Écouter les clics sur les liens
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => this.handleClick(e, link));
        });
    }
    
    updateMenu() {
        // Mettre à jour le menu actif
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === this.currentPage) {
                link.classList.add('active');
            }
        });
    }
    
    handleClick(e, link) {
        e.preventDefault();
        
        const page = link.getAttribute('data-page');
        const url = page === 'home' ? '/' : `/${page}`;
        
        // Changer la page
        this.navigateTo(url, page);
    }
    
    async navigateTo(url, page) {
        // Si déjà sur la page, ne rien faire
        if (window.location.pathname === url) return;
        
        // Mettre à jour l'URL
        history.pushState({ page }, '', url);
        
        // Changer le contenu
        await this.loadPage(url);
        
        // Mettre à jour le menu
        this.currentPage = page;
        this.updateMenu();
        
        // Fermer le menu mobile
        this.closeMobileMenu();
        
        // Défiler vers le haut
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    async loadPage(url) {
        try {
            // Récupérer la nouvelle page
            const response = await fetch(url);
            const html = await response.text();
            
            // Extraire le contenu principal
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const content = doc.querySelector('#current-page') || 
                           doc.querySelector('main') || 
                           doc.querySelector('.container');
            
            if (content) {
                // Remplacer le contenu
                document.getElementById('current-page').innerHTML = content.innerHTML;
                
                // Réinitialiser les scripts
                this.reinitializeScripts();
            }
            
        } catch (error) {
            console.error('Erreur:', error);
        }
    }
    
    closeMobileMenu() {
        const menu = document.querySelector('.navbar-collapse.show');
        if (menu) menu.classList.remove('show');
    }
    
    reinitializeScripts() {
        // Réinitialiser les scripts spécifiques
        if (typeof initContactForm === 'function') initContactForm();
        if (typeof initGallery === 'function') initGallery();
        if (typeof initAnimations === 'function') initAnimations();
    }
}

// Démarrer
document.addEventListener('DOMContentLoaded', () => {
    new SimpleNavigation();
});