// Navigation dynamique - TELEX
class TelexNavigation {
    constructor() {
        this.contentContainer = document.getElementById('page-content-container');
        this.menuLinks = document.querySelectorAll('#mainNavMenu .nav-link[data-page]');
        this.currentPage = window.location.pathname;
        
        this.init();
    }
    
    init() {
        if (!this.contentContainer || !this.menuLinks.length) return;
        
        // Écouter les clics sur les liens du menu
        this.menuLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleMenuClick(e, link));
        });
        
        // Gérer le bouton retour du navigateur
        window.addEventListener('popstate', (e) => this.handlePopState(e));
        
        console.log('Navigation TELEX initialisée');
    }
    
    handleMenuClick(e, link) {
        e.preventDefault();
        
        const targetUrl = link.getAttribute('data-url');
        const pageName = link.getAttribute('data-page');
        
        // Ne rien faire si déjà sur cette page
        if (targetUrl === this.currentPage) return;
        
        // Mettre à jour le menu actif
        this.updateActiveMenu(link);
        
        // Charger le contenu
        this.loadPageContent(targetUrl);
        
        // Mettre à jour l'URL
        this.updateBrowserUrl(targetUrl, pageName);
        
        // Fermer le menu mobile
        this.closeMobileMenu();
    }
    
    updateActiveMenu(activeLink) {
        // Retirer 'active' de tous les liens
        this.menuLinks.forEach(link => link.classList.remove('active'));
        
        // Ajouter 'active' au lien cliqué
        activeLink.classList.add('active');
    }
    
    async loadPageContent(url) {
        try {
            // Afficher un indicateur de chargement
            this.showLoading();
            
            // Récupérer la page complète
            const response = await fetch(url);
            const html = await response.text();
            
            // Parser le HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extraire le contenu principal
            // Chercher d'abord un conteneur spécifique, puis le main, puis body
            let newContent = doc.querySelector('#page-content-container') ||
                            doc.querySelector('main') ||
                            doc.querySelector('.container') ||
                            doc.body;
            
            if (newContent) {
                // Animation de transition
                this.contentContainer.style.opacity = '0.5';
                
                // Attendre un peu pour l'animation
                await new Promise(resolve => setTimeout(resolve, 150));
                
                // Remplacer le contenu
                this.contentContainer.innerHTML = newContent.innerHTML;
                
                // Animation d'apparition
                this.contentContainer.style.opacity = '1';
                this.contentContainer.style.transition = 'opacity 0.3s ease';
                
                // Mettre à jour l'URL courante
                this.currentPage = url;
                
                // Réinitialiser les fonctionnalités JS
                this.reinitializeFeatures();
                
                // Défiler vers le haut
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            
        } catch (error) {
            console.error('Erreur de chargement:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }
    
    showLoading() {
        // Créer un overlay de chargement
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-telex" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2">Chargement...</p>
            </div>
        `;
        
        document.body.appendChild(loadingOverlay);
    }
    
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    showError() {
        this.contentContainer.innerHTML = `
            <div class="container text-center py-5">
                <div class="alert alert-danger">
                    <h4><i class="fas fa-exclamation-triangle me-2"></i>Erreur de chargement</h4>
                    <p class="mb-3">Impossible de charger le contenu. Veuillez réessayer.</p>
                    <button onclick="location.reload()" class="btn btn-telex">
                        <i class="fas fa-redo me-2"></i>Rafraîchir la page
                    </button>
                </div>
            </div>
        `;
    }
    
    updateBrowserUrl(url, pageName) {
        // Extraire le titre de la page
        const pageTitle = document.querySelector(`[data-page="${pageName}"]`).textContent.trim();
        
        // Mettre à jour l'historique
        history.pushState({ url: url }, pageTitle, url);
        
        // Mettre à jour le titre de la page
        document.title = `${pageTitle} - TELEX`;
    }
    
    handlePopState(e) {
        if (e.state && e.state.url) {
            // Trouver le lien correspondant à l'URL
            const link = document.querySelector(`[data-url="${e.state.url}"]`);
            if (link) {
                this.updateActiveMenu(link);
                this.loadPageContent(e.state.url);
            }
        }
    }
    
    closeMobileMenu() {
        const mobileMenu = document.querySelector('.navbar-collapse.show');
        if (mobileMenu) {
            mobileMenu.classList.remove('show');
        }
    }
    
    reinitializeFeatures() {
        // Réexécuter les scripts principaux
        if (typeof initContactForm === 'function') initContactForm();
        if (typeof initNewsletterForm === 'function') initNewsletterForm();
        if (typeof initGallerySystem === 'function') initGallerySystem();
        if (typeof initAnimations === 'function') initAnimations();
        
        // Réinitialiser Bootstrap components
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        if (tooltips.length && typeof bootstrap !== 'undefined') {
            tooltips.forEach(el => new bootstrap.Tooltip(el));
        }
    }
}

// Initialiser quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    new TelexNavigation();
});