'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function build(data) {
 const project={projectId:'AG24-TEST',projectName:'humble mg',
  email:'test@example.invalid',data:data||{}};
 const ctx={console,Date,JSON,Number,Math,Object,String,Array,RegExp,
  AG24_CONFIG:{DEFAULT_CURRENCY:'EUR'},
  cleanString_:s=>String(s||'').trim(),
  cleanNumber_:s=>Number(s)||0,
  truncate_:(s,n)=>String(s||'').slice(0,n),
  splitLines_:(s,n)=>String(s||'').split(/\n|;|•/).map(v=>v.trim()).filter(Boolean).slice(0,n||6),
  formatMoney_:(v,c)=>Number(v).toLocaleString('fr-FR')+' '+c};
 vm.createContext(ctx);
 for(const file of ['PitchQualityEngine.js','ContentBuilder.js','PitchInvestorEngine.js']){
   vm.runInContext(read(file),ctx);
 }
 return {project,ctx,slides:ctx.buildStandardDeckContent_(project)};
}
test('PDF V3 regression: generic placeholders do not become proof, market data or skills',()=>{
 const f=build({identity:{country:'Cameroun',sector:'Technologie'},
 problem:{problemDescription:'perte des clients',targetUser:'la population',
   problemEvidence:'les relations clients'},
 solution:{solutionDescription:'création de sites internets',
   valueProposition:'plus de clients',currentStatus:'plus de marchandise, plus de clients',
   howItWorks:'en créant des sites'},
 market:{geography:'Cameroun — Logistique',marketSource:'Source requise',
   marketEstimate:'Potentiel de marché à quantifier',payingCustomer:'Porteurs de projets'},
 traction:{users:5,tractionEvidence:'Preuves à préciser'},
 team:{founders:'Fondateur exemple',missingSkills:'Compétences à renforcer non précisées'},
 funding:{amountRequested:1000000,currency:'EUR',
   useOfFunds:'le matériel à acheter',milestones:'10 clients mensuels'}
 });
 const audit=f.ctx.AG24_INVESTOR_plan_(f.project,f.slides);
 assert.equal(f.slides.length,12);
 assert.equal(f.slides[1].proof,'');
 assert.equal(f.slides[3].status,'');
 assert.equal(f.slides[5].geography,'');
 assert.equal(f.slides[5].estimate,'');
 assert.equal(f.slides[7].evidence,'');
 assert.equal(f.slides[10].gaps,'');
 assert.equal(f.slides[5].investorLayout,'FOCUS');
 assert.equal(f.slides[7].investorLayout,'FOCUS');
 assert.equal(f.slides[11].investorLayout,'FOCUS');
 assert.ok(audit.weakFieldsRemoved>=2,'some placeholders were removed earlier by ContentBuilder');
 assert.equal(f.project.data.market.geography,'Cameroun — Logistique');
 assert.ok(audit.missingEvidence.length>0);
 assert.equal(audit.quality,'DRAFT');
});
test('AI layout advice is accepted only when facts support that visual composition',()=>{
 const f=build({market:{geography:'Dakar',payingCustomer:'PME locales',
  marketSource:'Rapport officiel 2025 sur la demande',marketEstimate:'5000 entreprises'},
  solution:{howItWorks:'Inscription;Analyse;Mise en place'},
  funding:{useOfFunds:'Achat logiciel',milestones:'Commercialisation'}});
 f.slides[4]._greeninLayout='TIMELINE';
 f.slides[5]._greeninLayout='DATA';
 f.slides[7]._greeninLayout='DATA'; // unsupported: no traction numbers
 f.slides[11]._greeninLayout='DATA'; // forbidden: never infer a funding chart
 const audit=f.ctx.AG24_INVESTOR_plan_(f.project,f.slides);
 assert.equal(f.slides[4].investorLayout,'TIMELINE');
 assert.equal(f.slides[5].investorLayout,'DATA');
 assert.equal(f.slides[7].investorLayout,'FOCUS');
 assert.equal(f.slides[11].investorLayout,'FOCUS');
 assert.equal(audit.selectedAI,2);
 assert.equal(audit.blockedLayouts,2);
});
test('AI structured response includes a layout proposal without granting numeric or funding authority',()=>{
 const ctx={JSON,Array,Number,String,Date,Object,Math,console};
 vm.createContext(ctx);vm.runInContext(read('PitchStorytellingEngine.js'),ctx);
 const schema=ctx.AG24_STORY_schema_();
 assert.ok(schema.properties.slides.items.required.includes('layout'));
 assert.ok(schema.properties.slides.items.properties.layout.enum.includes('FOCUS'));
 const edits=Array.from({length:12},(_,i)=>({
  number:i+1,title:'',body:'',subtitle:'',layout:'DATA'
 }));
 edits[1].title='Une proposition plus claire pour les entreprises';
 const validated=ctx.AG24_STORY_validate_(edits,{solution:{solutionDescription:'Création de sites'}});
 assert.equal(validated[1].layout,'DATA');
 assert.equal(validated[1].title,'Une proposition plus claire pour les entreprises');
 assert.equal(validated[11].title,undefined);
 edits[11].title='999999999 EUR';
 const dropped=ctx.AG24_STORY_validate_(edits,{solution:{solutionDescription:'Création de sites'}});
 assert.equal(dropped[11].title,undefined);
 edits[1].title='999 clients payants';
 assert.throws(()=>ctx.AG24_STORY_validate_(edits,{}),/STORY_UNSUPPORTED_NUMBER/);
});
test('strictly permitted values cannot be converted into fictional charts or financial projections',()=>{
 const f=build({funding:{amountRequested:1000000,currency:'EUR',
  useOfFunds:'le matériel à acheter',milestones:'10 clients mensuels'}});
 f.slides[11]._greeninLayout='DATA';
 f.ctx.AG24_INVESTOR_plan_(f.project,f.slides);
 assert.equal(f.slides[11].title.includes('1'),true);
 assert.equal(f.slides[11].investorLayout,'FOCUS');
 const fund=f.slides[11];
 assert.ok(fund.investorMissingEvidenceCodes.includes('FUND_USE_UNDEREXPLAINED'));
 assert.equal(fund.uses.length,1);
});
test('all 12 presentation layouts render through the Slides API mock after planning',()=>{
 const f=build({identity:{tagline:'Accélérer la présence numérique',sector:'Technologie'},
 problem:{problemDescription:'Des entreprises perdent des prospects',
   consequences:'Baisse de visibilité',targetUser:'PME'},
 solution:{solutionDescription:'Création de sites professionnels',
  valueProposition:'Améliorer la présence en ligne',
  howItWorks:'Diagnostic;Design;Publication'},
 market:{payingCustomer:'PME locales',geography:'Dakar',
  marketSource:'Rapport statistique 2025',marketEstimate:'5000 PME'},
 traction:{users:5,tractionEvidence:'Enquête pilote 2026 auprès de 5 personnes'},
 funding:{amountRequested:25000,currency:'EUR',
  useOfFunds:'Équipement 10000;Recrutement 15000',
  milestones:'10 sites publiés;20 clients actifs'}});
 const audit=f.ctx.AG24_INVESTOR_plan_(f.project,f.slides);
 const words=[],fonts=[];
 const style={setFontFamily(){return this},setFontSize(n){fonts.push(n);return this},
  setBold(){return this},setForegroundColor(){return this}};
 const shape=()=>({getFill:()=>({setSolidFill(){}}),
  getBorder:()=>({getLineFill:()=>({setSolidFill(){},setTransparent(){}}),setWeight(){}}),
  getText:()=>({setText(){},getTextStyle:()=>style,getParagraphStyle:()=>({setParagraphAlignment(){}})}),
  setContentAlignment(){}});
 const slide={getBackground:()=>({setSolidFill(){}}),
  insertShape:(t,x,y,w,h)=>{assert.ok(w>=0&&h>=0);return shape();},
  insertTextBox:(t,x,y,w,h)=>{
    words.push(String(t||''));assert.ok(w>=0&&h>=0);return shape();
  }};
 f.ctx.SlidesApp={PredefinedLayout:{BLANK:'blank'},
  ShapeType:{RECTANGLE:'rect',ROUND_RECTANGLE:'round',ELLIPSE:'circle'},
  ParagraphAlignment:{START:'start',CENTER:'center',END:'end'},
  ContentAlignment:{MIDDLE:'middle'}};
 vm.runInContext(read('SlidesGenerator.js'),f.ctx);
 f.slides.forEach((data,i)=>f.ctx.createPremiumSlide_({appendSlide:()=>slide},data,i,12));
 assert.ok(words.length>35);assert.ok(fonts.length>25);
 assert.ok(fonts.every(x=>x>=9));
 assert.ok(words.some(x=>x.includes('BROUILLON')||x.includes('À VÉRIFIER')));
 assert.doesNotMatch(words.join(' '),/Potentiel de marché à quantifier|Preuves à préciser|Compétences à renforcer non précisées/);
 assert.ok(audit.version.includes('v2_3'));
});
test('investor focus slides exclude contextual photos unless vetted separately',()=>{
 const c={cleanString_:v=>String(v),AG24_ASSET_imageBlob_:()=>({}),
  ag24ScaleX_:x=>x*.75,ag24ScaleY_:x=>x*.75,
  getPremiumTheme_:()=>({panelAlt:'#123',white:'#fff'}),addPanel_:()=>{},addTextBox_:()=>{}};
 let inserted=0;
 vm.createContext(c);vm.runInContext(read('SlideAssets.js'),c);
 const slide={insertImage:()=>{inserted+=1;return {getWidth:()=>200,getHeight:()=>100,
  setWidth(){},setHeight(){},setTop(){},setLeft(){}};}};
 const data={type:'solution',investorLayout:'FOCUS'};
 assert.equal(c.AG24_SLIDE_placeImage_(slide,data,[{role:'PRODUCT',status:'ACTIVE'}]),false);
 assert.equal(c.AG24_SLIDE_placeImage_(slide,{type:'cover',investorLayout:'FOCUS'},
  [{role:'COVER_HERO',status:'ACTIVE'}]),false);
 assert.equal(c.AG24_SLIDE_placeImage_(slide,{type:'solution',investorLayout:'SPLIT'},
  [{role:'PRODUCT',status:'ACTIVE'}]),false);
 assert.equal(inserted,0);
 assert.equal(c.AG24_SLIDE_placeImage_(slide,{type:'cover',investorLayout:'FOCUS'},
  [{role:'LOGO',status:'ACTIVE'}]),false);
 assert.equal(inserted,0);
});
