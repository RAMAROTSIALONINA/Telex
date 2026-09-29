const ACCORD = ["Tout à fait d'accord", "Plutôt d'accord", "Plutôt pas d'accord", "Pas du tout d'accord", "Sans opinion"];

const OPINION_QUESTIONS = [
    { id: 'q01', question: "Les réseaux sociaux sont aujourd'hui ma principale source d'information.", options: ACCORD },
    { id: 'q02', question: "Selon vous, quel est le plus grand défi des étudiants aujourd'hui ?", options: ["Trouver un emploi après les études", "Le coût des études et du logement", "L'accès à Internet et au matériel", "La qualité de l'enseignement", "Sans opinion"] },
    { id: 'q03', question: "Les jeunes sont suffisamment écoutés dans les décisions qui les concernent.", options: ACCORD },
    { id: 'q04', question: "Avant de partager une information, vérifiez-vous sa source ?", options: ["Toujours", "Souvent", "Rarement", "Jamais", "Sans opinion"] },
    { id: 'q05', question: "Le bénévolat associatif devrait être reconnu dans le parcours universitaire.", options: ACCORD },

    { id: 'q06', question: "Quel format préférez-vous pour suivre l'actualité ?", options: ["Vidéos courtes", "Articles écrits", "Émissions télévisées", "Podcasts et radio", "Sans opinion"] },
    { id: 'q07', question: "L'intelligence artificielle est plutôt une chance pour les étudiants.", options: ACCORD },
    { id: 'q08', question: "Quel sujet Telex devrait-il traiter en priorité ?", options: ["Emploi et entrepreneuriat", "Environnement", "Santé et bien-être", "Culture et sport", "Sans opinion"] },
    { id: 'q09', question: "La foi et la spiritualité ont une place importante dans ma vie quotidienne.", options: ACCORD },
    { id: 'q10', question: "Faites-vous confiance aux médias pour vous informer de façon juste ?", options: ["Tout à fait confiance", "Plutôt confiance", "Plutôt pas confiance", "Pas du tout confiance", "Sans opinion"] },

    { id: 'q11', question: "Les stages devraient être obligatoires dans toutes les filières.", options: ACCORD },
    { id: 'q12', question: "Combien de temps passez-vous chaque jour sur les réseaux sociaux ?", options: ["Moins d'une heure", "De 1 à 3 heures", "De 3 à 5 heures", "Plus de 5 heures", "Je ne sais pas"] },
    { id: 'q13', question: "La protection de l'environnement est une priorité pour ma génération.", options: ACCORD },
    { id: 'q14', question: "Après vos études, où souhaitez-vous travailler ?", options: ["À Madagascar", "À l'étranger, puis revenir", "À l'étranger, définitivement", "Je ne sais pas encore"] },
    { id: 'q15', question: "Les activités culturelles et sportives manquent à l'université.", options: ACCORD }
];

const QUESTIONS_PER_WEEK = 5;

// Rotation hebdomadaire : 5 questions différentes chaque semaine
function getWeeklyOpinionQuestions(date = new Date()) {
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
    const cycle = OPINION_QUESTIONS.length / QUESTIONS_PER_WEEK;
    const start = (Math.floor(dayOfYear / 7) % cycle) * QUESTIONS_PER_WEEK;
    return OPINION_QUESTIONS.slice(start, start + QUESTIONS_PER_WEEK);
}

function findOpinionQuestion(id) {
    return OPINION_QUESTIONS.find(q => q.id === id);
}

module.exports = { getWeeklyOpinionQuestions, findOpinionQuestion };
