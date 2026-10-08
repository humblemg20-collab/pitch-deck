function createDemoProjectForTesting() {
  const input = {
    email: Session.getEffectiveUser().getEmail() || 'demo@example.com',
    projectName: 'SolarFresh Africa',
    consent: true
  };
  const result = apiCreateProject(input);
  if (!result.ok) return result;
  const projectId = result.data.project.projectId;
  const token = result.data.token;
  const demo = getDemoData_();
  Object.keys(demo).forEach(function(sectionId) {
    apiSaveSection({ projectId: projectId, token: token, sectionId: sectionId, values: demo[sectionId] });
  });
  return apiAnalyzeProject(projectId, token);
}

function getDemoData_() {
  return {
    identity: {
      projectName: 'SolarFresh Africa',
      tagline: 'Une chaîne du froid solaire accessible qui réduit les pertes des petits producteurs.',
      sector: 'Agriculture',
      country: 'Sénégal',
      stage: 'Pilote',
      website: 'https://example.com'
    },
    problem: {
      targetUser: 'Petits producteurs de fruits et légumes situés hors des grands centres urbains et coopératives rurales.',
      problemDescription: 'Une part importante des récoltes se dégrade avant la vente faute de stockage froid accessible, fiable et adapté aux volumes des petits producteurs.',
      consequences: 'Les producteurs perdent du revenu, vendent dans l’urgence à bas prix et supportent un gaspillage élevé.',
      problemEvidence: 'Entretiens avec 42 producteurs et données publiques de pertes post-récolte à sourcer précisément.'
    },
    solution: {
      solutionDescription: 'SolarFresh déploie des chambres froides modulaires alimentées par énergie solaire, accessibles à la journée ou par abonnement collectif.',
      valueProposition: 'Réduire les pertes, prolonger la durée de vente et améliorer le revenu net des producteurs.',
      howItWorks: 'Réservation du volume\nDépôt des produits\nStockage contrôlé\nSuivi par SMS\nRetrait ou mise en relation avec un acheteur',
      currentStatus: 'Un prototype fonctionnel et un pilote de trois mois dans une coopérative.'
    },
    market: {
      payingCustomer: 'Coopératives agricoles, groupements de producteurs et producteurs individuels à volume régulier.',
      geography: 'Région de Thiès puis principaux bassins horticoles du Sénégal.',
      marketEstimate: 'Marché initial estimé à 400 coopératives et groupements accessibles dans les zones ciblées.',
      marketSource: 'Estimation interne fondée sur les annuaires de coopératives et entretiens terrain ; calcul à documenter.',
      competitors: 'Entrepôts frigorifiques urbains\nGlacières et stockage informel\nVente immédiate à des intermédiaires',
      advantage: 'Solution modulaire proche des zones de production, paiement adapté aux petits volumes et coûts énergétiques réduits par le solaire.'
    },
    businessModel: {
      revenueModel: 'Facturation à la caisse et à la journée, complétée par des abonnements saisonniers pour les coopératives.',
      pricing: 'Tarif pilote de 500 FCFA par caisse et par jour, avec remise pour abonnement.',
      acquisition: 'Partenariats avec coopératives, agents agricoles locaux et démonstrations pendant les périodes de récolte.',
      hasRevenue: 'Oui',
      monthlyRevenue: 450000,
      annualRevenue: 5200000,
      customerCount: 37
    },
    traction: {
      tractionSummary: '37 clients payants, 3 mois de pilote, 18 tonnes stockées et plusieurs demandes de réplication dans deux zones voisines.',
      users: 52,
      pilots: 'Pilote de trois mois avec une coopérative de Thiès.',
      contracts: 'Une lettre d’intention pour une seconde installation.',
      partnerships: 'Accord de collaboration signé avec une coopérative locale.',
      tractionEvidence: 'Registre de stockage, factures pilotes, rapport de température et lettre d’intention.'
    },
    team: {
      founders: 'Awa Ndiaye — CEO — 7 ans en chaîne de valeur agricole — temps plein\nMamadou Fall — CTO — ingénieur énergie solaire — temps plein',
      keySkills: 'Opérations agricoles, énergie solaire, relation avec les coopératives et gestion de projet terrain.',
      missingSkills: 'Responsable commercial B2B et spécialiste maintenance pour le déploiement multi-sites.'
    },
    funding: {
      amountRequested: 65000000,
      currency: 'FCFA',
      fundingType: 'Investissement en capital',
      useOfFunds: '45 % fabrication de 3 unités\n20 % équipe commerciale et opérations\n15 % maintenance et pièces\n10 % acquisition clients\n10 % fonds de roulement',
      milestones: '3 nouvelles unités sous 9 mois\n500 producteurs servis sous 12 mois\n15 millions FCFA de revenu annualisé sous 15 mois',
      runway: 18
    },
    review: {
      risks: 'Adoption plus lente — démonstrations et contrats saisonniers\nPannes techniques — stock de pièces et maintenance préventive\nSaisonnalité — diversification des produits stockés',
      impact: 'Réduction des pertes post-récolte et amélioration du revenu des petits producteurs.',
      sourceLinks: 'https://example.com/source-marche\nhttps://example.com/rapport-pilote',
      contactName: 'Awa Ndiaye',
      contactEmail: 'awa@example.com',
      declaration: true
    }
  };
}
