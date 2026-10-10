/**
 * GreenIN AI Investor Narrative / Visual Decision Engine V2.3.
 *
 * Deterministic authority: the model can propose a layout, but cannot grant
 * itself access to facts, asset roles or unsupported presentation modes.
 * This engine never mutates canonical Projects.dataJson.
 */
const AG24_INVESTOR = Object.freeze({
  VERSION:'pitch_investor_v2_3_0',
  MODES:Object.freeze(['FOCUS','SPLIT','DATA','TIMELINE']),
  PLACEHOLDERS:/^(?:information à compléter|source requise|preuves? à préciser|potentiel de marché à quantifier|compétences? à renforcer non précisées?|à préciser|n\/a|non renseigné|non renseignée|sans objet)$/i
});

function AG24_INVESTOR_clean_(text) {
  const value=String(text===null||text===undefined?'':text).trim();
  return AG24_INVESTOR.PLACEHOLDERS.test(value)?'':value;
}
function AG24_INVESTOR_evidence_(text) {
  const value=AG24_INVESTOR_clean_(text);
  // Weak narrative descriptions must not be presented as documentary proof.
  if(value.length<25&&!/(?:https?:\/\/|rapport|étude|enquête|entretien|facture|contrat|source\s*:|\d{4})/i.test(value)) {
    return '';
  }
  return value;
}
function AG24_INVESTOR_validStatus_(text) {
  const value=AG24_INVESTOR_clean_(text);
  return /(?:idéation|idée|prototype|pilote|test|en cours|lancement|commercialis|opérationnel|production|déploiement|bêta|beta|mvp|activité)/i.test(value)?value:'';
}
function AG24_INVESTOR_geography_(text) {
  const value=AG24_INVESTOR_clean_(text);
  // Do not silently reinterpret the combined "Cameroun — Logistique" field.
  return /\b(?:Agriculture|Agroalimentaire|Energie|Énergie|Technologie|Fintech|Logistique|Immobilier)\b/i.test(value)?'':value;
}
function AG24_INVESTOR_allowed_(data) {
  const mode=['FOCUS'],number=Number(data.number);
  if([2,4,7,9,11,12].includes(number)) {
    const valid=number===2?AG24_INVESTOR_clean_(data.sideValue):
      number===4?AG24_INVESTOR_clean_(data.status):
      number===7?AG24_INVESTOR_clean_(data.pricing)&&AG24_INVESTOR_clean_(data.acquisition):
      number===9?Array.isArray(data.competitors)&&data.competitors.length>0:
      number===11?Array.isArray(data.founders)&&data.founders.length>1:
      Array.isArray(data.uses)&&data.uses.length>1;
    if(valid)mode.push('SPLIT');
  }
  if(number===6&&AG24_INVESTOR_clean_(data.source)&&AG24_INVESTOR_clean_(data.estimate))mode.push('DATA');
  if(number===8&&Array.isArray(data.metrics)&&data.metrics.length>1)mode.push('DATA');
  if(number===5&&Array.isArray(data.items)&&data.items.length>1)mode.push('TIMELINE');
  if(number===10&&Array.isArray(data.milestones)&&data.milestones.length>1)mode.push('TIMELINE');
  if(number===3&&AG24_INVESTOR_clean_(data.proof))mode.push('SPLIT');
  return mode;
}
function AG24_INVESTOR_defaultMode_(data) {
  const allowed=AG24_INVESTOR_allowed_(data);
  const order=Number(data.number)===3?['SPLIT','FOCUS']:
    [5,10].includes(Number(data.number))?['TIMELINE','FOCUS']:
    [6,8].includes(Number(data.number))?['DATA','FOCUS']:
    ['SPLIT','FOCUS'];
  return order.find(function(mode){return allowed.indexOf(mode)>=0;})||'FOCUS';
}
function AG24_INVESTOR_plan_(project,slides) {
  const quality=AG24_PITCH_quality_(project);
  const warnings=quality.issues.map(function(issue){return issue.code;});
  const stats={version:AG24_INVESTOR.VERSION,requestedAI:0,selectedAI:0,
    blockedLayouts:0,weakFieldsRemoved:0,quality:quality.state,
    missingEvidence:quality.issues.filter(function(issue) {
      return /SOURCE|PROOF|EVIDENCE|UNSOURCED|FUND_USE|FUND_MILESTONES/.test(issue.code);
    }).map(function(issue){return issue.code;})};
  slides.forEach(function(slide){
    const before=JSON.stringify(slide);
    ['source','proof','evidence','estimate','gaps'].forEach(function(key){
      if(typeof slide[key]==='string'){
        const cleaned=key==='source'||key==='proof'||key==='evidence'?
          AG24_INVESTOR_evidence_(slide[key]):AG24_INVESTOR_clean_(slide[key]);
        if(cleaned!==slide[key]){slide[key]=cleaned;stats.weakFieldsRemoved+=1;}
      }
    });
    if(typeof slide.geography==='string'){
      const cleaned=AG24_INVESTOR_geography_(slide.geography);
      if(cleaned!==slide.geography){slide.geography=cleaned;stats.weakFieldsRemoved+=1;}
    }
    if(typeof slide.status==='string'){
      const cleaned=AG24_INVESTOR_validStatus_(slide.status);
      if(cleaned!==slide.status){slide.status=cleaned;stats.weakFieldsRemoved+=1;}
    }
    ['items','uses','milestones','founders','competitors'].forEach(function(key){
      if(Array.isArray(slide[key])){
        const prior=slide[key].length;
        slide[key]=slide[key].map(AG24_INVESTOR_clean_).filter(Boolean);
        stats.weakFieldsRemoved+=prior-slide[key].length;
      }
    });
    const allowed=AG24_INVESTOR_allowed_(slide);
    const hint=String(slide._greeninLayout||'').toUpperCase();
    if(hint){
      stats.requestedAI+=1;
      if(allowed.indexOf(hint)<0)stats.blockedLayouts+=1;
      else stats.selectedAI+=1;
    }
    slide.investorLayout=allowed.indexOf(hint)>=0?hint:AG24_INVESTOR_defaultMode_(slide);
    // A proof warning should not disappear because the text was hidden.
    slide.investorEvidenceState=quality.state;
    slide.investorMissingEvidenceCodes=warnings.filter(function(code){
      return Number(slide.number)===6?/MARKET|GEOGRAPHY/.test(code):
        Number(slide.number)===8?/TRACTION/.test(code):
        Number(slide.number)===12?/FUND/.test(code):
        Number(slide.number)===2||Number(slide.number)===3?/PROBLEM/.test(code):false;
    });
    if(!before)throw new Error('INVESTOR_INPUT_INVALID');
  });
  return stats;
}

