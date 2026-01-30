const fs = require('fs');
const path = require('path');

console.log('🔧 Correction de tous les problèmes...\n');

// 1. Vérifier/Créer error.ejs
const errorPath = path.join(__dirname, 'views/pages/error.ejs');
if (!fs.existsSync(errorPath)) {
    const errorTemplate = `<!DOCTYPE html>
<html>
<head>
    <title><%= title %></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #1D3557; color: white; text-align: center; padding: 50px; }
        .code { font-size: 72px; color: #E63946; font-weight: bold; }
    </style>
</head>
<body>
    <div class="code"><%= code %></div>
    <h1><%= title %></h1>
    <p><%= message %></p>
    <a href="/" class="btn btn-light">Accueil</a>
</body>
</html>`;
    
    fs.writeFileSync(errorPath, errorTemplate);
    console.log('✅ error.ejs créé');
} else {
    console.log('✅ error.ejs existe déjà');
}

// 2. Corriger routes/index.js
const routesPath = path.join(__dirname, 'routes/index.js');
if (fs.existsSync(routesPath)) {
    let content = fs.readFileSync(routesPath, 'utf8');
    
    // Remplacer excerpt par content
    content = content.replace(
        /SELECT id, title, excerpt, image_url, created_at FROM news/g,
        'SELECT id, title, content, image_url, created_at FROM news'
    );
    
    fs.writeFileSync(routesPath, content);
    console.log('✅ Routes corrigées (excerpt → content)');
}

// 3. Vérifier server.js
const serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    let serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Vérifier la configuration views
    if (serverContent.includes('app.set(\'views\', [')) {
        console.log('⚠️  Configuration views à multiples chemins détectée');
        console.log('👉 Changez pour: app.set(\'views\', path.join(__dirname, \'views\'));');
    }
}

console.log('\n✅ Corrections appliquées !');
console.log('\n🚀 Redémarrez: npm run dev');