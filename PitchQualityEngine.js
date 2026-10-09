/**
 * Investor presentation quality gate V2.1.
 * Non-blocking: free drafts remain downloadable; investor readiness requires human review.
 */
function AG24_PITCH_quality_(project) {
  const data=project&&project.data||{};
  const value=function(section,key){
    const v=data[section]&&data[section][key];
    const text=String(v===undefined||v===null?'':v).trim();
    return /^(information à compléter|source requise|preuves? à préciser|potentiel de marché à quantifier|compétences? à renforcer non précisées?|à préciser|n\/a)$/i.test(text)?'':text;
  };
  const issues=[];
  const add=function(code,section,level,message){
    issues.push({code:code,section:section,level:level,message:message});
  };
  [
    ['problem','problemDescription','PROBLEM_MISSING','Décrire le problème concret.'],
    ['problem','targetUser','BENEFICIARY_MISSING','Préciser les personnes concernées.'],
    ['solution','solutionDescription','SOLUTION_MISSING','Décrire la solution.'],
    ['solution','valueProposition','VALUE_MISSING','Préciser le bénéfice attendu.'],
    ['solution','howItWorks','PROCESS_MISSING','Expliquer les étapes du service.'],
    ['market','payingCustomer','CUSTOMER_MISSING','Préciser qui paie.'],
    ['market','marketSource','MARKET_SOURCE_MISSING','Ajouter une source de marché.'],
    ['traction','tractionEvidence','TRACTION_PROOF_MISSING','Étayer les résultats déclarés.'],
    ['funding','useOfFunds','FUND_USE_MISSING','Ventiler l’utilisation des fonds.'],
    ['funding','milestones','FUND_MILESTONES_MISSING','Associer les fonds à des jalons.']
  ].forEach(function(rule){
    if(!value(rule[0],rule[1]))add(rule[2],rule[0],'IMPROVE',rule[3]);
  });
  if(value('market','marketEstimate')&&!value('market','marketSource')){
    add('MARKET_ESTIMATE_UNSOURCED','market','IMPORTANT','Estimation de marché sans source.');
  }
  if(value('traction','tractionSummary')&&!value('traction','tractionEvidence')){
    add('TRACTION_UNSOURCED','traction','IMPORTANT','Résultats déclarés non étayés.');
  }
  const evidence=value('problem','problemEvidence');
  if(evidence && evidence.length<25 && !/https?:|\d|facture|enquête|rapport|étude|entretien|contrat/i.test(evidence)) {
    add('PROBLEM_EVIDENCE_VAGUE','problem','REVIEW','La preuve citée nécessite une référence exploitable.');
  }
  if(value('problem','problemDescription')&&!value('problem','problemEvidence')){
    add('PROBLEM_UNSOURCED','problem','IMPROVE','Problème décrit sans preuve.');
  }
  const frequencies={};
  [
    value('problem','problemDescription'),value('problem','consequences'),
    value('solution','solutionDescription'),value('solution','valueProposition'),
    value('solution','currentStatus'),value('businessModel','acquisition'),
    value('traction','tractionSummary'),value('market','payingCustomer')
  ].forEach(function(s){
    const v=s.toLowerCase().replace(/\s+/g,' ');
    if(v.length>=12)frequencies[v]=(frequencies[v]||0)+1;
  });
  if(Object.keys(frequencies).some(function(k){return frequencies[k]>=3;})){
    add('REPEATED_NARRATIVE','review','IMPORTANT','Plusieurs réponses reproduisent le même texte.');
  }
  const status=value('solution','currentStatus');
  if(status && !/(?:idéation|idée|prototype|pilote|test|en cours|lancement|commercialis|opérationnel|production|déploiement|bêta|beta|mvp|activité)/i.test(status)){
    add('SOLUTION_STAGE_AMBIGUOUS','solution','REVIEW','Le stade déclaré décrit un bénéfice plutôt qu’un avancement vérifiable.');
  }
  const pricing=value('businessModel','pricing');
  if(pricing && /^\s*[\d\s.,]+\s*$/.test(pricing)){
    add('PRICE_CURRENCY_MISSING','businessModel','REVIEW','La tarification ne mentionne aucune devise ni unité.');
  }
  const geo=value('market','geography');
  if(/\b(?:Agriculture|Agroalimentaire|Energie|Énergie|Technologie|Fintech|Logistique|Immobilier)\b/i.test(geo)){
    add('GEOGRAPHY_INCLUDES_SECTOR','market','REVIEW','Le champ géographie contient un secteur à vérifier.');
  }
  const funds=Number(value('funding','amountRequested').replace(/\s/g,''));
  if(funds>0&&value('funding','useOfFunds').length<35){
    add('FUND_USE_UNDEREXPLAINED','funding','IMPORTANT','Le montant demandé doit être davantage justifié.');
  }
  const serious=issues.some(function(x){return x.level==='IMPORTANT'||x.level==='REVIEW';});
  const state=issues.length>4?'DRAFT':(serious||issues.length?'REVIEW':'COMPLETE');
  const labels={DRAFT:'BROUILLON',REVIEW:'À VÉRIFIER',COMPLETE:'PRÊT POUR REVUE HUMAINE'};
  return {version:'2.1.0',state:state,label:labels[state],
    readyForHumanReview:state==='COMPLETE',issueCount:issues.length,
    issues:issues,reviewMandatory:true};
}
