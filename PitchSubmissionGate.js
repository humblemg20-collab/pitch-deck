/**
 * GreenIN AI / PitchStudio V2.4 — Investor Submission Gate.
 *
 * No AI or synthetic credentials. This module only assesses project-owned
 * canonical answers and the owner's explicit submission declaration.
 * Standard drafts always remain freely generatable.
 */
const AG24_SUBMISSION = Object.freeze({
  VERSION:'pitch_submission_v2_4_0',
  STATE_READY:'READY_FOR_SUBMISSION',
  STATE_BLOCKED:'ACTION_REQUIRED',
  VAGUE:/^(?:la population|tout le monde|tous|les gens|les entreprises|les clients|plus de clients|prendre des leads|technologie avanc[eé]e|bonne qualit[eé]|plus de marchandise,? plus de clients|[a-zéèà ]{0,3})$/i,
  PLACEHOLDER:/^(?:à définir|à préciser|non renseigné|source requise|preuve à préciser|montant à définir|pas encore|aucun)$/i
});
function AG24_SUBMISSION_value_(data,section,key) {
  const sectionData=data && data[section]||{};
  const v=sectionData[key];
  return String(v===null||v===undefined?'':v).trim();
}
function AG24_SUBMISSION_lines_(s) {
  return String(s||'').split(/\r?\n|;/).map(function(v){return v.trim();}).filter(Boolean);
}
/** Every fund use must state an independently parseable numeric allocation. */
function AG24_SUBMISSION_budget_(text,total) {
  const lines=AG24_SUBMISSION_lines_(text);
  const parts=[];
  let error='';
  if(lines.length<2)error='At least two allocated budget lines are required.';
  lines.forEach(function(line){
    // "Équipement — 40 000 EUR" or "Marketing : 40 %" or "15 000 EUR : produit"
    const matches=Array.from(line.matchAll(/(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(%|EUR|FCFA|XAF|XOF|USD|GBP|CAD|€|\$)?/g));
    const found=matches.find(function(m){return Number(String(m[1]).replace(/\s/g,'').replace(',','.'))>0;});
    if(!found || line.replace(found[0],'').trim().length<5){
      error='Each budget line needs an allocation and an action.';
      return;
    }
    const value=Number(String(found[1]).replace(/\s/g,'').replace(',','.'));
    parts.push({value:value,percent:found[2]==='%',label:line.slice(0,160)});
  });
  if(error)return {valid:false,reason:'FUND_ALLOCATION_INCOMPLETE'};
  const usesPercent=parts.every(function(p){return p.percent;});
  const usesAmount=parts.every(function(p){return !p.percent;});
  if(!usesPercent&&!usesAmount)return {valid:false,reason:'FUND_ALLOCATION_MIXED_UNITS'};
  const sum=parts.reduce(function(t,p){return t+p.value;},0);
  const expected=usesPercent?100:Number(total);
  if(!(expected>0)||Math.abs(sum-expected)>Math.max(0.01,expected*0.001)){
    return {valid:false,reason:usesPercent?'FUND_PERCENT_TOTAL_MISMATCH':'FUND_AMOUNT_TOTAL_MISMATCH'};
  }
  return {valid:true,count:parts.length,unit:usesPercent?'PERCENT':'AMOUNT'};
}
function AG24_SUBMISSION_gate_(project) {
  const data=project && project.data||{},issues=[],seen={};
  function add(code,section,message) {
    if(seen[code])return;
    seen[code]=true;
    issues.push({code:code,section:section,message:message});
  }
  function v(section,key){return AG24_SUBMISSION_value_(data,section,key);}
  function weak(text,min) {
    const s=String(text||'').trim();
    return !s||s.length<(min||20)||AG24_SUBMISSION.VAGUE.test(s)||
      AG24_SUBMISSION.PLACEHOLDER.test(s);
  }
  const q=AG24_PITCH_quality_(project);
  // Reuse all concrete content warnings; omit only advisory fields that
  // cannot block a submission (e.g. "missing skills" not disclosed).
  q.issues.forEach(function(issue) {
    if(issue.code==='PROBLEM_EVIDENCE_VAGUE'||issue.code==='REPEATED_NARRATIVE'||
       issue.level==='IMPORTANT'||issue.level==='REVIEW'||issue.code.endsWith('_MISSING')){
      add('QUALITY_'+issue.code,issue.section,issue.message);
    }
  });
  if(weak(v('identity','tagline'),22)){
    add('TAGLINE_UNCLEAR','identity','Préciser en une phrase le client, la solution et son bénéfice.');
  }
  if(weak(v('problem','problemDescription'),40)){
    add('PROBLEM_GENERIC','problem','Décrire un problème concret, ciblé et compréhensible par un financeur.');
  }
  if(weak(v('problem','targetUser'),18)){
    add('TARGET_TOO_BROAD','problem','Identifier précisément les bénéficiaires plutôt que « tout le monde ».');
  }
  if(weak(v('solution','solutionDescription'),25)||weak(v('solution','valueProposition'),28)){
    add('SOLUTION_TOO_GENERIC','solution','Présenter clairement le service et un bénéfice client spécifique.');
  }
  if(weak(v('market','payingCustomer'),18)){
    add('PAYING_CUSTOMER_UNCLEAR','market','Identifier les clients qui paient réellement.');
  }
  if(weak(v('market','marketEstimate'),12)||weak(v('market','marketSource'),18)){
    add('MARKET_EVIDENCE_INSUFFICIENT','market','Indiquer une estimation du marché et une source identifiable.');
  }
  if(weak(v('market','advantage'),25)){
    add('ADVANTAGE_TOO_GENERIC','market','Expliquer un avantage concurrentiel précis et défendable.');
  }
  const price=v('businessModel','pricing');
  if(!/(?:EUR|FCFA|XAF|XOF|USD|GBP|CAD|€|\$)/i.test(price)||
     !/(?:\bpar\b|\/|forfait|unité|abonnement|site|projet|contrat|heure|mois|an|session)/i.test(price)) {
    add('PRICING_UNIT_MISSING','businessModel','Ajouter la devise et l’unité facturée au prix.');
  }
  if(weak(v('businessModel','acquisition'),24)){
    add('ACQUISITION_UNCLEAR','businessModel','Décrire des canaux concrets d’acquisition de clients.');
  }
  const pilots=v('traction','pilots'),contracts=v('traction','contracts'),
    partnerships=v('traction','partnerships');
  const claims=Number(v('traction','users'))>0||!!pilots||!!contracts||!!partnerships;
  if(claims&&weak(v('traction','tractionEvidence'),25)){
    add('TRACTION_CLAIM_UNSUPPORTED','traction','Relier les utilisateurs, pilotes et contrats déclarés à une preuve vérifiable.');
  }
  if(weak(v('team','founders'),20)){
    add('TEAM_ROLE_UNCLEAR','team','Préciser le nom, le rôle et l’expérience pertinente des porteurs.');
  }
  const amount=Number(v('funding','amountRequested'));
  if(!(amount>0))add('FUND_AMOUNT_INVALID','funding','Renseigner un montant positif.');
  const type=v('funding','fundingType');
  if(!type||AG24_SUBMISSION.PLACEHOLDER.test(type)){
    add('FUND_TYPE_UNDEFINED','funding','Préciser le type de financement demandé.');
  }
  const budget=AG24_SUBMISSION_budget_(v('funding','useOfFunds'),amount);
  if(!budget.valid)add(budget.reason,'funding','Ventiler exactement le montant demandé en postes chiffrés et actions.');
  const milestones=AG24_SUBMISSION_lines_(v('funding','milestones'));
  if(milestones.length<2||milestones.some(function(s){return !/\d|mois|année|trimestre|semestre/i.test(s);})) {
    add('MILESTONES_INCOMPLETE','funding','Prévoir au moins deux jalons datés ou mesurables reliés au financement.');
  }
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('review','contactEmail'))||
     weak(v('review','contactName'),5)){
    add('CONTACT_INCOMPLETE','review','Vérifier le nom et l’adresse e-mail du contact financeur.');
  }
  if(v('review','declaration')!=='true'&&v('review','declaration')!== '1'&&
     v('review','declaration')!=='on'){
    add('SINCERITY_UNCONFIRMED','review','Confirmer la sincérité des informations.');
  }
  if(v('review','investorSubmissionApproved')!=='true'){
    add('HUMAN_FINAL_REVIEW_MISSING','review','Après relecture du PDF, confirmer les chiffres, textes, sources et visuels.');
  }
  const ready=issues.length===0;
  return {version:AG24_SUBMISSION.VERSION,
    status:ready?AG24_SUBMISSION.STATE_READY:AG24_SUBMISSION.STATE_BLOCKED,
    ready:ready,issueCount:issues.length,issues:issues,
    // This is an export-readiness process, never a promise of eligibility or funding.
    disclaimer:'Contrôle de complétude interne ; chaque financeur reste libre de ses critères.'};
}
function AG24_SUBMISSION_assertReady_(project) {
  const gate=AG24_SUBMISSION_gate_(project);
  if(!gate.ready){
    const error=new Error('SUBMISSION_BLOCKED:'+gate.issues.map(function(i){return i.code;}).join(','));
    error.submissionGate=gate;
    throw error;
  }
  return gate;
}
