// Échelles de réponse standard (normes des sondages d'opinion : échelle équilibrée + "Sans opinion")
const ACCORD = ["Tout à fait d'accord", "Plutôt d'accord", "Plutôt pas d'accord", "Pas du tout d'accord", "Sans opinion"];
const CONFIANCE = ["Tout à fait confiance", "Plutôt confiance", "Plutôt pas confiance", "Pas du tout confiance", "Sans opinion"];
const FREQUENCE = ["Toujours", "Souvent", "Parfois", "Jamais", "Sans opinion"];
const INTERET = ["Oui", "Peut-être", "Non", "Sans opinion"];

// L'identifiant (préfixe + numéro) sert à compter les votes : ne jamais le réutiliser pour une autre question.
const THEMES = {
    pol: { label: 'Politique et citoyenneté', questions: [
        ["Voter est un devoir pour chaque citoyen.", ACCORD],
        ["Avez-vous l'intention de voter aux prochaines élections ?", ["Oui, certainement", "Probablement", "Probablement pas", "Non", "Pas encore en âge de voter"]],
        ["Les jeunes sont suffisamment représentés dans la vie politique.", ACCORD],
        ["Faites-vous confiance aux élus pour défendre l'intérêt général ?", CONFIANCE],
        ["La décentralisation donnerait plus de moyens aux régions pour se développer.", ACCORD],
        ["Quel moyen est le plus efficace pour faire entendre sa voix ?", ["Le vote", "Les associations", "Les réseaux sociaux", "Les manifestations pacifiques", "Sans opinion"]],
        ["L'éducation civique devrait être renforcée à l'école et à l'université.", ACCORD],
        ["La lutte contre la corruption doit être la première priorité de l'État.", ACCORD],
        ["Les débats politiques à la télévision vous aident à vous faire une opinion.", ACCORD],
        ["Seriez-vous prêt(e) à vous engager dans une association ou un mouvement citoyen ?", ["J'y suis déjà engagé(e)", "Oui, j'aimerais", "Peut-être", "Non", "Sans opinion"]],
        ["Le fokontany joue un rôle important dans la vie de votre quartier.", ACCORD],
        ["Les promesses électorales sont généralement tenues.", ACCORD],
        ["Quelle institution vous inspire le plus confiance ?", ["L'école et l'université", "Les communautés religieuses", "La justice", "Les médias", "Aucune", "Sans opinion"]],
        ["Un service civique obligatoire pour les jeunes serait une bonne idée.", ACCORD]
    ]},
    edu: { label: 'Éducation', questions: [
        ["Le système éducatif prépare bien les jeunes au marché du travail.", ACCORD],
        ["Quelle réforme de l'éducation est la plus urgente ?", ["Mieux former les enseignants", "Équiper les écoles (salles, livres, Internet)", "Réduire le nombre d'élèves par classe", "Adapter les programmes aux métiers", "Sans opinion"]],
        ["L'enseignement devrait se faire davantage en malagasy.", ACCORD],
        ["L'anglais devrait être enseigné dès l'école primaire.", ACCORD],
        ["Les enseignants sont suffisamment valorisés dans la société.", ACCORD],
        ["L'école devrait être entièrement gratuite jusqu'au baccalauréat, fournitures comprises.", ACCORD],
        ["Quel est le principal frein à la scolarisation des enfants en milieu rural ?", ["La distance de l'école", "Le coût (frais, fournitures)", "Le travail des enfants", "Le manque d'enseignants", "Sans opinion"]],
        ["L'éducation à la santé sexuelle a sa place à l'école.", ACCORD],
        ["L'informatique devrait être enseignée dès le collège.", ACCORD],
        ["Les parents s'impliquent suffisamment dans la scolarité de leurs enfants.", ACCORD],
        ["Les cours en ligne peuvent remplacer une partie des cours en présentiel.", ACCORD],
        ["Le baccalauréat reflète bien le niveau réel des élèves.", ACCORD],
        ["L'orientation scolaire aide vraiment les élèves à choisir leur voie.", ACCORD]
    ]},
    etu: { label: 'Études et vie étudiante', questions: [
        ["Selon vous, quel est le plus grand défi des étudiants aujourd'hui ?", ["Trouver un emploi après les études", "Le coût des études et du logement", "L'accès à Internet et au matériel", "La qualité de l'enseignement", "Sans opinion"]],
        ["Les stages devraient être obligatoires dans toutes les filières.", ACCORD],
        ["Le bénévolat associatif devrait être reconnu dans le parcours universitaire.", ACCORD],
        ["Les activités culturelles et sportives manquent à l'université.", ACCORD],
        ["Comment financez-vous principalement vos études ?", ["Mes parents ou ma famille", "Un travail à côté", "Une bourse", "Un prêt ou une autre aide", "Je ne suis pas étudiant(e)"]],
        ["Le montant des bourses d'études est suffisant pour vivre.", ACCORD],
        ["La grève est un moyen légitime pour les étudiants de se faire entendre.", ACCORD],
        ["Combien d'heures étudiez-vous par jour en dehors des cours ?", ["Moins d'une heure", "De 1 à 2 heures", "De 2 à 4 heures", "Plus de 4 heures", "Je ne suis pas étudiant(e)"]],
        ["Les logements universitaires offrent de bonnes conditions de vie.", ACCORD],
        ["Préférez-vous étudier seul(e) ou en groupe ?", ["Seul(e)", "En groupe", "Les deux, selon les matières", "Sans opinion"]],
        ["L'université devrait proposer davantage de formations courtes et professionnelles.", ACCORD],
        ["La bibliothèque de votre établissement répond à vos besoins.", ACCORD],
        ["Un master est devenu indispensable pour trouver un emploi.", ACCORD]
    ]},
    eco: { label: 'Emploi et économie', questions: [
        ["Après vos études, où souhaitez-vous travailler ?", ["À Madagascar", "À l'étranger, puis revenir", "À l'étranger, définitivement", "Je ne sais pas encore"]],
        ["Créer sa propre entreprise est une bonne réponse au chômage des jeunes.", ACCORD],
        ["Qu'est-ce qui compte le plus pour vous dans un emploi ?", ["Le salaire", "La stabilité", "L'intérêt du travail", "L'ambiance et l'équipe", "Sans opinion"]],
        ["Le secteur informel est une chance pour beaucoup de familles.", ACCORD],
        ["Le coût de la vie a augmenté plus vite que vos revenus cette année.", ACCORD],
        ["Quel secteur peut créer le plus d'emplois pour les jeunes ?", ["L'agriculture et l'agro-industrie", "Le numérique", "Le tourisme", "L'artisanat", "Les mines et l'énergie", "Sans opinion"]],
        ["Il est plus facile de trouver un emploi grâce aux relations que grâce aux compétences.", ACCORD],
        ["Accepteriez-vous un emploi sans rapport avec vos études ?", ["Oui", "Oui, en attendant mieux", "Non", "Sans opinion"]],
        ["Le mobile money a changé votre façon de gérer votre argent.", ACCORD],
        ["Mettez-vous de l'argent de côté chaque mois ?", ["Oui, régulièrement", "Parfois", "Rarement", "Jamais", "Je n'ai pas de revenus"]],
        ["Les achats publics devraient privilégier les produits fabriqués à Madagascar.", ACCORD],
        ["Le salaire minimum actuel permet de vivre dignement.", ACCORD],
        ["Le télétravail est une opportunité pour les jeunes Malgaches.", ACCORD]
    ]},
    art: { label: 'Artisanat', questions: [
        ["L'artisanat malgache est suffisamment valorisé.", ACCORD],
        ["À quelle fréquence achetez-vous des produits artisanaux locaux ?", ["Souvent", "Parfois", "Rarement", "Jamais", "Sans opinion"]],
        ["Quel artisanat représente le mieux Madagascar ?", ["La vannerie (raphia, sisal)", "La broderie et le lamba en soie", "La sculpture sur bois zafimaniry", "Le papier antemoro", "Sans opinion"]],
        ["Les métiers de l'artisanat devraient être enseignés au lycée.", ACCORD],
        ["Seriez-vous intéressé(e) par une formation à un métier artisanal ?", INTERET],
        ["L'artisanat peut être un vrai métier d'avenir pour les jeunes.", ACCORD],
        ["Les artisans sont payés au juste prix pour leur travail.", ACCORD],
        ["Internet est un bon moyen pour les artisans de vendre leurs produits.", ACCORD],
        ["Quel est le principal obstacle pour les artisans ?", ["L'accès aux marchés", "Le coût des matières premières", "Le manque de formation", "L'accès au crédit", "Sans opinion"]],
        ["Les produits importés font une concurrence déloyale aux artisans locaux.", ACCORD],
        ["Les foires de l'artisanat devraient être plus nombreuses dans les régions.", ACCORD],
        ["Un objet artisanal malgache est un cadeau de valeur.", ACCORD],
        ["Les savoir-faire traditionnels devraient être protégés par des labels officiels.", ACCORD]
    ]},
    env: { label: 'Environnement', questions: [
        ["La protection de l'environnement est une priorité pour ma génération.", ACCORD],
        ["Quel problème environnemental vous inquiète le plus ?", ["La déforestation", "La gestion des déchets", "Le manque d'eau", "Les feux de brousse", "Le changement climatique"]],
        ["Les feux de brousse devraient être plus sévèrement sanctionnés.", ACCORD],
        ["Triez-vous vos déchets à la maison ?", FREQUENCE],
        ["Les sachets plastiques devraient être totalement interdits.", ACCORD],
        ["Avez-vous déjà participé à une action de reboisement ?", ["Oui, plusieurs fois", "Oui, une fois", "Non, mais j'aimerais", "Non"]],
        ["Le développement économique est plus important que la protection de l'environnement.", ACCORD],
        ["Le charbon de bois devrait être remplacé par d'autres énergies pour la cuisson.", ACCORD],
        ["L'énergie solaire est la meilleure solution pour électrifier les zones rurales.", ACCORD],
        ["Les aires protégées profitent aux populations qui vivent autour.", ACCORD],
        ["Qui doit agir en premier pour protéger l'environnement ?", ["L'État", "Les communes", "Les entreprises", "Chaque citoyen", "Les associations et ONG"]],
        ["Les effets du changement climatique se font déjà sentir dans votre région.", ACCORD],
        ["La biodiversité unique de Madagascar est suffisamment protégée.", ACCORD],
        ["Utiliseriez-vous davantage les transports en commun s'ils étaient plus fiables ?", INTERET]
    ]},
    san: { label: 'Santé', questions: [
        ["L'accès aux soins est facile dans votre quartier ou votre village.", ACCORD],
        ["Faites-vous du sport au moins une fois par semaine ?", ["Oui, plusieurs fois", "Oui, une fois", "Rarement", "Jamais"]],
        ["On parle suffisamment de la santé mentale des jeunes.", ACCORD],
        ["Que faut-il améliorer en priorité dans les hôpitaux publics ?", ["La disponibilité des médicaments", "Le nombre de médecins", "L'accueil des patients", "Le coût des soins", "Sans opinion"]],
        ["La médecine traditionnelle a sa place à côté de la médecine moderne.", ACCORD],
        ["Une assurance maladie pour tous devrait être mise en place.", ACCORD],
        ["Dormez-vous suffisamment ?", ["Oui, presque toujours", "Souvent", "Rarement", "Presque jamais"]],
        ["La consommation d'alcool chez les jeunes est un problème sérieux.", ACCORD],
        ["La vaccination est essentielle pour protéger la population.", ACCORD],
        ["Mangez-vous des fruits et légumes chaque jour ?", ["Oui, chaque jour", "Plusieurs fois par semaine", "Rarement", "Presque jamais"]],
        ["Le stress des études ou du travail affecte votre santé.", ACCORD],
        ["Les campagnes de prévention (paludisme, VIH, tuberculose) sont efficaces.", ACCORD]
    ]},
    num: { label: 'Numérique et médias', questions: [
        ["Les réseaux sociaux sont aujourd'hui ma principale source d'information.", ACCORD],
        ["Avant de partager une information, vérifiez-vous sa source ?", FREQUENCE],
        ["Quel format préférez-vous pour suivre l'actualité ?", ["Vidéos courtes", "Articles écrits", "Émissions télévisées", "Podcasts et radio", "Sans opinion"]],
        ["Faites-vous confiance aux médias pour vous informer de façon juste ?", CONFIANCE],
        ["Combien de temps passez-vous chaque jour sur les réseaux sociaux ?", ["Moins d'une heure", "De 1 à 3 heures", "De 3 à 5 heures", "Plus de 5 heures", "Je ne sais pas"]],
        ["L'intelligence artificielle est plutôt une chance pour les étudiants.", ACCORD],
        ["Le coût d'Internet est un frein pour étudier et travailler.", ACCORD],
        ["Les fausses informations sont un danger pour la société.", ACCORD],
        ["Quel réseau social utilisez-vous le plus ?", ["Facebook", "TikTok", "WhatsApp", "Instagram", "YouTube", "Autre"]],
        ["Les enfants de moins de 13 ans ne devraient pas avoir de compte sur les réseaux sociaux.", ACCORD],
        ["Le cyberharcèlement est fréquent autour de vous.", ACCORD],
        ["Protégez-vous vos données personnelles en ligne ?", ["Toujours", "Souvent", "Rarement", "Jamais", "Je ne sais pas comment faire"]],
        ["Quel sujet Telex devrait-il traiter en priorité ?", ["Emploi et entrepreneuriat", "Environnement", "Santé et bien-être", "Culture et sport", "Politique et société", "Sans opinion"]],
        ["Les médias donnent assez la parole aux jeunes.", ACCORD]
    ]},
    cul: { label: 'Culture et sport', questions: [
        ["La culture malgache est bien transmise aux jeunes générations.", ACCORD],
        ["Quel genre musical écoutez-vous le plus ?", ["Musique traditionnelle (salegy, tsapiky, hiragasy…)", "Variété malgache", "Gospel", "Rap et hip-hop", "Musique internationale"]],
        ["Le cinéma malgache mérite plus de soutien.", ACCORD],
        ["À quelle fréquence lisez-vous un livre ?", ["Chaque semaine", "Chaque mois", "Quelques fois par an", "Jamais"]],
        ["Le sport devrait avoir plus de place à l'école.", ACCORD],
        ["Quel sport devrait être le plus soutenu à Madagascar ?", ["Football", "Rugby", "Basketball", "Athlétisme", "Pétanque", "Autre"]],
        ["Le hiragasy et les arts traditionnels devraient être enseignés à l'école.", ACCORD],
        ["Les infrastructures sportives sont suffisantes dans votre ville.", ACCORD],
        ["Le kabary est un art oratoire qui doit être préservé.", ACCORD],
        ["Les jeunes s'intéressent encore à l'histoire de Madagascar.", ACCORD],
        ["Les réussites sportives renforcent l'unité nationale.", ACCORD],
        ["Assistez-vous à des événements culturels (concerts, théâtre, expositions) ?", ["Souvent", "Parfois", "Rarement", "Jamais"]]
    ]},
    soc: { label: 'Société et famille', questions: [
        ["L'égalité entre les femmes et les hommes progresse à Madagascar.", ACCORD],
        ["Les jeunes respectent moins les aînés qu'avant.", ACCORD],
        ["Le fihavanana reste une valeur forte dans la société d'aujourd'hui.", ACCORD],
        ["Quel est le principal problème de sécurité dans votre quartier ?", ["Les vols", "Le manque d'éclairage", "Les agressions", "Les accidents de la route", "Sans opinion"]],
        ["Le mariage avant 18 ans devrait être totalement interdit.", ACCORD],
        ["Les femmes sont suffisamment présentes aux postes de responsabilité.", ACCORD],
        ["Vous sentez-vous en sécurité le soir dans votre quartier ?", ["Oui, tout à fait", "Plutôt oui", "Plutôt non", "Pas du tout"]],
        ["La famille reste le premier soutien des jeunes.", ACCORD],
        ["Les personnes en situation de handicap sont bien intégrées dans la société.", ACCORD],
        ["Le travail des enfants est encore trop répandu.", ACCORD],
        ["Les jeunes ont confiance en leur avenir à Madagascar.", ACCORD],
        ["Quelle valeur est la plus importante pour vous ?", ["La famille", "La foi", "Le travail", "L'honnêteté", "La solidarité"]]
    ]},
    agr: { label: 'Agriculture et alimentation', questions: [
        ["L'agriculture est un secteur d'avenir pour les jeunes.", ACCORD],
        ["Madagascar devrait produire lui-même tout le riz qu'il consomme.", ACCORD],
        ["Le prix du riz est le premier souci des familles.", ACCORD],
        ["Seriez-vous prêt(e) à travailler dans l'agriculture ?", ["Oui", "Peut-être", "Non", "J'y travaille déjà"]],
        ["L'agriculture biologique devrait être encouragée.", ACCORD],
        ["Les paysans reçoivent un prix juste pour leurs récoltes.", ACCORD],
        ["Quel est le principal obstacle pour les agriculteurs ?", ["Le manque d'eau et d'irrigation", "L'accès aux semences et aux engrais", "L'état des routes pour vendre", "Le vol de bétail et de récoltes", "Sans opinion"]],
        ["Consommer des produits locaux est important pour vous.", ACCORD],
        ["Trop de jeunes quittent la campagne pour la ville.", ACCORD],
        ["La vanille profite suffisamment aux producteurs malgaches.", ACCORD],
        ["Chaque école devrait avoir un jardin potager.", ACCORD],
        ["Les nouvelles technologies peuvent moderniser l'agriculture malgache.", ACCORD]
    ]},
    vil: { label: 'Ville et infrastructures', questions: [
        ["Les embouteillages sont le principal problème de votre ville.", ACCORD],
        ["Quel moyen de transport utilisez-vous le plus ?", ["Taxi-be ou bus", "Moto ou scooter", "Taxi-moto ou bajaj", "Vélo", "À pied", "Voiture"]],
        ["L'accès à l'électricité est fiable chez vous.", ACCORD],
        ["L'accès à l'eau potable est fiable chez vous.", ACCORD],
        ["Quelle infrastructure faut-il améliorer en priorité ?", ["Les routes", "L'électricité", "L'eau potable", "Internet", "Les hôpitaux"]],
        ["Le transport par câble ou le train urbain est une bonne solution pour Antananarivo.", ACCORD],
        ["La propreté de votre ville s'est améliorée ces dernières années.", ACCORD],
        ["Les trottoirs devraient être réservés aux piétons.", ACCORD],
        ["Les marchands de rue devraient disposer d'emplacements dédiés.", ACCORD],
        ["Votre commune vous consulte suffisamment sur ses projets.", ACCORD],
        ["Vivre en ville offre plus d'opportunités que vivre à la campagne.", ACCORD],
        ["Les délestages ont un impact sur vos études ou votre travail.", ACCORD]
    ]},
    foi: { label: 'Foi et valeurs', questions: [
        ["La foi et la spiritualité ont une place importante dans ma vie quotidienne.", ACCORD],
        ["Les communautés religieuses jouent un rôle important dans l'aide sociale.", ACCORD],
        ["Le dialogue entre les religions est important pour la paix.", ACCORD],
        ["À quelle fréquence prenez-vous un temps de prière ou de méditation ?", ["Chaque jour", "Chaque semaine", "De temps en temps", "Rarement ou jamais"]],
        ["Les jeunes s'éloignent de la religion.", ACCORD],
        ["Les valeurs morales s'apprennent d'abord en famille.", ACCORD],
        ["Le pardon est possible même après une grande blessure.", ACCORD],
        ["Les religions devraient rester à l'écart de la politique.", ACCORD],
        ["Qu'est-ce qui vous aide le plus dans les moments difficiles ?", ["La prière", "La famille", "Les amis", "Le sport ou une passion", "Sans opinion"]],
        ["L'entraide dans votre communauté est aussi forte qu'avant.", ACCORD],
        ["L'honnêteté est récompensée dans la société d'aujourd'hui.", ACCORD],
        ["Les jeunes devraient s'engager davantage dans le bénévolat.", ACCORD]
    ]},
    tou: { label: 'Tourisme', questions: [
        ["Le tourisme profite suffisamment aux populations locales.", ACCORD],
        ["Avez-vous déjà visité une autre région de Madagascar pour le plaisir ?", ["Oui, souvent", "Oui, une ou deux fois", "Non, mais j'aimerais", "Non"]],
        ["Le tourisme des Malgaches dans leur propre pays devrait être encouragé.", ACCORD],
        ["Quel est le principal atout touristique de Madagascar ?", ["La faune et la flore uniques", "Les plages", "La culture et l'accueil", "Les paysages et les parcs nationaux", "Sans opinion"]],
        ["Le prix des transports freine les voyages à l'intérieur du pays.", ACCORD],
        ["L'image de Madagascar à l'étranger est positive.", ACCORD],
        ["Les jeunes devraient être davantage formés aux métiers du tourisme.", ACCORD],
        ["Le tourisme peut menacer l'environnement s'il n'est pas encadré.", ACCORD]
    ]}
};

