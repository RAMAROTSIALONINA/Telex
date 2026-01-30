const fs = require('fs');
const path = require('path');

console.log('=== VÉRIFICATION COMPLÈTE ADMIN ===\n');

const viewsDir = path.join(__dirname, 'views');
const adminDir = path.join(viewsDir, 'admin');
const routesDir = path.join(__dirname, 'routes');
const routesAdminFile = path.join(routesDir, 'admin.js');

// ========== VÉRIFICATION DES FICHIERS ==========
console.log('1. 📁 STRUCTURE DES DOSSIERS:');
console.log(`   Views: ${viewsDir} (${fs.existsSync(viewsDir) ? '✅' : '❌'})`);
console.log(`   Admin: ${adminDir} (${fs.existsSync(adminDir) ? '✅' : '❌'})`);
console.log(`   Routes admin: ${routesAdminFile} (${fs.existsSync(routesAdminFile) ? '✅' : '❌'})`);

// ========== FICHIERS EJS DANS ADMIN ==========
console.log('\n2. 📄 FICHIERS EJS DANS admin/:');
if (fs.existsSync(adminDir)) {
    const files = fs.readdirSync(adminDir);
    const ejsFiles = files.filter(f => f.endsWith('.ejs') && !f.includes('.html') && !f.includes('.txt'));
    const problematicFiles = files.filter(f => f.includes('.html') || f.includes('.txt') || (f.includes('.ejs') && !f.endsWith('.ejs')));
    
    if (ejsFiles.length === 0) {
        console.log('   ❌ Aucun fichier .ejs valide !');
    } else {
        ejsFiles.forEach((file, i) => {
            const fullPath = path.join(adminDir, file);
            const stats = fs.statSync(fullPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`   ${i+1}. ${file} (${sizeKB} KB)`);
            
            // Vérifier le contenu
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const hasEjsTags = content.includes('<%=') || content.includes('<%');
                console.log(`      - Balises EJS: ${hasEjsTags ? '✅' : '❌'}`);
                console.log(`      - Lignes: ${content.split('\n').length}`);
                
                // Vérifier les liens
                const links = content.match(/href=["']([^"']+)["']/g) || [];
                console.log(`      - Liens trouvés: ${links.length}`);
            } catch (e) {
                console.log(`      - ❌ Erreur lecture: ${e.message}`);
            }
        });
    }
    
    if (problematicFiles.length > 0) {
        console.log('\n   ⚠️  FICHIERS PROBLÉMATIQUES:');
        problematicFiles.forEach(file => {
            console.log(`      - ${file}`);
        });
    }
}

// ========== FICHIERS CRITIQUES ==========
console.log('\n3. 🔍 FICHIERS CRITIQUES:');
const criticalFiles = [
    { name: 'dashboard.ejs', path: path.join(adminDir, 'dashboard.ejs') },
    { name: 'login.ejs', path: path.join(adminDir, 'login.ejs') },
    { name: 'news.ejs', path: path.join(adminDir, 'news.ejs') },
    { name: 'news_edit.ejs', path: path.join(adminDir, 'news_edit.ejs') },
    { name: 'contacts.ejs', path: path.join(adminDir, 'contacts.ejs') },
    { name: 'programs.ejs', path: path.join(adminDir, 'programs.ejs') },
    { name: 'gallery.ejs', path: path.join(adminDir, 'gallery.ejs') },
    { name: 'error.ejs', path: path.join(adminDir, 'error.ejs') }
];

criticalFiles.forEach(file => {
    const exists = fs.existsSync(file.path);
    const status = exists ? '✅' : '❌';
    if (exists) {
        const stats = fs.statSync(file.path);
        console.log(`   ${status} ${file.name} (${stats.size} octets)`);
    } else {
        console.log(`   ${status} ${file.name} (MANQUANT)`);
    }
});

