const nodemailer = require('nodemailer');

// Service email désactivé temporairement pour éviter les erreurs de démarrage
console.log('⚠️ Service email désactivé temporairement - utilisation fallback mailto');

// Fonction pour envoyer un email (désactivée)
async function sendEmail(to, subject, htmlContent, textContent) {
    console.log('📧 Service email non configuré - fallback vers mailto');
    return { success: false, error: 'Service email non configuré' };
}

// Fonction pour créer le HTML de réponse
function createReplyHTML(contactName, replyMessage, originalMessage) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Réponse de TELEX</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f8f9fa; }
            .original-message { background: #e9ecef; padding: 20px; margin-top: 20px; border-left: 4px solid #28a745; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📺 TELEX</h1>
                <p>Télévision étudiante - Réponse à votre message</p>
            </div>
            <div class="content">
                <h2>Bonjour ${contactName},</h2>
                <div style="margin: 20px 0;">
                    ${replyMessage.replace(/\n/g, '<br>')}
                </div>
                ${originalMessage ? `
                <div class="original-message">
                    <h3>📋 Votre message original :</h3>
                    <p><strong>De:</strong> ${originalMessage.name} &lt;${originalMessage.email}&gt;</p>
                    <p><strong>Date:</strong> ${new Date(originalMessage.created_at).toLocaleString('fr-FR')}</p>
                    <p><strong>Sujet:</strong> ${originalMessage.subject || 'Sans objet'}</p>
                    <hr>
                    <p>${originalMessage.message.replace(/\n/g, '<br>')}</p>
                </div>
                ` : ''}
            </div>
            <div class="footer">
                <p>© 2026 TELEX - Télévision étudiante</p>
                <p>Cet email a été envoyé via le système de contact de TELEX</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = { sendEmail, createReplyHTML };