// Liste à plat, alternée entre les thèmes pour que les questions d'un même jour soient variées
const OPINION_QUESTIONS = (() => {
    const perTheme = Object.entries(THEMES).map(([key, t]) =>
        t.questions.map(([question, options], i) => ({
            id: key + String(i + 1).padStart(2, '0'),
            theme: t.label,
            question,
            options
        }))
    );
    const list = [];
    const max = Math.max(...perTheme.map(q => q.length));
    for (let i = 0; i < max; i++) {
        perTheme.forEach(qs => { if (qs[i]) list.push(qs[i]); });
    }
    return list;
})();

const QUESTIONS_PER_DAY = 5;

// 5 nouvelles questions chaque jour, en parcourant toute la liste avant de recommencer
function getDailyOpinionQuestions(date = new Date()) {
    const dayIndex = Math.floor(date.getTime() / 86400000);
    const start = (dayIndex * QUESTIONS_PER_DAY) % OPINION_QUESTIONS.length;
    return Array.from({ length: QUESTIONS_PER_DAY }, (_, i) =>
        OPINION_QUESTIONS[(start + i) % OPINION_QUESTIONS.length]
    );
}

function findOpinionQuestion(id) {
    return OPINION_QUESTIONS.find(q => q.id === id);
}

module.exports = { OPINION_QUESTIONS, getDailyOpinionQuestions, findOpinionQuestion };
