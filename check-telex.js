const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de la structure TELEX...\n');

// Vérifier les dossiers obligatoires
const requiredDirs = [
    'views/pages',
    'views/admin',
    'views/layouts',
    'views/partials',
    'public/css',
    'public/js',
    'public/images',
    'routes',
    'config',
    'database'
];

console.log('📁 Structure des dossiers:');
let allDirsOk = true;
requiredDirs.forEach(dir => {
    const exists = fs.existsSync(dir);
    console.log(`  ${exists ? '✅' : '❌'} ${dir}`);
    if (!exists) allDirsOk = false;
});

console.log('\n📄 Fichiers obligatoires:');
const requiredFiles = [
    'server.js',
    'package.json',
    'config/database.js',
    'routes/index.js',
    'routes/admin.js',
    'views/pages/index.ejs',
    'views/admin/login.ejs'
];

let allFilesOk = true;
requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allFilesOk = false;
});

console.log('\n📦 Dépendances (package.json):');
if (fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['express', 'ejs', 'sqlite3', 'express-session', 'dotenv'];
    
    requiredDeps.forEach(dep => {
        const hasDep = pkg.dependencies && pkg.dependencies[dep];
        console.log(`  ${hasDep ? '✅' : '❌'} ${dep}`);
    });
}

console.log('\n' + '='.repeat(50));
if (allDirsOk && allFilesOk) {
    console.log('✅ Structure TELEX correcte !');
    console.log('\n🚀 Pour démarrer:');
    console.log('   1. npm install');
    console.log('   2. npm run dev');
    console.log('   3. Ouvrir http://localhost:3000');
} else {
    console.log('⚠️  Problèmes détectés dans la structure.');
    console.log('\n🔧 Pour corriger:');
    console.log('   1. Créez les dossiers/fichiers manquants');
    console.log('   2. npm install express ejs sqlite3 express-session dotenv');
}