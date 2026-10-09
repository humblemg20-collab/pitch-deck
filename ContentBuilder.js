/**
 * PitchStudio V2.1: twelve sections, evidence-first narrative, no padded data.
 */
function buildStandardDeckContent_(project) {
  const data=project.data||{};
  const identity=data.identity||{},problem=data.problem||{},solution=data.solution||{},
    market=data.market||{},model=data.businessModel||{},traction=data.traction||{},
    team=data.team||{},funding=data.funding||{},review=data.review||{};
  const quality=AG24_PITCH_quality_(project);
  const proofUsable=!quality.issues.some(function(issue){return issue.code==='PROBLEM_EVIDENCE_VAGUE';});
  const value=function(v,max){
    const s=String(v===undefined||v===null?'':v).trim();
    if(!s||/^(information à compléter|source requise|à préciser|n\/a)$/i.test(s))return '';
    return truncate_(s,max||200);
  };
  const list=function(v,n){
    return splitLines_(v||'',n||5).map(function(t){return value(t,210);}).filter(Boolean);
  };
  const name=value(identity.projectName||project.projectName,70)||'Projet sans nom';
  const currency=value(funding.currency,8)||AG24_CONFIG.DEFAULT_CURRENCY;
  const revenue=String(model.hasRevenue||'').toLowerCase()==='oui'?
    formatMoney_(model.monthlyRevenue||model.annualRevenue,currency):
    (String(model.hasRevenue||'').toLowerCase()==='non'?'Précommercial':'');
  const amount=Number(funding.amountRequested);
  const slides=[
    {type:'cover',number:1,title:name,
      subtitle:value(identity.tagline||solution.valueProposition,155),
      meta:[identity.sector,identity.country,identity.stage].map(function(x){return value(x,40);}).filter(Boolean).join(' • ')},
    {type:'statement',number:2,eyebrow:'LE PROBLÈME',
      title:value(problem.problemDescription,135)||'Le besoin à résoudre',
      body:value(problem.consequences,210),
      sideLabel:'PERSONNES CONCERNÉES',sideValue:value(problem.targetUser,150),
      proof:value(problem.problemEvidence,170)},
    {type:'insight',number:3,eyebrow:'CONTEXTE ET OPPORTUNITÉ',
      title:(proofUsable?value(problem.problemEvidence,120):'')||'Le contexte du problème',
      body:value(problem.consequences,180),
      sideLabel:'ZONE ET SECTEUR',
      sideValue:[identity.country,identity.sector].map(function(x){return value(x,60);}).filter(Boolean).join(' • '),
      proof:value(market.marketSource,150)},
    {type:'solution',number:4,eyebrow:'NOTRE SOLUTION',
      title:value(solution.solutionDescription,115)||'Ce que nous proposons',
      body:value(solution.valueProposition,200),
      status:value(solution.currentStatus,125)},
    {type:'steps',number:5,eyebrow:'PARCOURS CLIENT',
      title:'Comment fonctionne la solution',items:list(solution.howItWorks,5)},
    {type:'market',number:6,eyebrow:'NOTRE MARCHÉ',
      title:value(market.payingCustomer,130)||'Les clients ciblés',
      geography:value(market.geography,120),
      estimate:value(market.marketEstimate,160),source:value(market.marketSource,160)},
    {type:'business',number:7,eyebrow:'MODÈLE ÉCONOMIQUE',
      title:value(model.revenueModel,120)||'Notre modèle de revenus',
      pricing:value(model.pricing,100),acquisition:value(model.acquisition,130),
      revenue:revenue},
    {type:'traction',number:8,eyebrow:'TRACTION ET VALIDATION',
      title:value(traction.tractionSummary,120)||'Résultats observés',
      metrics:buildTractionMetrics_(traction),
      evidence:value(traction.tractionEvidence,170)},
    {type:'competition',number:9,eyebrow:'DIFFÉRENCIATION',
      title:value(market.advantage,120)||'Notre avantage',
      competitors:list(market.competitors,5)},
    {type:'goToMarket',number:10,eyebrow:'FEUILLE DE ROUTE',
      title:value(model.acquisition,120)||'Stratégie de développement',
      milestones:list(funding.milestones,4)},
    {type:'team',number:11,eyebrow:'ÉQUIPE ET EXÉCUTION',
      title:'Les personnes derrière le projet',
      founders:list(team.founders,4),skills:value(team.keySkills,170),
      gaps:value(team.missingSkills,130)},
    {type:'funding',number:12,eyebrow:'DEMANDE DE FINANCEMENT',
      title:Number.isFinite(amount)&&amount>0?formatMoney_(amount,currency):'Montant à définir',
      subtitle:value(funding.fundingType,90),
      uses:list(funding.useOfFunds,4),milestones:list(funding.milestones,3),
      contact:[review.contactName,review.contactEmail].map(function(x){return value(x,90);}).filter(Boolean).join(' • ')||project.email,
      vision:value(identity.tagline||solution.valueProposition,120)}
  ];
  slides.forEach(function(slide){
    slide.qualityLabel=quality.label;
    slide.qualityState=quality.state;
    slide.qualityIssues=quality.issueCount;
  });
  return slides;
}
function ensureItems_(items,minimum,fallback) {
  return (items||[]).map(function(x){return String(x||'').trim();}).filter(Boolean);
}
function buildTractionMetrics_(traction) {
  const metrics=[],users=cleanNumber_(traction.users);
  if(users>0)metrics.push({value:users.toLocaleString('fr-FR'),label:'utilisateurs / bénéficiaires déclarés'});
  // Text paragraphs cannot be assumed to be signed contracts or pilots.
  if(cleanString_(traction.pilots))metrics.push({value:'Pilotes',label:'Tests mentionnés par le porteur'});
  if(cleanString_(traction.contracts))metrics.push({value:'Contrats',label:'Éléments déclarés — à vérifier'});
  if(cleanString_(traction.partnerships))metrics.push({value:'Partenariats',label:'Partenariats déclarés'});
  return metrics.slice(0,3);
}