// ========== VÉRIFICATION DES ROUTES ==========
console.log('\n4. 🛣️  VÉRIFICATION DES ROUTES (admin.js):');
if (fs.existsSync(routesAdminFile)) {
    try {
        const content = fs.readFileSync(routesAdminFile, 'utf8');
        const routes = [
            { name: 'GET /login', pattern: /router\.get\(['"]\/login['"]/ },
            { name: 'POST /login', pattern: /router\.post\(['"]\/login['"]/ },
            { name: 'GET /dashboard', pattern: /router\.get\(['"]\/dashboard['"]/ },
            { name: 'GET /news', pattern: /router\.get\(['"]\/news['"]/ },
            { name: 'GET /news/new', pattern: /router\.get\(['"]\/news\/new['"]/ },
            { name: 'GET /news/edit/:id', pattern: /router\.get\(['"]\/news\/edit/ },
            { name: 'POST /news/save', pattern: /router\.post\(['"]\/news\/save['"]/ },
            { name: 'GET /news/delete/:id', pattern: /router\.get\(['"]\/news\/delete/ },
            { name: 'GET /programs', pattern: /router\.get\(['"]\/programs['"]/ },
            { name: 'GET /contacts', pattern: /router\.get\(['"]\/contacts['"]/ },
            { name: 'GET /gallery', pattern: /router\.get\(['"]\/gallery['"]/ },
            { name: 'GET /logout', pattern: /router\.get\(['"]\/logout['"]/ }
        ];
        
        routes.forEach(route => {
            const found = route.pattern.test(content);
            console.log(`   ${found ? '✅' : '❌'} ${route.name}`);
        });
        
        // Compter le nombre de routes
        const routeCount = (content.match(/router\.(get|post|put|delete)\(/g) || []).length;
        console.log(`   📊 Total routes: ${routeCount}`);
        
    } catch (e) {
        console.log(`   ❌ Erreur lecture routes: ${e.message}`);
    }
} else {
    console.log('   ❌ Fichier routes/admin.js non trouvé !');
}

// ========== VÉRIFICATION DES LIENS DANS DASHBOARD ==========
console.log('\n5. 🔗 LIENS DANS DASHBOARD.EJS:');
const dashboardPath = path.join(adminDir, 'dashboard.ejs');
if (fs.existsSync(dashboardPath)) {
    try {
        const content = fs.readFileSync(dashboardPath, 'utf8');
        const linkRegex = /href=["'](\/admin\/[^"']+)["']/g;
        const links = [];
        let match;
        
        while ((match = linkRegex.exec(content)) !== null) {
            links.push(match[1]);
        }
        
        if (links.length === 0) {
            console.log('   ℹ️  Aucun lien /admin/ trouvé dans dashboard');
        } else {
            console.log(`   📎 Liens trouvés (${links.length}):`);
            links.forEach(link => {
                console.log(`      - ${link}`);
            });
            
            // Vérifier si les routes existent
            console.log('\n   🔍 CORRESPONDANCE ROUTES-LIENS:');
            if (fs.existsSync(routesAdminFile)) {
                const routeContent = fs.readFileSync(routesAdminFile, 'utf8');
                links.forEach(link => {
                    // Extraire le chemin de base (sans paramètres)
                    const basePath = link.split('?')[0].split('/').pop();
                    const routePattern = new RegExp(`router\\.(get|post)\\(['"]\\/${basePath}`);
                    const exists = routePattern.test(routeContent);
                    console.log(`      ${exists ? '✅' : '❌'} ${link} ${exists ? '' : '(ROUTE MANQUANTE)'}`);
                });
            }
        }
    } catch (e) {
        console.log(`   ❌ Erreur analyse dashboard: ${e.message}`);
    }
}

// ========== RECOMMANDATIONS ==========
console.log('\n6. 💡 RECOMMANDATIONS:');

// Vérifier les fichiers problématiques
const filesInAdmin = fs.existsSync(adminDir) ? fs.readdirSync(adminDir) : [];
const hasProblematicFiles = filesInAdmin.some(f => f.includes('.html') || f.includes('.txt'));

if (hasProblematicFiles) {
    console.log('   ❌ Fichiers avec double extension détectés');
    console.log('      Solution: Renommez-les:');
    filesInAdmin.filter(f => f.includes('.html') || f.includes('.txt')).forEach(file => {
        const newName = file.replace('.ejs.html', '.ejs').replace('.html', '').replace('.txt', '');
        console.log(`        ren "${file}" "${newName}"`);
    });
}

// Vérifier les fichiers manquants
const missingFiles = criticalFiles.filter(f => !fs.existsSync(f.path)).map(f => f.name);
if (missingFiles.length > 0) {
    console.log(`   ❌ Fichiers manquants: ${missingFiles.join(', ')}`);
    console.log('      Solution: Créez les fichiers avec:');
    missingFiles.forEach(file => {
        console.log(`        type nul > "views/admin/${file}"`);
    });
}

console.log('\n=== FIN DU DIAGNOSTIC ===\n');