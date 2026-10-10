'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
function build(){
 const ctx={Number,Date,Math,Array,JSON},boxes=[];
 const shape=()=>({
   getFill:()=>({setSolidFill(){}}),
   getBorder:()=>({getLineFill:()=>({setSolidFill(){},setTransparent(){}}),setWeight(){}}),
   getText:()=>({setText(){},getTextStyle:()=>({setFontFamily(){return this},
     setFontSize(){return this},setBold(){return this},setForegroundColor(){return this}}),
     getParagraphStyle:()=>({setParagraphAlignment(){}})}),
   setContentAlignment(){}});
 const slide={
   getBackground:()=>({setSolidFill(){}}),
   insertShape:(type,x,y,w,h)=>{assert.ok(w>=0&&h>=0);return shape();},
   insertTextBox:(txt,x,y,w,h)=>{
     const b={txt:String(txt),x,y,w,h,font:0};
     boxes.push(b);
     return {getText:()=>({getTextStyle:()=>({
       setFontFamily(){return this},
       setFontSize(n){b.font=n;return this},
       setBold(){return this},
       setForegroundColor(){return this}}),
       getParagraphStyle:()=>({setParagraphAlignment(){}})})};
   }
 };
 ctx.SlidesApp={PredefinedLayout:{BLANK:'blank'},
   ShapeType:{RECTANGLE:'rect',ROUND_RECTANGLE:'round',ELLIPSE:'circle'},
   ParagraphAlignment:{START:'start',CENTER:'center',END:'end'},
   ContentAlignment:{MIDDLE:'middle'}};
 vm.createContext(ctx);
 vm.runInContext(read('SlidesGenerator.js'),ctx);
 return {ctx,slide,boxes};
}
const long={
 number:2,type:'statement',eyebrow:'LE PROBLÈME',
 title:'Une partie des petits commerces de Douala présente ses produits uniquement en magasin.',
 body:'Réponses commerciales lentes, opportunités de devis perdues, temps consacré à répéter les prix et difficultés à suivre les demandes entrantes.',
 sideLabel:'PERSONNES CONCERNÉES',
 sideValue:'Commerçants indépendants de Douala comptant de 1 à 10 salariés : boutiques de mode, beauté, maison et services de proximité.',
 proof:'Jeu de données simulé : 24 entretiens fictifs, dont 18 commerçants déclareraient ne pas posséder de catalogue web structuré.'
};
test('clean render: temporary labels and markdown never leak, factual simulation disclosures survive',()=>{
 const {ctx,slide,boxes}=build();
 const slides=[long,
   {number:6,type:'market',eyebrow:'NOTRE MARCHÉ',title:'Clientèle cible',
    geography:'Douala, Cameroun, pendant les 9 premiers mois ; extension à Yaoundé envisagée à partir du mois 10.',
    estimate:'3 000 commerces, dont 1 800 à Douala et 1 200 à Yaoundé (hypothèse non vérifiée).',
    source:'Calcul bottom-up entièrement synthétique pour la recette, non vérifié.'},
   {number:7,type:'business',eyebrow:'MODÈLE ÉCONOMIQUE',title:'Création et maintenance',
    pricing:'Pack Standard : 180 000 FCFA par site, 18 000 FCFA par mois maintenance ; Pack Premium : 350 000 FCFA par site.',
    acquisition:'Visites commerciales ciblées à Douala, démonstrations, recommandations et partenariats avec associations de commerçants.',
    revenue:'Précommercial'},
   {number:9,type:'competition',eyebrow:'DIFFÉRENCIATION',title:'Positionnement concurrentiel',
    competitors:['Pages Facebook, WhatsApp Business sans site dédié','Agences web sur devis'],
    advantage:''},
   {number:10,type:'goToMarket',eyebrow:'FEUILLE DE ROUTE',title:'Stratégie commerciale',
    milestones:[
      'Mois 1 à 3 — Développement et structuration : finaliser la plateforme de création de sites web et de catalogues numériques, acquérir les équipements et constituer l’équipe.',
      '**Mois 4 à 6 — Validation commerciale :** accompagner 20 commerces pilotes à Douala, tester les offres commerciales et mesurer la satisfaction des utilisateurs.',
      'Mois 7 à 9 — Accélération commerciale : atteindre 50 commerces accompagnés, structurer les partenariats locaux et standardiser les livraisons.',
      'Mois 10 à 12 — Consolidation : atteindre 100 commerces cumulés, renforcer les revenus de maintenance et évaluer la rentabilité opérationnelle.'
    ]},
   {number:12,type:'funding',eyebrow:'DEMANDE DE FINANCEMENT',title:'60 000 000 FCFA',
     uses:[],milestones:[],subtitle:'',contact:''}];
 slides.forEach((d,i)=>ctx.createPremiumSlide_({appendSlide:()=>slide},d,i,12));
 const txt=boxes.map(x=>x.txt).join('\n');
 assert.match(txt,/entretiens fictifs/);
 assert.match(txt,/hypothèse non vérifiée/);
 assert.doesNotMatch(txt,/BROUILLON|DONNÉES À VÉRIFIER|VISUEL FOURNI|PREMIÈRE ÉTAPE DOCUMENTÉE|Ventilation détaillée des fonds|PITCH STUDIO/);
 assert.doesNotMatch(txt,/\*\*/);
 assert.ok(boxes.every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=720.2&&b.y+b.h<=405.2));
 const overflows=boxes.filter(b=>{
   if(b.h<17||b.font===0)return false;
   const lines=ctx.AG24_LAYOUT_countLines_(b.txt,b.w/0.75,b.font,false);
   return lines*b.font*1.24+3>b.h+6;
 }).map(b=>({text:b.txt.slice(0,50),lines:ctx.AG24_LAYOUT_countLines_(b.txt,b.w/0.75,b.font,false),
   h:b.h,font:b.font}));
 assert.deepEqual(overflows,[],'likely text overflows '+JSON.stringify(overflows));
});
test('empty fields are silently skipped, while source content is never invented',()=>{
 const {ctx,slide,boxes}=build();
 ctx.createPremiumSlide_({appendSlide:()=>slide},{type:'competition',number:9,
   title:'Positionnement concurrentiel',competitors:[],advantage:''},8,12);
 const txt=boxes.map(b=>b.txt).join(' ');
 assert.doesNotMatch(txt,/à compléter|à préciser|Information non documentée|Source requise/i);
 assert.doesNotMatch(txt,/PREUVE \/ SOURCE/);
 assert.equal(ctx.AG24_LAYOUT_plain_('**Mois 1 à 3** — livraison'),'Mois 1 à 3 — livraison');
});

test('dated milestones survive introductory prose and final funding horizon is retained',()=>{
  const {ctx}=build();
  const intro='Grâce au financement, l’équipe prévoit une accélération commerciale.';
  const raw=[intro,
    'Mois 1 à 3 — Lancement',
    'Mois 4 à 6 — Validation',
    'Mois 7 à 9 — Accélération',
    'Mois 10 à 12 — Consolidation',
    'Mois 13 à 18 — Expansion'];
  const result=Array.from(ctx.AG24_LAYOUT_pickMilestones_(raw,4));
  assert.equal(result.length,4);
  assert.equal(result[0],raw[1]);
  assert.equal(result.at(-1),raw.at(-1));
  assert.ok(result.every(t=>/Mois/.test(t)));
});
