'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

function fixture(problemText,advantageText){
  const ctx={Number,Date,Math,Array,JSON,AG24_CONFIG:{DEFAULT_CURRENCY:'FCFA'},
    cleanString_:v=>String(v||'').trim(),cleanNumber_:v=>Number(v)||0,
    truncate_:(value,max)=>{
      const s=String(value||'');
      return s.length>max?s.slice(0,max-1).trim()+'…':s;
    },
    splitLines_:(v,n)=>String(v||'').split(/\r?\n|;/).map(x=>x.trim()).filter(Boolean).slice(0,n),
    formatMoney_:(v,c)=>String(v)+' '+c
  };
  vm.createContext(ctx);
  vm.runInContext(read('PitchQualityEngine.js'),ctx);
  vm.runInContext(read('ContentBuilder.js'),ctx);
  const project={projectName:'Humble MG',email:'demo@example.invalid',data:{
    identity:{projectName:'Humble MG',country:'Cameroun',sector:'Technologie'},
    problem:{problemDescription:problemText,consequences:'Temps perdu'},
    market:{advantage:advantageText,competitors:'Plateformes en libre-service'},
    funding:{currency:'FCFA',amountRequested:60000000}
  }};
  return {ctx,project,slides:ctx.buildStandardDeckContent_(project)};
}

const description=[
  'Une partie des petits commerces de Douala présente ses produits uniquement en magasin ou dans des messages épars.',
  'Sans catalogue consultable ni point de contact structuré, les prospects peinent à découvrir l’offre, demander un devis et retrouver les disponibilités des produits proposés.'
].join(' ');
const advantage=[
  'Offre avec prix publiés, catalogue adapté aux smartphones, installation guidée et formation courte en français',
  '(proposition à valider auprès des premiers commerces pilotes).'
].join(' ');

test('slide 2: one complete sentence replaces a mid-word cutoff; source is unchanged',()=>{
 const f=fixture(description,advantage);
 assert.ok(description.length>240,'longer than previous limit');
 assert.equal(f.slides[1].title,description.split('. ')[0]+'.');
 assert.ok(f.slides[1].title.endsWith('épars.'));
 assert.doesNotMatch(f.slides[1].title,/\.{3}$|…$|ret\.?$/);
 assert.equal(f.project.data.problem.problemDescription,description);
});

test('slide 9: complete positioning is displayed without the old 120-char cutoff',()=>{
 const f=fixture(description,advantage);
 assert.ok(advantage.length>120,'longer than previous limit');
 assert.equal(f.slides[8].advantage,advantage);
 assert.match(f.slides[8].advantage,/premiers commerces pilotes\)\.$/);
 assert.doesNotMatch(f.slides[8].advantage,/\(proposi(?:\.|…)?$/);
 assert.equal(f.project.data.market.advantage,advantage);
});

test('only slides 2/9 use the excerpt behavior; ordinary deck content stays the same',()=>{
 const f=fixture(description,advantage);
 assert.equal(f.slides.length,12);
 assert.equal(f.slides[0].type,'cover');
 assert.equal(f.slides[1].type,'statement');
 assert.equal(f.slides[8].type,'competition');
 assert.equal(f.slides[9].type,'goToMarket');
 assert.equal(f.slides[11].title,'60000000 FCFA');
 assert.equal(f.slides[8].title,'Positionnement concurrentiel');
 assert.equal(f.slides[1].body,'Temps perdu');
});

test('long multiparagraph advantage chooses a full sentence, never a broken word',()=>{
 const a='Prix transparents et mise en ligne accompagnée pour les commerces indépendants.';
 const extra='La formation est proposée sur site pour les équipes. '.repeat(8);
 const f=fixture(description,a+' '+extra);
 assert.ok(f.slides[8].advantage.startsWith(a));
 assert.ok((a+' '+extra).startsWith(f.slides[8].advantage));
 assert.ok(f.slides[8].advantage.length<=290);
 assert.ok(f.slides[8].advantage.endsWith('.'));
 assert.doesNotMatch(f.slides[8].advantage,/\.{3}$|…$/);
});

test('when no safe sentence boundary exists, preserve the complete source rather than mutilate it',()=>{
 const a='Une formulation sans ponctuation intermédiaire décrivant des avantages distincts et vérifiables '.repeat(5).trim();
 const f=fixture(description,a);
 assert.equal(f.slides[8].advantage,a);
});
