// Telex Main JavaScript - Version corrigée et optimisée
document.addEventListener('DOMContentLoaded', function() {
    console.log('Telex - Interface professionnelle chargée avec succès');
    
    // Reset des styles problématiques au chargement
    resetProblematicStyles();
    
    // Initialiser toutes les fonctionnalités
    initNavigationSystem();
    initContactForm();
    initNewsletterForm();
    initAnimations();
    initMobileMenu();
    initImageOptimization();
    initScrollEffects();
    initGallery(); // IMPORTANT : Ajouté
});

// ===== RESET DES STYLES PROBLÉMATIQUES - DÉSACTIVÉ POUR VIDÉOS =====
function resetProblematicStyles() {
    // DÉSACTIVÉ : Ne pas toucher aux éléments vidéo pour éviter les conflits
    // Les configurations vidéo sont maintenant gérées dans news.ejs et news-single.ejs
    console.log('🚫 Reset des styles problématiques désactivé pour les vidéos');
}

// ===== APPLICATION DE DIMENSIONS COHÉRENTES PAR CONTEXTE - DÉSACTIVÉ POUR VIDÉOS =====
function applyConsistentDimensions() {
    // DÉSACTIVÉ : Ne pas appliquer de styles sur les conteneurs vidéo
    // Les configurations vidéo sont maintenant gérées dans news.ejs et news-single.ejs
    console.log('🚫 Application des dimensions désactivée pour les vidéos');
}

// ===== EMPÊCHER LES OVERRIDES CSS GLOBAUX - DÉSACTIVÉ POUR VIDÉOS =====
function preventGlobalOverrides() {
    // DÉSACTIVÉ : Ne pas appliquer de styles globaux qui affectent les vidéos
    // Les configurations vidéo sont maintenant gérées dans news.ejs et news-single.ejs
    console.log('🚫 Empêchement des overrides CSS désactivé pour les vidéos');
}

// ===== OPTIMISATION DES IMAGES CORRIGÉE =====
function initImageOptimization() {
    // NE PAS MODIFIER LES SRC EXISTANTS
    // Ajouter lazy loading uniquement pour les nouvelles images
    
    const images = document.querySelectorAll('img[data-src]:not([data-loaded])');
    
    if (images.length === 0) return;
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const dataSrc = img.getAttribute('data-src');
                
                if (dataSrc && !img.src.includes(dataSrc)) {
                    img.src = dataSrc;
                }
                
                img.setAttribute('data-loaded', 'true');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '100px', // Augmenté pour précharger
        threshold: 0.01
    });
    
    images.forEach(img => {
        imageObserver.observe(img);
    });
}

// SUPPRIMER LES FONCTIONS PROBLÉMATIQUES
// function clearImageCache() { ... } // SUPPRIMER
// function forceImageReload() { ... } // SUPPRIMER

