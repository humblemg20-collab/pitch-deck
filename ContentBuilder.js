function buildStandardDeckContent_(project) {
  const data = project.data || {};
  const identity = data.identity || {};
  const problem = data.problem || {};
  const solution = data.solution || {};
  const market = data.market || {};
  const model = data.businessModel || {};
  const traction = data.traction || {};
  const team = data.team || {};
  const funding = data.funding || {};
  const review = data.review || {};

  const missing = 'Information à compléter';
  const projectName = cleanString_(identity.projectName || project.projectName) || 'Projet sans nom';
  const currency = cleanString_(funding.currency || AG24_CONFIG.DEFAULT_CURRENCY);

  return [
    {
      type: 'cover',
      number: 1,
      title: projectName,
      subtitle: cleanString_(identity.tagline) || missing,
      meta: [identity.sector, identity.country, identity.stage].filter(Boolean).join(' • ')
    },
    {
      type: 'statement',
      number: 2,
      eyebrow: 'LE PROBLÈME',
      title: truncate_(problem.problemDescription || missing, 260),
      body: truncate_(problem.consequences || missing, 420),
      sideLabel: 'Personnes concernées',
      sideValue: truncate_(problem.targetUser || missing, 260),
      proof: cleanString_(problem.problemEvidence) || 'Preuve ou source à ajouter'
    },
    {
      type: 'statement',
      number: 3,
      eyebrow: 'POURQUOI MAINTENANT',
      title: 'Le besoin devient plus urgent et plus visible.',
      body: truncate_(problem.problemEvidence || problem.consequences || missing, 520),
      sideLabel: 'Contexte prioritaire',
      sideValue: truncate_(identity.country + ' — ' + identity.sector, 180),
      proof: cleanString_(market.marketSource) || 'Source de marché à compléter'
    },
    {
      type: 'solution',
      number: 4,
      eyebrow: 'LA SOLUTION',
      title: truncate_(solution.solutionDescription || missing, 260),
      body: truncate_(solution.valueProposition || missing, 420),
      status: truncate_(solution.currentStatus || 'Stade de développement à préciser', 220)
    },
    {
      type: 'steps',
      number: 5,
      eyebrow: 'COMMENT ÇA FONCTIONNE',
      title: 'Un parcours simple, conçu pour créer de la valeur rapidement.',
      items: ensureItems_(splitLines_(solution.howItWorks, 5), 3, missing)
    },
    {
      type: 'market',
      number: 6,
      eyebrow: 'MARCHÉ CIBLE',
      title: truncate_(market.payingCustomer || missing, 250),
      geography: truncate_(market.geography || missing, 180),
      estimate: truncate_(market.marketEstimate || 'Potentiel de marché à quantifier', 280),
      source: truncate_(market.marketSource || 'Source requise', 240)
    },
    {
      type: 'business',
      number: 7,
      eyebrow: 'MODÈLE ÉCONOMIQUE',
      title: truncate_(model.revenueModel || missing, 300),
      pricing: truncate_(model.pricing || missing, 220),
      acquisition: truncate_(model.acquisition || missing, 300),
      revenue: cleanString_(model.hasRevenue).toLowerCase() === 'oui'
        ? formatMoney_(model.monthlyRevenue || model.annualRevenue, currency)
        : 'Pré-revenus / validation en cours'
    },
    {
      type: 'traction',
      number: 8,
      eyebrow: 'TRACTION ET VALIDATION',
      title: truncate_(traction.tractionSummary || missing, 340),
      metrics: buildTractionMetrics_(traction),
      evidence: truncate_(traction.tractionEvidence || 'Preuves à préciser', 260)
    },
    {
      type: 'competition',
      number: 9,
      eyebrow: 'CONCURRENCE ET AVANTAGE',
      title: truncate_(market.advantage || missing, 320),
      competitors: ensureItems_(splitLines_(market.competitors, 5), 3, missing)
    },
    {
      type: 'goToMarket',
      number: 10,
      eyebrow: 'STRATÉGIE DE CROISSANCE',
      title: truncate_(model.acquisition || missing, 320),
      milestones: ensureItems_(splitLines_(funding.milestones, 4), 3, missing)
    },
    {
      type: 'team',
      number: 11,
      eyebrow: 'L’ÉQUIPE',
      title: 'Une équipe construite autour de l’exécution.',
      founders: ensureItems_(splitLines_(team.founders, 5), 2, missing),
      skills: truncate_(team.keySkills || missing, 300),
      gaps: truncate_(team.missingSkills || 'Compétences à renforcer non précisées', 260)
    },
    {
      type: 'funding',
      number: 12,
      eyebrow: 'L’OPPORTUNITÉ D’INVESTISSEMENT',
      title: formatMoney_(funding.amountRequested, currency),
      subtitle: cleanString_(funding.fundingType) || 'Type de financement à préciser',
      uses: ensureItems_(splitLines_(funding.useOfFunds, 5), 3, missing),
      milestones: ensureItems_(splitLines_(funding.milestones, 4), 2, missing),
      contact: [review.contactName, review.contactEmail].filter(Boolean).join(' — ') || project.email,
      vision: truncate_(identity.tagline || solution.valueProposition || '', 180)
    }
  ];
}

function ensureItems_(items, minimum, fallback) {
  const result = (items || []).slice();
  while (result.length < minimum) result.push(fallback);
  return result;
}

function buildTractionMetrics_(traction) {
  const metrics = [];
  const users = cleanNumber_(traction.users);
  if (users > 0) metrics.push({ value: users.toLocaleString('fr-FR'), label: 'utilisateurs / bénéficiaires' });
  if (cleanString_(traction.pilots)) metrics.push({ value: String(splitLines_(traction.pilots, 10).length), label: 'pilote(s) ou test(s)' });
  if (cleanString_(traction.contracts)) metrics.push({ value: String(splitLines_(traction.contracts, 10).length), label: 'contrat(s) / intention(s)' });
  if (cleanString_(traction.partnerships)) metrics.push({ value: String(splitLines_(traction.partnerships, 10).length), label: 'partenariat(s) déclaré(s)' });
  if (!metrics.length) metrics.push({ value: 'À préciser', label: 'preuve de validation' });
  return metrics.slice(0, 3);
}