/**
 * Strong visual fallback for a slide with limited verified evidence.
 * No fabricated TAM charts, fake budgets, photos or invented milestones.
 */
function AG24_INVESTOR_renderFocus_(slide,data) {
  if(data.investorLayout!=='FOCUS' || Number(data.number)===1)return false;
  const t=getPremiumTheme_();
  const n=Number(data.number);
  addSectionHeader_(slide,data.eyebrow,n===12?'Financement recherché':data.title);
  let label='',primary='',secondary='',foot='';
  if(n===2) {
    label='CONSÉQUENCES DÉCLARÉES';
    primary=AG24_INVESTOR_clean_(data.body);
    secondary=AG24_INVESTOR_clean_(data.sideValue);
    foot=secondary?'PUBLIC CONCERNÉ : '+secondary:'';
  } else if(n===3) {
    label='LECTURE DU CONTEXTE';
    primary=AG24_INVESTOR_clean_(data.body);
    secondary=AG24_INVESTOR_clean_(data.sideValue);
    foot=secondary?'SECTEUR ET TERRITOIRE : '+secondary:'';
  } else if(n===4) {
    label='VALEUR POUR LE CLIENT';
    primary=AG24_INVESTOR_clean_(data.body);
    secondary=AG24_INVESTOR_validStatus_(data.status);
    foot=secondary?'STADE DÉCLARÉ : '+secondary:'';
  } else if(n===5) {
    label='PARCOURS CLIENT';
    primary=(data.items||[])[0]||'';
    foot='';
  } else if(n===6) {
    label=data.submissionMode?'ZONE COMMERCIALE':'CLIENTÈLE CIBLÉE';
    primary=data.submissionMode?AG24_INVESTOR_geography_(data.geography):AG24_INVESTOR_clean_(data.title);
    secondary=AG24_INVESTOR_geography_(data.geography);
    foot=secondary?'TERRITOIRE DÉCLARÉ : '+secondary:'';
  } else if(n===7) {
    label='PRIX / MÉCANISME DÉCLARÉ';
    primary=AG24_INVESTOR_clean_(data.pricing)||AG24_INVESTOR_clean_(data.acquisition);
    secondary=AG24_INVESTOR_clean_(data.revenue);
    foot=secondary?'REVENU / STATUT : '+secondary:'';
  } else if(n===8) {
    label='INDICATEUR DÉCLARÉ';
    const metric=(data.metrics||[])[0];
    primary=metric?(String(metric.value)+' — '+String(metric.label)):'';
    foot='';
  } else if(n===9) {
    label='DIFFÉRENCIATION PROPOSÉE';
    primary=AG24_INVESTOR_clean_(data.advantage);
    foot=(data.competitors||[]).length?'ALTERNATIVE CITÉE : '+data.competitors[0]:'';
  } else if(n===10) {
    label=data.submissionMode?'PROCHAIN JALON':'PROCHAIN JALON DÉCLARÉ';
    primary=(data.milestones||[])[0]||'';
    foot='';
  } else if(n===11) {
    label='PORTEUR / ÉQUIPE';
    primary=(data.founders||[])[0]||AG24_INVESTOR_clean_(data.skills);
    secondary=AG24_INVESTOR_clean_(data.skills);
    foot=secondary?'COMPÉTENCE DÉCLARÉE : '+secondary:'';
  } else if(n===12) {
    label=data.submissionMode?'UTILISATION PRIORITAIRE':'BESOIN DE FINANCEMENT';
    primary=data.submissionMode?(data.uses||[])[0]||'':AG24_INVESTOR_clean_(data.title);
    secondary=AG24_INVESTOR_clean_(data.subtitle);
    foot=data.submissionMode?'':((data.uses||[]).length>1?'POSTES DÉCLARÉS : '+data.uses.slice(0,2).join(' • '):
      '');
  } else return false;

  const left=(n%2===0)?54:108;
  addTextBox_(slide,label,left,196,755,24,
    {fontSize:11,bold:true,color:t.green});
  addTextBox_(slide,primary||'',
    left,237,790-left+54,185,{fontSize:n===7||n===8||n===12?28:22,
      bold:true,color:primary?t.white:t.muted});
  if(foot) addTextBox_(slide,foot,left,442,780,27,
    {fontSize:11,color:t.muted});
  if(n===2||n===3)addSourceLine_(slide,data.proof,54,470,810);
  if(n===8)addSourceLine_(slide,data.evidence,54,470,810);
  return true;
}
