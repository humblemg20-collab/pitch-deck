function calculatePitchReadinessScore_(data, alerts) {
  const categories = [];

  function normalizeQualityText(value) {
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

  function isSuspiciousNarrative(value) {
    const raw = cleanString_(value);
    const normalized = normalizeQualityText(raw);
    if (!normalized) return false;

    const compact = normalized.replace(/\s/g, '');
    const knownPlaceholders = [
      'test', 'teste', 'testing', 'xxx', 'xxxx', '1111', '0000', '1234',
      'abcd', 'azerty', 'qwerty', 'lorem', 'loremipsum', 'ras', 'aucun',
      'neant', 'n/a', 'na', 'rien'
    ];

    if (knownPlaceholders.indexOf(normalized) >= 0 || knownPlaceholders.indexOf(compact) >= 0) return true;
    if (/^([a-z0-9])\1{2,}$/.test(compact)) return true;
    if (/^\d+$/.test(compact)) return true;
    if (compact.length >= 4 && new Set(compact.split('')).size <= 2) return true;

    const words = normalized.split(' ').filter(Boolean);
    const hasLetters = /[a-z]/.test(normalized);
    if (!hasLetters) return true;
    if (raw.length < 12 && words.length < 2) return true;
    return false;
  }

  function textQuality(path, minGood, minExcellent) {
    const value = cleanString_(getByPath_(data, path));
    if (!value || isSuspiciousNarrative(value)) return 0;

    const normalized = normalizeQualityText(value);
    const wordCount = normalized ? normalized.split(' ').filter(Boolean).length : 0;
    const length = value.length;

    if (length >= minExcellent && wordCount >= 10) return 1;
    if (length >= minGood && wordCount >= 5) return 0.82;
    if (length >= Math.max(25, Math.round(minGood * 0.6)) && wordCount >= 3) return 0.52;
    return 0.18;
  }

  function category(id, label, weight, ratio, note) {
    const safeRatio = Math.max(0, Math.min(1, Number(ratio || 0)));
    const points = Math.round(weight * safeRatio * 10) / 10;
    categories.push({ id: id, label: label, weight: weight, points: points, note: note || '' });
  }

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

  const narrativeValues = narrativePaths.map(function(path) {
    return { path: path, value: cleanString_(getByPath_(data, path)) };
  }).filter(function(item) { return item.value.length > 0; });

  const suspiciousValues = narrativeValues.filter(function(item) {
    return isSuspiciousNarrative(item.value);
  });

  const frequencies = {};
  narrativeValues.forEach(function(item) {
    const key = normalizeQualityText(item.value);
    if (!key) return;
    frequencies[key] = (frequencies[key] || 0) + 1;
  });
  const maxRepeatedAnswer = Object.keys(frequencies).reduce(function(max, key) {
    return Math.max(max, frequencies[key]);
  }, 0);
  const suspiciousRatio = narrativeValues.length ? suspiciousValues.length / narrativeValues.length : 0;

  const hasProblemEvidence = Boolean(cleanString_(getByPath_(data, 'problem.problemEvidence'))) && !isSuspiciousNarrative(getByPath_(data, 'problem.problemEvidence'));
  category('problem', 'Problème', 10,
    textQuality('problem.targetUser', 50, 120) * 0.35 +
    textQuality('problem.problemDescription', 120, 260) * 0.4 +
    textQuality('problem.consequences', 60, 150) * 0.15 +
    (hasProblemEvidence ? 0.1 : 0),
    hasProblemEvidence ? 'Problème défini et étayé.' : 'Ajoutez une preuve réelle du problème.'
  );

  category('solution', 'Solution', 10,
    textQuality('solution.solutionDescription', 120, 250) * 0.45 +
    textQuality('solution.valueProposition', 45, 120) * 0.35 +
    Math.min(splitLines_(getByPath_(data, 'solution.howItWorks'), 10).filter(function(line) { return !isSuspiciousNarrative(line); }).length / 3, 1) * 0.2,
    'La note récompense la clarté, le bénéfice et le fonctionnement.'
  );

  const marketSource = Boolean(cleanString_(getByPath_(data, 'market.marketSource'))) && !isSuspiciousNarrative(getByPath_(data, 'market.marketSource'));
  category('market', 'Marché', 12,
    textQuality('market.payingCustomer', 35, 90) * 0.3 +
    textQuality('market.geography', 20, 80) * 0.2 +
    textQuality('market.marketEstimate', 50, 150) * 0.3 +
    (marketSource ? 0.2 : 0),
    marketSource ? 'Estimation de marché sourcée.' : 'La source du marché manque ou n’est pas exploitable.'
  );

  const hasRevenue = cleanString_(getByPath_(data, 'businessModel.hasRevenue')).toLowerCase() === 'oui';
  const validRevenueAmount = cleanNumber_(getByPath_(data, 'businessModel.monthlyRevenue')) > 0 || cleanNumber_(getByPath_(data, 'businessModel.annualRevenue')) > 0;
  const revenueEvidenceRatio = hasRevenue ? (validRevenueAmount ? 1 : 0) : 0.2;
  category('businessModel', 'Modèle économique', 10,
    textQuality('businessModel.revenueModel', 50, 150) * 0.4 +
    textQuality('businessModel.pricing', 25, 80) * 0.25 +
    textQuality('businessModel.acquisition', 60, 160) * 0.25 +
    revenueEvidenceRatio * 0.1,
    hasRevenue ? 'Les revenus doivent être cohérents avec les clients.' : 'Sans revenus, la précision du modèle et du prix devient essentielle.'
  );

  const tractionData = data.traction || {};
  const validationSignals = [
    tractionData.tractionSummary,
    tractionData.pilots,
    tractionData.contracts,
    tractionData.partnerships
  ].filter(function(value) {
    return cleanString_(value).length > 0 && !isSuspiciousNarrative(value);
  }).length;
  const tractionEvidence = Boolean(cleanString_(tractionData.tractionEvidence)) && !isSuspiciousNarrative(tractionData.tractionEvidence);
  const tractionRatio = Math.min(
    textQuality('traction.tractionSummary', 70, 220) * 0.45 +
    Math.min(validationSignals / 3, 1) * 0.3 +
    (cleanNumber_(tractionData.users) > 0 && validationSignals > 0 ? 0.1 : 0) +
    (tractionEvidence ? 0.15 : 0),
    1
  );
  category('traction', 'Traction et validation', 14, tractionRatio, tractionEvidence ? 'Les signaux de traction sont reliés à des preuves.' : 'Ajoutez une preuve exploitable pour les résultats déclarés.');

  const competitorLines = splitLines_(getByPath_(data, 'market.competitors'), 10).filter(function(line) { return !isSuspiciousNarrative(line); });
  category('competition', 'Concurrence et avantage', 8,
    Math.min(competitorLines.length / 3, 1) * 0.4 +
    textQuality('market.advantage', 70, 180) * 0.6,
    'La note dépend de la connaissance des alternatives et de la défendabilité.'
  );

  category('team', 'Équipe', 10,
    textQuality('team.founders', 100, 260) * 0.6 +
    textQuality('team.keySkills', 50, 140) * 0.3 +
    (textQuality('team.missingSkills', 25, 80) > 0 ? 0.1 : 0),
    'Une équipe crédible relie expérience, rôle et disponibilité.'
  );

  let financialRatio = 0;
  const monthly = cleanNumber_(getByPath_(data, 'businessModel.monthlyRevenue'));
  const annual = cleanNumber_(getByPath_(data, 'businessModel.annualRevenue'));
  if (hasRevenue) {
    financialRatio = monthly > 0 || annual > 0 ? 0.55 : 0;
    if (monthly > 0 && annual > 0) {
      const variance = Math.abs(annual - monthly * 12) / Math.max(annual, monthly * 12);
      financialRatio = variance <= 0.3 ? 1 : 0.2;
    }
  } else {
    financialRatio =
      textQuality('businessModel.pricing', 25, 80) * 0.35 +
      textQuality('funding.useOfFunds', 100, 260) * 0.35 +
      textQuality('funding.milestones', 80, 220) * 0.3;
  }
  category('financial', 'Cohérence financière', 10, financialRatio, 'La cohérence et les hypothèses documentées valent plus que la simple présence de chiffres.');

  const amountRequested = cleanNumber_(getByPath_(data, 'funding.amountRequested'));
  const fundingNarrativeQuality = textQuality('funding.useOfFunds', 100, 260) + textQuality('funding.milestones', 80, 220);
  category('funding', 'Demande de financement', 10,
    (amountRequested > 0 && fundingNarrativeQuality > 0 ? 0.2 : 0) +
    textQuality('funding.useOfFunds', 100, 260) * 0.45 +
    textQuality('funding.milestones', 80, 220) * 0.25 +
    (cleanString_(getByPath_(data, 'funding.fundingType')) ? 0.1 : 0),
    'La demande doit relier montant, usage et jalons mesurables.'
  );

  const evidenceSignals = [
    getByPath_(data, 'problem.problemEvidence'),
    getByPath_(data, 'market.marketSource'),
    getByPath_(data, 'traction.tractionEvidence'),
    getByPath_(data, 'review.sourceLinks')
  ].filter(function(value) {
    return cleanString_(value).length > 0 && !isSuspiciousNarrative(value);
  }).length;
  category('evidence', 'Preuves et sources', 6, evidenceSignals / 4, 'Les preuves augmentent la crédibilité sans inventer de données.');

  const base = categories.reduce(function(sum, item) { return sum + item.points; }, 0);
  const penalty = Math.min(25, (alerts || []).reduce(function(sum, alert) {
    return sum + Number(alert.penalty || 0);
  }, 0) * 0.25);

  let total = Math.max(0, Math.min(100, Math.round(base - penalty)));

  // Garde-fous anti-remplissage artificiel : une réponse répétée ou manifestement factice
  // ne peut jamais produire un score moyen simplement parce que toutes les cases sont remplies.
  if (maxRepeatedAnswer >= 5) total = Math.min(total, 10);
  else if (maxRepeatedAnswer >= 3) total = Math.min(total, 25);

  if (suspiciousRatio >= 0.5) total = Math.min(total, 12);
  else if (suspiciousRatio >= 0.25) total = Math.min(total, 30);

  const criticalCount = (alerts || []).filter(function(alert) { return alert.level === AG24_CONFIG.ALERT_LEVELS.CRITICAL; }).length;
  const blockingCount = (alerts || []).filter(function(alert) { return alert.blocking; }).length;

  let label = 'Non prêt';
  let interpretation = 'Les fondamentaux doivent être renforcés avant une présentation à un investisseur.';
  if (total >= 85 && criticalCount === 0) {
    label = 'Très forte préparation documentaire';
    interpretation = 'Le dossier est solide sur le plan documentaire. Une validation humaine reste recommandée avant toute levée.';
  } else if (total >= 75 && criticalCount === 0) {
    label = 'Bonne préparation';
    interpretation = 'Le projet peut être présenté, avec quelques renforcements ciblés.';
  } else if (total >= 60) {
    label = 'Présentable, mais à renforcer';
    interpretation = 'La structure est exploitable, mais certaines objections importantes restent ouvertes.';
  } else if (total >= 40) {
    label = 'Structure fragile';
    interpretation = 'Le deck peut être généré en version Standard, mais les informations sont encore insuffisantes pour convaincre.';
  }

  return {
    total: total,
    label: label,
    interpretation: interpretation,
    categories: categories,
    penalty: Math.round(penalty * 10) / 10,
    criticalCount: criticalCount,
    blockingCount: blockingCount,
    eligibleForFinancable: total >= 75 && criticalCount === 0 && blockingCount === 0,
    dataQuality: {
      narrativeAnswers: narrativeValues.length,
      suspiciousAnswers: suspiciousValues.length,
      suspiciousRatio: Math.round(suspiciousRatio * 100),
      maxRepeatedAnswer: maxRepeatedAnswer
    },
    calculatedAt: nowIso_()
  };
}
