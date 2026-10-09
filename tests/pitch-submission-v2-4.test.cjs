'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function sampleData() {
 return {
  identity:{projectName:'EcoCommerce',tagline:'Nous créons des vitrines web accessibles aux commerces du territoire.'},
  problem:{targetUser:'Commerçants indépendants installés au Cameroun',
    problemDescription:'Les petites boutiques locales peinent à présenter leurs produits en ligne et perdent des demandes de devis.',
    consequences:'Les prospects ne peuvent pas comparer les produits à distance.',
    problemEvidence:'Enquête de terrain conduite en 2025 auprès des commerçants de Douala'},
  solution:{solutionDescription:'Création et hébergement de sites internet commerciaux pour les petites entreprises locales',
    valueProposition:'Permettre aux commerçants de publier leur catalogue et recevoir des demandes de devis.',
    howItWorks:'Diagnostic du commerce;Création du site;Mise en ligne et formation',
    currentStatus:'Pilote en cours avec des utilisateurs locaux'},
  market:{payingCustomer:'Boutiques indépendantes du Cameroun qui achètent un site vitrine',
    geography:'Douala, Cameroun',marketEstimate:'600 commerces accessibles selon enquête de terrain',
    marketSource:'Étude locale du marché du commerce camerounais, avril 2025',
    competitors:'Pages Facebook des boutiques;Agences de communication',
    advantage:'Formation sur place et prix forfaitaire pour un site adapté à chaque commerçant'},
  businessModel:{revenueModel:'Vente de sites et suivi mensuel',
    pricing:'150 000 FCFA par site réalisé',acquisition:'Prospection en magasin et partenariats avec associations professionnelles',
    hasRevenue:'Non'},
  traction:{tractionSummary:'Des commerçants ont essayé notre démonstrateur',
    users:5,tractionEvidence:'Compte rendu détaillé des pilotes daté de septembre 2026, disponible dans le dossier'},
  team:{founders:'Fondatrice A, directrice opérationnelle, trois années de réalisation de sites web',
    keySkills:'Développement web, marketing numérique, gestion des projets'},
  funding:{amountRequested:100000,currency:'EUR',fundingType:'Subvention',
    useOfFunds:'Équipement et hébergement — 40 000 EUR\nRecrutement et accompagnement client — 60 000 EUR',
    milestones:'20 sites livrés sous 6 mois\n40 sites publiés sous 12 mois'},
  review:{contactName:'Responsable EcoCommerce',contactEmail:'contact@example.com',
    declaration:true,investorSubmissionApproved:true}
 };
}
function fixture(data) {
 const context={console,Array,Object,String,Number,Math,JSON,RegExp,Date};
 vm.createContext(context);
 for(const file of ['PitchQualityEngine.js','PitchSubmissionGate.js']) {
  vm.runInContext(read(file),context,{filename:file});
 }
 const project={projectId:'P1',projectName:'EcoCommerce',data:data||sampleData()};
 return {ctx:context,project,gate:()=>context.AG24_SUBMISSION_gate_(project)};
}
function codes(report){return Array.from(report.issues).map(x=>x.code);}
test('Humble MG PDF #5 is NOT eligible for investor submission without genuine corrections',()=>{
 const p=sampleData();
 p.identity.tagline='saucons e monde entier';
 p.problem.problemDescription='perte de clients, le manque de financement';
 p.problem.targetUser='la population';
 p.solution.solutionDescription='creation de sites internets';
 p.solution.valueProposition='plus de marchandise, plus de clients';
 p.market.payingCustomer='les porteurs de projet';
 p.market.marketEstimate='Potentiel de marché à quantifier';
 p.market.marketSource='Source requise';
 p.market.advantage='technologie avancee';
 p.businessModel.pricing='10 000';
 p.businessModel.acquisition='prendre des leads';
 p.traction.tractionEvidence='Preuves à préciser';
 p.team.founders='mike cto afrigreen24';
 p.funding.amountRequested=1000000;
 p.funding.useOfFunds='le matériel à acheter';
 p.funding.milestones='10 clients mensuels';
 p.review.investorSubmissionApproved=false;
 const f=fixture(p),gate=f.gate(),c=codes(gate);
 assert.equal(gate.ready,false);
 for(const code of ['PROBLEM_GENERIC','TARGET_TOO_BROAD','PRICING_UNIT_MISSING',
  'MARKET_EVIDENCE_INSUFFICIENT','ADVANTAGE_TOO_GENERIC',
  'TRACTION_CLAIM_UNSUPPORTED','FUND_ALLOCATION_INCOMPLETE',
  'MILESTONES_INCOMPLETE','HUMAN_FINAL_REVIEW_MISSING']){
  assert.ok(c.includes(code),code);
 }
 assert.throws(()=>f.ctx.AG24_SUBMISSION_assertReady_(f.project),/SUBMISSION_BLOCKED/);
 assert.equal(f.project.data.funding.amountRequested,1000000,'canonical request must never change');
});
test('complete grounded project and human submission review pass the deterministic gate',()=>{
 const f=fixture(),result=f.gate();
 assert.equal(result.ready,true,JSON.stringify(result.issues));
 assert.equal(result.status,'READY_FOR_SUBMISSION');
 assert.equal(result.issueCount,0);
 assert.equal(f.ctx.AG24_SUBMISSION_assertReady_(f.project).ready,true);
});
test('numeric budget allocations must add up exactly to the requested funds',()=>{
 const f=fixture();
 assert.equal(f.ctx.AG24_SUBMISSION_budget_(
  'Équipement — 40 000 EUR\nRecrutement — 60 000 EUR',100000).valid,true);
 assert.equal(f.ctx.AG24_SUBMISSION_budget_(
  'Équipement : 40 %\nRecrutement : 60 %',100000).valid,true);
 assert.equal(f.ctx.AG24_SUBMISSION_budget_(
  'Équipement : 40 %\nRecrutement : 50 %',100000).reason,'FUND_PERCENT_TOTAL_MISMATCH');
 assert.equal(f.ctx.AG24_SUBMISSION_budget_(
  'Équipement : 10 000 EUR\nRecrutement : 60 000 EUR',100000).reason,'FUND_AMOUNT_TOTAL_MISMATCH');
 assert.equal(f.ctx.AG24_SUBMISSION_budget_(
  'Équipement : 40 %\nRecrutement : 60 000 EUR',100000).reason,'FUND_ALLOCATION_MIXED_UNITS');
});
test('no final submission if human approval is missing or material content changes',()=>{
 const f=fixture();
 f.project.data.review.investorSubmissionApproved=false;
 assert.ok(codes(f.gate()).includes('HUMAN_FINAL_REVIEW_MISSING'));
 f.project.data.review.investorSubmissionApproved=true;
 f.project.data.businessModel.pricing='10 000';
 assert.ok(codes(f.gate()).includes('PRICING_UNIT_MISSING'));
 const api=read('Api.js'),assets=read('AssetEngine.js');
 assert.match(api,/sectionId!=='review' && project\.data\.review/);
 assert.match(api,/investorSubmissionApproved=false/);
 assert.match(assets,/investorSubmissionApproved=false/);
});
test('submission cannot fake documentary evidence or replace source data',()=>{
 const f=fixture(),before=JSON.stringify(f.project.data);
 f.gate();
 assert.equal(JSON.stringify(f.project.data),before);
 f.project.data.market.marketSource='Source requise';
 assert.equal(f.gate().ready,false);
 assert.ok(codes(f.gate()).includes('QUALITY_MARKET_SOURCE_MISSING'));
});
test('both export modes remain distinct, and final mode is checked twice server-side',()=>{
 const api=read('Api.js'),slides=read('SlidesGenerator.js');
 assert.match(api,/function apiGenerateStandardDeck\(projectId, token\)/);
 assert.match(api,/AG24_API_generateDeck_\(projectId,token,'STANDARD'\)/);
 assert.match(api,/function apiGenerateSubmissionDeck\(projectId, token\)/);
 assert.match(api,/AG24_API_generateDeck_\(projectId,token,'SUBMISSION'\)/);
 assert.match(api,/AG24_SUBMISSION_assertReady_\(project\)/);
 assert.match(slides,/if\(submission\) AG24_SUBMISSION_assertReady_\(project\)/);
 assert.match(slides,/slide\.qualityLabel=''/);
 assert.match(slides,/Pitch Deck Investisseur/);
 assert.match(read('PitchSubmissionGate.js'),/readyForSubmission|READY_FOR_SUBMISSION/);
});
test('submission hides private labels and keeps page numbering, preview remains unchanged',()=>{
 const source=read('SlidesGenerator.js');
 const ctx={
  ag24ScaleX_:x=>x*.75,ag24ScaleY_:y=>y*.75,
  getPremiumTheme_:()=>({line:'#123',muted:'#aaa',yellow:'#fff'}),
  SlidesApp:{ShapeType:{RECTANGLE:'rect'},ParagraphAlignment:{CENTER:'center',END:'end'}},
  addTextBox_:()=>{},removeShapeBorder_:()=>{},ag24Text_:(x)=>String(x||'')
 };
 let textCalls=[];
 ctx.addTextBox_=(slide,text)=>textCalls.push(String(text));
 vm.createContext(ctx);
 vm.runInContext(source,ctx);
 const slide={insertShape:()=>({getFill:()=>({setSolidFill(){}})})};
 ctx.addPremiumFooter_(slide,1,12,'BROUILLON',true,'EcoCommerce');
 assert.ok(textCalls.some(x=>x.includes('EcoCommerce')));
 assert.ok(textCalls.some(x=>x.includes('1 / 12')));
 assert.ok(textCalls.every(x=>!x.includes('BROUILLON')&&!x.includes('AfriGreen24 Pitch Studio')));
 textCalls=[];
 ctx.addPremiumFooter_(slide,1,12,'BROUILLON',false,'EcoCommerce');
 assert.ok(textCalls.some(x=>x.includes('BROUILLON')));
});
test('investor media captions are presentation-only in preview',()=>{
 const s=read('PitchMediaLayout.js');
 assert.match(s,/if\(!data\.submissionMode\) addTextBox_\(slide,'VISUEL FOURNI/);
 const investor=read('PitchInvestorEngine.js');
 assert.match(investor,/foot=data\.submissionMode\?'':/);
 assert.match(investor,/UTILISATION PRIORITAIRE/);
});
test('new interface requests authenticated readiness and never enables final export before success',()=>{
 const ui=read('App.html');
 assert.match(ui,/apiEvaluatePitchSubmission/);
 assert.match(ui,/apiGenerateSubmissionDeck/);
 assert.match(ui,/data-action="generate-submission-deck" disabled/);
 assert.match(ui,/result\.issues/);
 assert.match(ui,/result\.ready/);
 const questionnaire=read('Questionnaire.js');
 assert.match(questionnaire,/investorSubmissionApproved/);
 assert.match(questionnaire,/Après vérification, je confirme/);
});