// ===== GALERIE CORRIGÉE =====
function initGallery() {
    // Vérifier si la galerie est présente
    const galleryItems = document.querySelectorAll('.gallery-item');
    if (galleryItems.length === 0) return;
    
    console.log(`Initialisation galerie: ${galleryItems.length} images trouvées`);
    
    // 1. ASSURER QUE TOUTES LES IMAGES SONT VISIBLES
    galleryItems.forEach(item => {
        const img = item.querySelector('img');
        if (img) {
            // Forcer l'affichage correct
            img.style.opacity = '1';
            img.style.visibility = 'visible';
            img.style.display = 'block';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover'; // IMPORTANT pour le cadrage
        }
        
        item.style.opacity = '1';
        item.style.visibility = 'visible';
        item.style.display = 'block';
    });
    
    // 2. FILTRES
    const filterButtons = document.querySelectorAll('.gallery-filter-btn');
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                const filter = this.getAttribute('data-filter');
                console.log(`Filtre activé: ${filter}`);
                
                // Mettre à jour les boutons actifs
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Filtrer les images
                galleryItems.forEach(item => {
                    const category = item.getAttribute('data-category');
                    
                    if (filter === 'all' || category === filter) {
                        item.style.display = 'block';
                        // Animation douce
                        setTimeout(() => {
                            item.style.opacity = '1';
                            item.style.transform = 'scale(1)';
                            item.style.visibility = 'visible';
                        }, 10);
                    } else {
                        item.style.opacity = '0';
                        item.style.transform = 'scale(0.95)';
                        setTimeout(() => {
                            item.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    }
    
    // 3. LIGHTBOX AMÉLIORÉE
    const images = document.querySelectorAll('.gallery-item img');
    
    images.forEach((img, index) => {
        // Éviter les double-clics
        let clickDisabled = false;
        
        img.addEventListener('click', function(e) {
            if (clickDisabled) return;
            clickDisabled = true;
            
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`Ouverture lightbox image ${index + 1}`);
            openLightbox(index, images);
            
            setTimeout(() => {
                clickDisabled = false;
            }, 500);
        });
    });
}

function openLightbox(index, images) {
    // Vérifier si une lightbox existe déjà
    const existingLightbox = document.querySelector('.lightbox');
    if (existingLightbox) {
        document.body.removeChild(existingLightbox);
    }
    
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    
    const currentImg = images[index];
    
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <button class="lightbox-nav prev" aria-label="Image précédente">
                <i class="fas fa-chevron-left"></i>
            </button>
            <img src="${currentImg.src}" alt="${currentImg.alt}" style="max-width: 90%; max-height: 80vh; object-fit: contain;">
            <button class="lightbox-nav next" aria-label="Image suivante">
                <i class="fas fa-chevron-right"></i>
            </button>
            <button class="close" aria-label="Fermer">&times;</button>
            <div class="lightbox-counter">${index + 1} / ${images.length}</div>
        </div>
    `;
    
    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';
    
    // Attendre un tick pour l'animation
    setTimeout(() => {
        lightbox.classList.add('active');
    }, 10);
    
    // Événements
    const closeBtn = lightbox.querySelector('.close');
    const prevBtn = lightbox.querySelector('.prev');
    const nextBtn = lightbox.querySelector('.next');
    const lightboxImg = lightbox.querySelector('img');
    const counter = lightbox.querySelector('.lightbox-counter');
    
    let currentIndex = index;
    
    function updateLightbox() {
        const img = images[currentIndex];
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        counter.textContent = `${currentIndex + 1} / ${images.length}`;
        
        // Animation de transition
        lightboxImg.style.opacity = '0';
        setTimeout(() => {
            lightboxImg.style.opacity = '1';
        }, 50);
    }
    
    function closeLightbox() {
        lightbox.classList.remove('active');
        setTimeout(() => {
            if (document.body.contains(lightbox)) {
                document.body.removeChild(lightbox);
                document.body.style.overflow = 'auto';
            }
        }, 300);
    }
    
    closeBtn.addEventListener('click', closeLightbox);
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateLightbox();
    });
    
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % images.length;
        updateLightbox();
    });
    
    // Navigation clavier
    function handleKeydown(e) {
        if (!document.body.contains(lightbox)) {
            document.removeEventListener('keydown', handleKeydown);
            return;
        }
        
        switch(e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                currentIndex = (currentIndex - 1 + images.length) % images.length;
                updateLightbox();
                break;
            case 'ArrowRight':
                currentIndex = (currentIndex + 1) % images.length;
                updateLightbox();
                break;
        }
    }
    
    document.addEventListener('keydown', handleKeydown);
}

// ===== SYSTÈME DE NAVIGATION =====
function initNavigationSystem() {
    const menuLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Smooth scroll pour les ancres
            const href = this.getAttribute('href');
            if (href && href.startsWith('#') && href.length > 1) {
                e.preventDefault();
                const targetId = href.substring(1); // Enlever le #
                const target = document.getElementById(targetId) || document.querySelector(`[id="${targetId}"]`);
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            }
            
            // Fermer le menu mobile
            closeMobileMenu();
        });
    });
}

// ===== FORMULAIRES (inchangé mais vérifié) =====
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;
    
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Validation
        const isValid = validateContactForm(this);
        if (!isValid) return;
        
        // Préparation de l'envoi
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Envoi en cours...';
        submitBtn.disabled = true;
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            showMessageAlert('Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.', 'success');
            this.reset();
        } catch (error) {
            showMessageAlert('Erreur lors de l\'envoi du message. Veuillez réessayer.', 'danger');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // Validation en temps réel
    contactForm.querySelectorAll('input, textarea, select').forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
    });
}

function validateContactForm(form) {
    let isValid = true;
    
    const fields = [
        { element: form.querySelector('#name'), required: true },
        { element: form.querySelector('#email'), required: true },
        { element: form.querySelector('#subject'), required: true },
        { element: form.querySelector('#message'), required: true }
    ];
    
    fields.forEach(field => {
        if (field.element && !validateField(field.element, true)) {
            isValid = false;
        }
    });
    
    return isValid;
}

function validateField(field, showError = false) {
    const value = field.value.trim();
    
    field.classList.remove('is-invalid', 'is-valid');
    
    if (field.required && !value) {
        if (showError) {
            field.classList.add('is-invalid');
            showFieldError(field, 'Ce champ est obligatoire');
        }
        return false;
    }
    
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            if (showError) {
                field.classList.add('is-invalid');
                showFieldError(field, 'Veuillez entrer un email valide');
            }
            return false;
        }
    }
    
    field.classList.add('is-valid');
    return true;
}

function showFieldError(field, message) {
    let errorDiv = field.parentNode.querySelector('.invalid-feedback');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        field.parentNode.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
}

function showMessageAlert(message, type) {
    const alert = document.getElementById('messageAlert');
    if (!alert) return;
    
    alert.textContent = message;
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

function initNewsletterForm() {
    const newsletterForm = document.getElementById('newsletterForm');
    if (!newsletterForm) return;
    
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const emailInput = this.querySelector('input[type="email"]');
        const email = emailInput.value.trim();
        
        if (!email) {
            showMessageAlert('Veuillez entrer votre email', 'warning');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showMessageAlert('Veuillez entrer un email valide', 'warning');
            return;
        }
        
        const button = this.querySelector('button[type="submit"]');
        const originalText = button.innerHTML;
        
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Inscription...';
        button.disabled = true;
        
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-check me-2"></i>Inscrit !';
            button.classList.remove('btn-primary');
            button.classList.add('btn-success');
            
            showMessageAlert(`Merci pour votre inscription à la newsletter Telex !`, 'success');
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('btn-success');
                button.classList.add('btn-primary');
                button.disabled = false;
                this.reset();
            }, 2000);
        }, 1500);
    });
}

// ===== ANIMATIONS =====
function initAnimations() {
    // Animation au scroll
    const animateElements = document.querySelectorAll('.program-card, .team-card, .mission-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    animateElements.forEach(element => {
        observer.observe(element);
    });
}

// ===== EFFETS DE SCROLL =====
function initScrollEffects() {
    // Back to top button
    const backToTop = document.createElement('button');
    backToTop.innerHTML = '<i class="fas fa-chevron-up"></i>';
    backToTop.className = 'btn btn-primary back-to-top';
    backToTop.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(230, 57, 70, 0.3);
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(backToTop);
    
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    window.addEventListener('scroll', () => {
        backToTop.style.display = window.pageYOffset > 300 ? 'flex' : 'none';
    });
}

// ===== MENU MOBILE =====
function initMobileMenu() {
    const navbarToggler = document.querySelector('.navbar-toggler');
    if (navbarToggler) {
        navbarToggler.addEventListener('click', function() {
            document.querySelector('.navbar-collapse').classList.toggle('show');
        });
    }
}

function closeMobileMenu() {
    const mobileMenu = document.querySelector('.navbar-collapse.show');
    if (mobileMenu) {
        mobileMenu.classList.remove('show');
    }
}

// ===== GESTION DES ERREURS D'IMAGES CORRIGÉE =====
window.addEventListener('load', function() {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
        // Vérifier si l'image est chargée
        if (!img.complete || img.naturalHeight === 0) {
            console.warn(`Image non chargée: ${img.src}`);
            
            // Réessayer le chargement
            const originalSrc = img.src;
            img.src = '';
            setTimeout(() => {
                img.src = originalSrc;
            }, 100);
        }
        
        // Gestion des erreurs de chargement
        img.addEventListener('error', function() {
            console.warn(`Échec du chargement: ${this.src}`);
            
            // Ne pas remplacer par placeholder sur la galerie
            if (!this.closest('.gallery-item')) {
                this.src = '/images/Telex.png'; // Logo de secours
                this.style.backgroundColor = '#f8f9fa';
                this.style.padding = '10px';
                this.style.borderRadius = '8px';
            }
        });
    });
    
    // Vérifier spécifiquement la galerie uniquement si on est sur la page galerie
    if (window.location.pathname.includes('/gallery')) {
        const galleryImages = document.querySelectorAll('.gallery-item img');
        console.log(`Galerie: ${galleryImages.length} images détectées`);
        
        galleryImages.forEach((img, index) => {
            console.log(`Image ${index + 1}: ${img.src}`);
            
            // Forcer l'affichage correct
            img.style.objectFit = 'cover';
            img.style.width = '100%';
            img.style.height = '100%';
        });
    }
    // ===== CORRECTION DES IMAGES AU CHARGEMENT =====
function fixArticleImages() {
    console.log('Correction des images d\'articles...');
    
    // Images dans la page article unique
    const articlePageImages = document.querySelectorAll('.article-page img, .article-hero-image img');
    articlePageImages.forEach(img => {
        img.style.height = 'auto';
        img.style.maxHeight = '500px';
        img.style.objectFit = 'contain';
        img.style.width = '100%';
    });
    
    // Images dans les cartes d'articles
    const cardImages = document.querySelectorAll('.news-article-card img, .news-card-image img');
    cardImages.forEach(img => {
        img.style.height = '200px';
        img.style.objectFit = 'cover';
        img.style.width = '100%';
    });
    
    // Images dans le contenu des articles
    const contentImages = document.querySelectorAll('.article-content img');
    contentImages.forEach(img => {
        img.style.height = 'auto';
        img.style.maxHeight = '400px';
        img.style.objectFit = 'contain';
        img.style.width = '100%';
    });
}

// ===== SURVEILLANCE DES CHANGEMENTS D'IMAGES =====
function monitorImageChanges() {
    // Observer les changements dans le DOM
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.matches && 
                        (node.matches('img') || node.querySelector('img'))) {
                        setTimeout(fixArticleImages, 100);
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// ===== MODIFIER LA FONCTION DOMContentLoaded =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Telex - Interface professionnelle chargée avec succès');
    
    // Initialiser toutes les fonctionnalités
    initNavigationSystem();
    initContactForm();
    initNewsletterForm();
    initAnimations();
    initMobileMenu();
    initImageOptimization();
    initScrollEffects();
    initGallery();
    
    // AJOUTER CES DEUX LIGNES
    fixArticleImages();
    monitorImageChanges();
});
// ===== FIXATION DÉFINITIVE DES IMAGES =====
function fixAllImages() {
    console.log('Fixation des images en cours...');
    
    // 1. Page article unique
    const articlePageImages = document.querySelectorAll('.article-page img:not(.logo-img)');
    articlePageImages.forEach(img => {
        img.style.height = 'auto';
        img.style.maxHeight = '';
        img.style.objectFit = 'contain';
        img.style.width = 'auto';
        img.style.maxWidth = '100%';
        img.style.display = 'block';
        img.style.margin = '0 auto';
    });
    
    // 2. Cartes d'articles (liste)
    const cardImages = document.querySelectorAll('.news-article-card img');
    cardImages.forEach(img => {
        const container = img.closest('.article-image-container');
        if (container) {
            img.style.height = 'auto';
            img.style.maxHeight = '170px';
            img.style.objectFit = 'contain';
            img.style.width = 'auto';
            img.style.maxWidth = '100%';
            img.style.display = 'block';
            img.style.margin = '0 auto';
        }
    });
    
    // 3. Images du contenu
    const contentImages = document.querySelectorAll('.article-content img');
    contentImages.forEach(img => {
        img.style.maxHeight = '400px';
        img.style.objectFit = 'contain';
        img.style.width = 'auto';
        img.style.maxWidth = '100%';
    });
    
    // 4. Empêcher les overrides CSS globaux
    document.querySelectorAll('img').forEach(img => {
        if (!img.classList.contains('logo-img') && 
            !img.classList.contains('hero-camera-img')) {
            img.style.setProperty('height', 'auto', 'important');
            img.style.setProperty('max-height', 'none', 'important');
        }
    });
}

// ===== SURVEILLANCE AVANCÉE =====
function monitorDOMChanges() {
    const observer = new MutationObserver((mutations) => {
        let shouldFixImages = false;
        
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.matches && (node.matches('img') || node.querySelector('img'))) {
                            shouldFixImages = true;
                        }
                    }
                });
            }
        });
        
        if (shouldFixImages) {
            setTimeout(fixAllImages, 50);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Surveiller aussi les changements de style
    const styleObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const img = mutation.target;
                if (img.tagName === 'IMG' && !img.classList.contains('logo-img')) {
                    // Vérifier si un style problématique a été appliqué
                    const currentHeight = img.style.height;
                    if (currentHeight && currentHeight.includes('100%')) {
                        setTimeout(() => {
                            img.style.height = 'auto';
                        }, 10);
                    }
                }
            }
        });
    });
    
    // Observer quelques images critiques
    document.querySelectorAll('.article-page img, .news-article-card img').forEach(img => {
        styleObserver.observe(img, { attributes: true });
    });
}

// ===== MODIFIER LA FONCTION PRINCIPALE =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('TELEX - Interface chargée, application des correctifs...');
    
    // Initialisation standard
    initNavigationSystem();
    initContactForm();
    initNewsletterForm();
    initAnimations();
    initMobileMenu();
    initImageOptimization();
    initScrollEffects();
    initGallery();
    
    // CORRECTIONS CRITIQUES
    fixAllImages();
    monitorDOMChanges();
    
    // Protection contre les overrides tardifs
    setTimeout(fixAllImages, 500);
    setTimeout(fixAllImages, 1000);
    
    // Vérifier après chargement complet
    window.addEventListener('load', function() {
        setTimeout(fixAllImages, 200);
    });
});

// ===== EMPÊCHER LES REDIMENSIONNEMENTS AGRESSIFS =====
function protectImagesFromCSS() {
    const style = document.createElement('style');
    style.id = 'image-protection-styles';
    style.textContent = `
        /* Protection contre les overrides CSS globaux */
        .article-page img,
        .news-page img,
        .article-hero-image img,
        .article-image-container img,
        .article-content img {
            height: auto !important;
            max-height: none !important;
            width: auto !important;
            max-width: 100% !important;
            object-fit: contain !important;
        }
        
        /* Spécifique pour les cartes */
        .news-article-card .article-image-container img {
            max-height: 170px !important;
        }
        
        /* Spécifique pour la page article */
        .article-page .article-hero-image img {
            max-height: 450px !important;
        }
        
        .article-page .article-content img {
            max-height: 400px !important;
        }
    `;
    
    document.head.appendChild(style);
}

// Appeler cette fonction au tout début
protectImagesFromCSS();
});