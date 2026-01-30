const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DU FICHIER LOGIN.EJS\n');

// 1. Où sommes-nous ?
console.log('1. Dossier courant:');
console.log('   ' + process.cwd());

// 2. Chemin du fichier
const loginPath = path.join(process.cwd(), 'views/admin/login.ejs');
console.log('\n2. Chemin du fichier:');
console.log('   ' + loginPath);

// 3. Le fichier existe-t-il ?
console.log('\n3. Existence du fichier:');
const exists = fs.existsSync(loginPath);
console.log('   ' + (exists ? '✅ EXISTE' : '❌ N\'EXISTE PAS'));

if (exists) {
    const stats = fs.statSync(loginPath);
    console.log('   Taille: ' + stats.size + ' octets');
    console.log('   Date: ' + stats.mtime);
    
    // Lire le contenu
    console.log('\n4. Contenu (premières 5 lignes):');
    const content = fs.readFileSync(loginPath, 'utf8');
    content.split('\n').slice(0, 5).forEach((line, i) => {
        console.log('   ' + (i+1) + '. ' + line);
    });
} else {
    console.log('\n4. CRÉATION DU FICHIER...');
    
    // Créer le dossier s'il n'existe pas
    fs.mkdirSync(path.dirname(loginPath), { recursive: true });
    
    // Créer le fichier
    const content = `<!DOCTYPE html>
<html>
<head>
    <title>TELEX Admin Login</title>
</head>
<body>
    <h1>CONNEXION ADMIN TELEX</h1>
    <form method="POST" action="/admin/login">
        <input name="username" placeholder="admin"><br>
        <input type="password" name="password" placeholder="admin123"><br>
        <button>Connexion</button>
    </form>
</body>
</html>`;
    
    fs.writeFileSync(loginPath, content);
    console.log('✅ Fichier créé avec succès !');
}

// 5. Tester avec Express
console.log('\n5. Test Express:');
try {
    const express = require('express');
    const testApp = express();
    testApp.set('view engine', 'ejs');
    testApp.set('views', path.join(process.cwd(), 'views'));
    
    testApp.render('admin/login', { title: 'Test' }, (err, html) => {
        if (err) {
            console.log('❌ Erreur: ' + err.message);
            console.log('\n💡 SOLUTION:');
            console.log('1. Le fichier n\'existe pas sur le disque');
            console.log('2. Créez-le avec la commande ci-dessus');
            console.log('3. Redémarrez: npm run dev');
        } else {
            console.log('✅ SUCCÈS ! Express peut rendre le template');
            console.log('   Premiers 50 caractères: ' + html.substring(0, 50) + '...');
        }
    });
} catch (e) {
    console.log('❌ Exception: ' + e.message);
}