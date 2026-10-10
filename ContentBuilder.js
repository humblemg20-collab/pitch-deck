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
    if(!s||/^(information à compléter|source requise|preuves? à préciser|potentiel de marché à quantifier|compétences? à renforcer non précisées?|à préciser|n\/a)$/i.test(s))return '';
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
      title:AG24_PITCH_completeCopy_(problem.problemDescription,240,true)||'Le besoin à résoudre',
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
      pricing:value(model.pricing,260),acquisition:value(model.acquisition,230),
      revenue:revenue},
    {type:'traction',number:8,eyebrow:'TRACTION ET VALIDATION',
      title:value(traction.tractionSummary,120)||'Résultats observés',
      metrics:buildTractionMetrics_(traction),
      evidence:value(traction.tractionEvidence,170)},
    {type:'competition',number:9,eyebrow:'DIFFÉRENCIATION',
      title:'Positionnement concurrentiel',advantage:AG24_PITCH_completeCopy_(market.advantage,290,false),
      competitors:list(market.competitors,5)},
    {type:'goToMarket',number:10,eyebrow:'FEUILLE DE ROUTE',
      title:value(model.acquisition,120)||'Stratégie de développement',
      milestones:list(funding.milestones,10)},
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
/**
 * Editorial headline excerpt for slides 2/9 only.
 * Never use truncate_ on a sentence: truncate_ appends a period to a broken
 * word, which is then rendered as an unfinished phrase in the PDF.
 *
 * Short passages are kept whole. When a longer statement has a complete first
 * sentence, prefer that sentence rather than cutting another one in half.
 * If no meaningful boundary exists, preserve the source and let the existing
 * adaptive typography fit it. This is presentation-only: project.data stays
 * canonical and unchanged.
 */
function AG24_PITCH_completeCopy_(raw,maxChars,preferFirstSentence) {
  const text=String(raw===null||raw===undefined?'':raw).replace(/\s+/g,' ').trim();
  if(!text || /^(?:information à compléter|source requise|à préciser|n\/a)$/i.test(text)) return '';
  const sentence=/[.!?](?=\s|$)/g;
  const first=sentence.exec(text);
  // A full sentence is a better pitch headline than half of two sentences.
  if(preferFirstSentence && first && first.index+1<=maxChars) {
    return text.slice(0,first.index+1);
  }
  if(text.length<=maxChars) return text;
  // Preserve the longest *complete* sentence within the natural text budget.
  sentence.lastIndex=0;
  let boundary=-1, match;
  while((match=sentence.exec(text))!==null) {
    if(match.index+1>maxChars) break;
    boundary=match.index+1;
  }
  if(boundary>0)return text.slice(0,boundary).trim();
  // No complete sentence fits: never manufacture a partial clause.
  return text;
}

function ensureItems_(items,minimum,fallback) {
  return (items||[]).map(function(x){return String(x||'').trim();}).filter(Boolean);
}
function buildTractionMetrics_(traction) {
  const metrics=[],users=cleanNumber_(traction.users);
  if(users>0)metrics.push({value:users.toLocaleString('fr-FR'),label:'utilisateurs / bénéficiaires déclarés'});
  // Text-only pilots/contracts are not metrics. Keep their wording in canonical
  // project data, and never turn them into artificial quantities on the deck.
  return metrics.slice(0,3);
}
