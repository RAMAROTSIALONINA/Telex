// Crée un compte administrateur, ou change son mot de passe s'il existe déjà.
// Utilisation : node scripts/creer-admin.js
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { dbGet, dbRun } = require('../config/database');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
let hideInput = false;
const normalWrite = rl._writeToOutput.bind(rl);
// Affiche des * à la place du mot de passe
rl._writeToOutput = text => normalWrite(hideInput ? text.replace(/[^\r\n]/g, '*') : text);

const lines = [];
let waiting = null;
rl.on('line', line => {
    if (waiting) { const w = waiting; waiting = null; w(line); } else lines.push(line);
});

function ask(question, hidden) {
    hideInput = !!hidden;
    process.stdout.write(question);
    return new Promise(resolve => {
        const done = answer => {
            hideInput = false;
            if (hidden) process.stdout.write('\n');
            resolve(String(answer).trim());
        };
        if (lines.length) done(lines.shift()); else waiting = done;
    });
}

(async () => {
    // Laisser le temps à la base de s'initialiser
    await new Promise(r => setTimeout(r, 2500));

    const username = await ask("Nom d'utilisateur : ");
    if (!username) { console.log('Nom vide, abandon.'); process.exit(1); }
    const password = await ask('Mot de passe (8 caractères minimum) : ', true);
    if (password.length < 8) { console.log('Mot de passe trop court, abandon.'); process.exit(1); }
    const confirm = await ask('Confirmez le mot de passe : ', true);
    if (confirm !== password) { console.log('Les mots de passe ne correspondent pas, abandon.'); process.exit(1); }

    const hash = await bcrypt.hash(password, 10);
    const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
        await dbRun('UPDATE users SET password = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hash, existing.id]);
        console.log(`\n✅ Mot de passe de « ${username} » mis à jour.`);
    } else {
        await dbRun("INSERT INTO users (username, password, full_name, role, is_active) VALUES (?, ?, ?, 'superadmin', 1)", [username, hash, username]);
        console.log(`\n✅ Compte administrateur « ${username} » créé.`);
    }
    process.exit(0);
})().catch(err => {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
});
