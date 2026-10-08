function runPitchRules_(data) {
  const alerts = [];
  const level = AG24_CONFIG.ALERT_LEVELS;

  function add(id, severity, section, title, message, recommendation, penalty, blocking) {
    alerts.push({
      id: id,
      level: severity,
      section: section,
      title: title,
      message: message,
      recommendation: recommendation,
      penalty: Number(penalty || 0),
      blocking: Boolean(blocking)
    });
  }

  const identity = data.identity || {};
  const problem = data.problem || {};
  const solution = data.solution || {};
  const market = data.market || {};
  const model = data.businessModel || {};
  const traction = data.traction || {};
  const team = data.team || {};
  const funding = data.funding || {};
  const review = data.review || {};

  if (cleanString_(identity.tagline).length < 35) {
    add('TAGLINE_TOO_SHORT', level.IMPROVEMENT, 'identity', 'Positionnement trop court', 'La phrase de présentation ne permet pas encore de comprendre clairement la cible, la solution et le bénéfice.', 'Reformulez en une phrase comprenant le client, la solution et le résultat principal.', 2, false);
  }
  if (cleanString_(identity.tagline).length > 180) {
    add('TAGLINE_TOO_LONG', level.IMPROVEMENT, 'identity', 'Positionnement trop long', 'La phrase d’introduction risque d’être difficile à retenir.', 'Réduisez-la à une phrase courte et précise.', 1, false);
  }
  if (cleanString_(problem.targetUser).length < 50) {
    add('TARGET_UNCLEAR', level.IMPORTANT, 'problem', 'Cible insuffisamment définie', 'Le profil des personnes ou organisations touchées reste trop général.', 'Précisez le type de client, sa localisation, sa situation et son besoin.', 5, true);
  }
  if (cleanString_(problem.problemDescription).length < 90) {
    add('PROBLEM_VAGUE', level.IMPORTANT, 'problem', 'Problème trop vague', 'La description ne montre pas encore clairement la situation actuelle et ses causes.', 'Ajoutez un exemple concret, la fréquence du problème et les limites des solutions existantes.', 5, true);
  }
  if (cleanString_(problem.consequences).length < 60) {
    add('CONSEQUENCES_WEAK', level.IMPROVEMENT, 'problem', 'Coût de l’inaction peu démontré', 'L’investisseur ne voit pas encore ce que le problème coûte aux clients.', 'Quantifiez le temps, l’argent, le risque ou l’impact perdu lorsque c’est possible.', 3, false);
  }
  if (!cleanString_(problem.problemEvidence)) {
    add('PROBLEM_NO_EVIDENCE', level.IMPROVEMENT, 'problem', 'Problème non étayé', 'Aucune enquête, donnée ou observation terrain n’est mentionnée.', 'Ajoutez au moins une preuve, une source ou un retour client.', 3, false);
  }
  if (cleanString_(solution.solutionDescription).length < 90) {
    add('SOLUTION_VAGUE', level.IMPORTANT, 'solution', 'Solution insuffisamment expliquée', 'La solution ne peut pas encore être comprise sans explication orale supplémentaire.', 'Décrivez ce que le client reçoit, comment il l’utilise et ce qui change pour lui.', 5, true);
  }
  if (cleanString_(solution.valueProposition).length < 45) {
    add('VALUE_PROP_WEAK', level.IMPORTANT, 'solution', 'Bénéfice client peu précis', 'Le bénéfice principal n’est pas assez concret ou mesurable.', 'Exprimez le gain principal en temps, coût, revenu, qualité, accès ou risque.', 4, false);
  }
  if (splitLines_(solution.howItWorks, 10).length < 2) {
    add('HOW_IT_WORKS_MISSING', level.IMPROVEMENT, 'solution', 'Fonctionnement incomplet', 'Le parcours de la solution n’est pas assez structuré.', 'Présentez 3 à 5 étapes simples du fonctionnement ou du parcours client.', 2, false);
  }
  if (cleanString_(market.payingCustomer).length < 20) {
    add('PAYER_UNCLEAR', level.CRITICAL, 'market', 'Client payeur non défini', 'Le modèle ne précise pas clairement qui paie.', 'Identifiez l’organisation ou la personne qui signe et règle la facture.', 8, true);
  }
  if (cleanString_(market.geography).length < 12) {
    add('GEOGRAPHY_UNCLEAR', level.IMPORTANT, 'market', 'Marché géographique trop large', 'La zone de lancement ou de priorité n’est pas suffisamment précise.', 'Définissez une première zone accessible avant d’élargir la vision.', 3, false);
  }
  if (cleanString_(market.marketEstimate) && !cleanString_(market.marketSource)) {
    add('MARKET_NO_SOURCE', level.IMPORTANT, 'market', 'Estimation de marché sans source', 'Une estimation est présentée sans référence ni méthode de calcul.', 'Ajoutez la source, l’année et la méthode de calcul.', 5, false);
  }
  if (!cleanString_(market.marketEstimate)) {
    add('MARKET_NOT_QUANTIFIED', level.IMPROVEMENT, 'market', 'Potentiel de marché non quantifié', 'Le deck ne pourra pas montrer l’ampleur de l’opportunité.', 'Estimez au minimum le nombre de clients accessibles ou leurs dépenses annuelles.', 3, false);
  }
  if (splitLines_(market.competitors, 10).length < 2) {
    add('COMPETITION_WEAK', level.IMPORTANT, 'market', 'Concurrence sous-estimée', 'La réponse ne montre pas les alternatives déjà utilisées par les clients.', 'Ajoutez les concurrents directs, indirects et le statu quo.', 4, false);
  }
  if (cleanString_(market.advantage).length < 70) {
    add('ADVANTAGE_WEAK', level.IMPORTANT, 'market', 'Avantage concurrentiel peu défendable', 'La différence avec les alternatives reste générale.', 'Expliquez pourquoi cet avantage est difficile à reproduire et pertinent pour le client.', 5, true);
  }
  if (cleanString_(model.revenueModel).length < 35) {
    add('REVENUE_MODEL_UNCLEAR', level.CRITICAL, 'businessModel', 'Modèle de revenus non défini', 'Le deck ne permet pas de comprendre comment l’entreprise gagne de l’argent.', 'Précisez qui paie, pour quoi, combien et à quelle fréquence.', 8, true);
  }
  if (cleanString_(model.pricing).length < 25) {
    add('PRICING_UNCLEAR', level.IMPORTANT, 'businessModel', 'Tarification peu précise', 'Le prix ou l’unité facturée n’est pas suffisamment clair.', 'Indiquez un prix, une fourchette ou une méthode de calcul.', 4, false);
  }

  const hasRevenue = cleanString_(model.hasRevenue).toLowerCase() === 'oui';
  const monthlyRevenue = cleanNumber_(model.monthlyRevenue);
  const annualRevenue = cleanNumber_(model.annualRevenue);
  const customerCount = cleanNumber_(model.customerCount);

  if (hasRevenue && monthlyRevenue <= 0 && annualRevenue <= 0) {
    add('REVENUE_MISSING', level.CRITICAL, 'businessModel', 'Revenus déclarés mais non chiffrés', 'Le projet indique avoir des revenus sans fournir de montant.', 'Ajoutez le revenu mensuel moyen ou le revenu des douze derniers mois.', 7, true);
  }
  if (hasRevenue && customerCount <= 0) {
    add('CUSTOMERS_MISSING', level.IMPORTANT, 'businessModel', 'Clients payants non renseignés', 'Le nombre de clients payants ne correspond pas à la déclaration de revenus.', 'Indiquez le nombre de clients ayant effectivement payé.', 4, false);
  }
  if (!hasRevenue && (monthlyRevenue > 0 || annualRevenue > 0)) {
    add('REVENUE_CONTRADICTION', level.CRITICAL, 'businessModel', 'Contradiction sur les revenus', 'Le projet déclare ne pas avoir de revenus mais renseigne un chiffre d’affaires.', 'Corrigez la réponse sur l’existence de revenus ou les montants.', 10, true);
  }
  if (monthlyRevenue > 0 && annualRevenue > 0) {
    const expectedAnnual = monthlyRevenue * 12;
    const variance = Math.abs(annualRevenue - expectedAnnual) / Math.max(expectedAnnual, annualRevenue);
    if (variance > 0.3) {
      add('REVENUE_INCONSISTENT', level.CRITICAL, 'businessModel', 'Revenus mensuels et annuels incohérents', 'Les montants présentent un écart supérieur à 30 %.', 'Expliquez la saisonnalité ou corrigez les chiffres.', 8, true);
    }
  }
  if (cleanString_(model.acquisition).length < 45) {
    add('ACQUISITION_WEAK', level.IMPORTANT, 'businessModel', 'Acquisition client peu réaliste', 'Les canaux d’acquisition ne sont pas suffisamment décrits.', 'Choisissez deux ou trois canaux prioritaires et expliquez pourquoi ils sont accessibles.', 4, false);
  }

  if (cleanString_(traction.tractionSummary).length < 50) {
    add('TRACTION_WEAK', level.IMPORTANT, 'traction', 'Traction insuffisamment démontrée', 'Les signaux de validation du marché sont trop faibles ou trop vagues.', 'Ajoutez des chiffres, des dates, des résultats de tests ou des engagements clients.', 6, false);
  }
  const tractionClaims = cleanNumber_(traction.users) > 0 || cleanString_(traction.pilots) || cleanString_(traction.contracts) || cleanString_(traction.partnerships);
  if (tractionClaims && !cleanString_(traction.tractionEvidence)) {
    add('TRACTION_NO_EVIDENCE', level.IMPORTANT, 'traction', 'Traction sans preuve indiquée', 'Des résultats sont déclarés sans préciser la preuve disponible.', 'Mentionnez la nature du document, le tableau de bord, le contrat ou le rapport de pilote.', 5, false);
  }
  if (/discussion|contact|envisag/i.test(cleanString_(traction.partnerships)) && /partenariat|partenaire/i.test(cleanString_(traction.partnerships))) {
    add('PARTNERSHIP_STATUS', level.IMPROVEMENT, 'traction', 'Statut du partenariat à clarifier', 'Un contact ou une discussion ne doit pas être présenté comme un partenariat confirmé.', 'Indiquez clairement : contacté, en discussion, accord verbal ou contrat signé.', 2, false);
  }

  if (cleanString_(team.founders).length < 80) {
    add('TEAM_WEAK', level.CRITICAL, 'team', 'Équipe insuffisamment présentée', 'Les rôles, expériences et disponibilités ne sont pas assez détaillés.', 'Présentez chaque personne, son rôle, son expérience pertinente et son niveau d’engagement.', 8, true);
  }
  if (cleanString_(team.keySkills).length < 35) {
    add('SKILLS_WEAK', level.IMPORTANT, 'team', 'Compétences clés peu reliées au projet', 'Le deck ne montre pas encore pourquoi l’équipe peut exécuter.', 'Reliez les compétences aux principaux risques d’exécution.', 4, false);
  }
  if (!cleanString_(team.missingSkills)) {
    add('TEAM_GAPS_NOT_STATED', level.INFO, 'team', 'Compétences à renforcer non précisées', 'Le projet peut sembler sous-estimer ses besoins futurs.', 'Indiquez les profils ou expertises qui seront ajoutés après le financement.', 0, false);
  }

  const amountRequested = cleanNumber_(funding.amountRequested);
  if (amountRequested <= 0) {
    add('ASK_MISSING', level.CRITICAL, 'funding', 'Montant recherché absent', 'La demande d’investissement n’est pas chiffrée.', 'Indiquez le montant recherché et la devise.', 10, true);
  }
  if (cleanString_(funding.useOfFunds).length < 75) {
    add('USE_OF_FUNDS_VAGUE', level.CRITICAL, 'funding', 'Utilisation des fonds trop vague', 'Le montant demandé n’est pas relié à des postes, actions et résultats précis.', 'Détaillez chaque poste avec un montant ou pourcentage et un résultat attendu.', 9, true);
  }
  if (cleanString_(funding.milestones).length < 55) {
    add('MILESTONES_WEAK', level.IMPORTANT, 'funding', 'Jalons insuffisamment mesurables', 'Les résultats attendus ne permettent pas de vérifier l’effet du financement.', 'Ajoutez un délai et un indicateur mesurable pour chaque jalon.', 5, false);
  }
  if (amountRequested > 0 && annualRevenue > 0 && amountRequested > annualRevenue * 15) {
    add('ASK_DISPROPORTIONATE', level.IMPORTANT, 'funding', 'Montant recherché très élevé par rapport aux revenus', 'Le montant dépasse douze fois le revenu annuel déclaré.', 'Expliquez précisément le besoin en capital, le potentiel de croissance et les hypothèses.', 5, false);
  }
  const runway = cleanNumber_(funding.runway);
  if (runway > 36) {
    add('RUNWAY_LONG', level.IMPROVEMENT, 'funding', 'Horizon de financement inhabituellement long', 'Un horizon supérieur à 36 mois peut paraître peu crédible sans budget détaillé.', 'Vérifiez le montant et les jalons intermédiaires.', 2, false);
  }

  if (splitLines_(review.risks, 10).length < 2) {
    add('RISKS_MISSING', level.IMPORTANT, 'review', 'Risques insuffisamment identifiés', 'Le projet ne présente pas assez clairement ses principaux risques.', 'Ajoutez au moins trois risques avec une mesure d’atténuation.', 5, false);
  }
  if (!cleanString_(review.sourceLinks) && !cleanString_(market.marketSource) && !cleanString_(problem.problemEvidence)) {
    add('SOURCES_MISSING', level.IMPORTANT, 'review', 'Aucune source identifiable', 'Les principales affirmations ne sont pas reliées à des sources ou preuves.', 'Ajoutez des références, liens ou méthodes de calcul.', 5, false);
  }
  if (!normalizeBoolean_(review.declaration)) {
    add('DECLARATION_REQUIRED', level.CRITICAL, 'review', 'Déclaration de sincérité non confirmée', 'La génération exige la confirmation que les informations sont sincères.', 'Cochez la déclaration après avoir vérifié les réponses.', 10, true);
  }
  if (cleanString_(review.contactEmail) && !isValidEmail_(review.contactEmail)) {
    add('CONTACT_EMAIL_INVALID', level.CRITICAL, 'review', 'E-mail de contact invalide', 'L’adresse affichée dans le deck n’est pas valide.', 'Corrigez l’adresse e-mail de contact.', 5, true);
  }

  // Contrôle de qualité globale des réponses narratives.
  // Empêche les valeurs factices répétées (ex. 1111, test, xxxx) d'obtenir un score artificiel.
  const narrativePaths = [
    'identity.tagline',
    'problem.targetUser', 'problem.problemDescription', 'problem.consequences', 'problem.problemEvidence',
    'solution.solutionDescription', 'solution.valueProposition', 'solution.howItWorks', 'solution.currentStatus',
    'market.payingCustomer', 'market.geography', 'market.marketEstimate', 'market.marketSource', 'market.competitors', 'market.advantage',
    'businessModel.revenueModel', 'businessModel.pricing', 'businessModel.acquisition',
    'traction.tractionSummary', 'traction.pilots', 'traction.contracts', 'traction.partnerships', 'traction.tractionEvidence',
    'team.founders', 'team.keySkills', 'team.missingSkills',
    'funding.useOfFunds', 'funding.milestones',
    'review.risks', 'review.impact', 'review.sourceLinks'
  ];

  function normalizeNarrative_(value) {
    return cleanString_(value)
      .toLowerCase()
      .replace(/[àáâäãå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôöõ]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isSuspiciousNarrative_(value) {
    const raw = cleanString_(value);
    const normalized = normalizeNarrative_(raw);
    if (!normalized) return false;
    const compact = normalized.replace(/\s/g, '');
    const placeholders = ['test', 'teste', 'testing', 'xxx', 'xxxx', '1111', '0000', '1234', 'abcd', 'azerty', 'qwerty', 'lorem', 'loremipsum', 'ras', 'aucun', 'neant', 'na', 'rien'];
    if (placeholders.indexOf(normalized) >= 0 || placeholders.indexOf(compact) >= 0) return true;
    if (/^([a-z0-9])\1{2,}$/.test(compact)) return true;
    if (/^\d+$/.test(compact)) return true;
    if (compact.length >= 4 && new Set(compact.split('')).size <= 2) return true;
    const words = normalized.split(' ').filter(Boolean);
    if (!/[a-z]/.test(normalized)) return true;
    return raw.length < 12 && words.length < 2;
  }

  const narrativeAnswers = narrativePaths.map(function(path) {
    return { path: path, value: cleanString_(getByPath_(data, path)) };
  }).filter(function(item) { return item.value.length > 0; });

  const suspiciousAnswers = narrativeAnswers.filter(function(item) {
    return isSuspiciousNarrative_(item.value);
  });

  if (suspiciousAnswers.length >= 1) {
    add(
      'LOW_QUALITY_INPUT',
      suspiciousAnswers.length >= 3 ? level.CRITICAL : level.IMPORTANT,
      'review',
      'Réponses manifestement insuffisantes ou factices',
      suspiciousAnswers.length + ' réponse(s) ressemblent à des valeurs de test, des chiffres seuls ou du texte sans signification.',
      'Remplacez chaque valeur de test par une réponse factuelle, spécifique et vérifiable.',
      Math.min(20, suspiciousAnswers.length * 3),
      suspiciousAnswers.length >= 3
    );
  }

  const answerFrequency = {};
  narrativeAnswers.forEach(function(item) {
    const key = normalizeNarrative_(item.value);
    if (!key) return;
    answerFrequency[key] = (answerFrequency[key] || 0) + 1;
  });
  const repeatedMax = Object.keys(answerFrequency).reduce(function(max, key) {
    return Math.max(max, answerFrequency[key]);
  }, 0);

  if (repeatedMax >= 3) {
    add(
      'REPEATED_ANSWERS',
      level.CRITICAL,
      'review',
      'Même réponse répétée dans plusieurs sections',
      'Une même valeur a été utilisée dans au moins ' + repeatedMax + ' champs narratifs différents.',
      'Chaque partie du Pitch Deck doit apporter une information distincte : problème, solution, marché, traction, équipe et financement.',
      15,
      true
    );
  }

  const corpus = JSON.stringify(data).toLowerCase();
  const superlatives = ['unique au monde', 'aucun concurrent', 'garanti', 'révolutionnaire', 'sans risque', 'marché illimité'];
  if (superlatives.some(function(term) { return corpus.indexOf(term) >= 0; })) {
    add('UNSUPPORTED_SUPERLATIVE', level.IMPORTANT, 'review', 'Affirmation excessive détectée', 'Une affirmation absolue ou impossible à vérifier peut réduire la confiance.', 'Remplacez-la par un avantage précis, mesurable et sourcé.', 4, false);
  }

  return alerts.sort(function(a, b) {
    const order = { critique: 4, importante: 3, amelioration: 2, information: 1 };
    return order[b.level] - order[a.level];
  });
}
