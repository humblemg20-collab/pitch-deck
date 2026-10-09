'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
function engine(data) {
 const c={Number,Date,Math,Array,JSON,AG24_CONFIG:{DEFAULT_CURRENCY:'FCFA'},
 cleanString_:v=>String(v||'').trim(),cleanNumber_:v=>Number(v)||0,
 truncate_:(v,n)=>String(v||'').slice(0,n),
 splitLines_:(v,n)=>String(v||'').split(/\r?\n|;|•/).map(t=>t.trim()).filter(Boolean).slice(0,n),
 formatMoney_:(v,c)=>String(v)+' '+c};
 vm.createContext(c);
 vm.runInContext(read('PitchQualityEngine.js'),c);
 vm.runInContext(read('ContentBuilder.js'),c);
 const project={projectName:'Demo',email:'a@example.com',data};
 return {c,project,slides:c.buildStandardDeckContent_(project),quality:c.AG24_PITCH_quality_(project)};
}
test('PDF regression: incomplete investor claims produce draft and specific warnings',()=>{
 const f=engine({identity:{sector:'Technologie'},problem:{problemEvidence:'les relations clients'},
 market:{geography:'Cameroun — Logistique',marketSource:'Source requise'},
 funding:{amountRequested:1000000,useOfFunds:'le materiel a acheter'}});
 assert.equal(f.quality.state,'DRAFT');
 const issues=Array.from(f.quality.issues,r=>r.code);
 for(const code of ['GEOGRAPHY_INCLUDES_SECTOR','MARKET_SOURCE_MISSING','FUND_USE_UNDEREXPLAINED','PROBLEM_EVIDENCE_VAGUE'])assert.ok(issues.includes(code),code);
});
test('narrative builds twelve sections without inventing empty steps, competitors or people',()=>{
 const f=engine({solution:{howItWorks:'Créer un site'},market:{competitors:'Boutique physique'}});
 assert.equal(f.slides.length,12);
 assert.equal(f.slides[2].type,'insight');
 assert.equal(f.slides[4].items.length,1);
 assert.equal(f.slides[8].competitors.length,1);
 assert.equal(f.slides[10].founders.length,0);
 assert.equal(f.slides[11].uses.length,0);
 assert.doesNotMatch(JSON.stringify(f.slides),/Information à compléter|Source requise/);
});
test('renderer keeps typography legible and labels incomplete output as draft',()=>{
 const s=read('SlidesGenerator.js');
 assert.match(s,/function createInsightSlide_/);
 assert.match(s,/qualityLabel \+ ' • DONNÉES À VÉRIFIER'/);
 assert.match(s,/Math\.max\(9, Number\(value \|\| 14\) \* 0\.86\)/);
 assert.doesNotMatch(s,/result\.push\('Information à compléter'\)/);
 const assets=read('SlideAssets.js');
 assert.match(assets,/Math\.min\(targetWidth\/originalWidth,targetHeight\/originalHeight\)/);
});
