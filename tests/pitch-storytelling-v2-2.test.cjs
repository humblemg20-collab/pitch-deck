'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function harness() {
 const rows=[],files=new Map(),events=[];let uuid=0,calls=0,responseMode='ok',lastRequest=null;
 const project={projectId:'AG24-TEST-1',projectName:'Humble MG',email:'private@example.com',
  data:{identity:{projectName:'Humble MG',sector:'Technologie',country:'Cameroun',
     tagline:'Accompagnement numérique des entreprises'},
    problem:{problemDescription:'Des entreprises perdent des clients faute de visibilité',
      targetUser:'Les entrepreneurs au Cameroun',consequences:'Baisse des ventes'},
    solution:{solutionDescription:'Création de sites internet pour entreprises',
      valueProposition:'Améliorer la présence en ligne'},
    market:{payingCustomer:'Entrepreneurs',geography:'Cameroun'},
    funding:{amountRequested:1000000,currency:'EUR',useOfFunds:'Achat de matériel',
      milestones:'Atteindre 10 clients mensuels'},
    review:{contactEmail:'confidential@example.com',declaration:true}}
 };
 const sheet={
  getLastRow:()=>rows.length,
  getRange:(row,col,count)=>({
   getValues:()=>rows.slice(row-1,row-1+count).map(x=>x.slice()),
   setValues:values=>{values.forEach((v,i)=>rows[row-1+i]=v.slice());}
  }),
  setFrozenRows(){},
  appendRow:v=>rows.push(v.slice())
 };
 const folders=new Map();
 function folder(name){
  const node={name,
   getFoldersByName:key=>({hasNext:()=>folders.has(key),next:()=>folders.get(key)}),
   createFolder:key=>{const f=folder(key);folders.set(key,f);return f;},
   createFile:blob=>{const id='file-'+(++uuid);const obj={getId:()=>id,
     getBlob:()=>({getDataAsString:()=>blob.value}),setTrashed(){files.delete(id)}};
     files.set(id,obj);return obj;}
  };return node;
 }
 const generatedFolder=folder('generated');
 const context={
  console:{error(){},warn(){}},Date,JSON,Number,Object,Array,String,Math,
  AG24_CONFIG:{DEFAULT_CURRENCY:'FCFA'},
  AG24_PITCH_IMPORT:{API_URL:'https://api.openai.com/v1/responses'},
  AG24_IMPORT_config_:()=>({configured:true,key:'test-key',model:'gpt-4.1-mini'}),
  AG24_IMPORT_extractOutputText_:r=>r.output_text,
  Utilities:{
    DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'UTF_8'},
    computeDigest:(alg,v)=>Array.from(crypto.createHash('sha256').update(v).digest()),
    getUuid:()=>String(++uuid).padStart(10,'0'),
    newBlob:(value,mime,name)=>({value,mime,name})
  },
  getDatabase_:()=>({getSheetByName:()=>rows.length?sheet:null,insertSheet:()=>sheet}),
  DriveApp:{getFileById:id=>{if(!files.has(id))throw Error('no file');return files.get(id)}},
  getOrCreateGeneratedFolder_:()=>generatedFolder,
  findProject_:id=>id===project.projectId?project:null,
  assertProjectToken_:(p,t)=>{if(t!=='valid-token')throw Error('INVALID_TOKEN')},
  withScriptLock_:fn=>fn(),
  safeApi_:fn=>{try{return {ok:true,data:fn()}}catch(e){return {ok:false,error:{message:e.message}}}},
  cleanString_:(v,n)=>String(v||'').trim().slice(0,n||6000),
  cleanNumber_:v=>Number(v)||0,truncate_:(s,n)=>String(s||'').slice(0,n),
  splitLines_:(s,n)=>String(s||'').split(/\n|;|•/).map(x=>x.trim()).filter(Boolean).slice(0,n||6),
  formatMoney_:(v,c)=>String(v)+' '+c,
  nowIso_:()=>new Date().toISOString(),
  logEvent_:(id,event,metadata)=>events.push({event,metadata}),
  UrlFetchApp:{fetch:(url,options)=>{
    calls++;lastRequest=JSON.parse(options.payload);
    if(responseMode==='http')return {getResponseCode:()=>429,getContentText:()=>''};
    const slides=Array.from({length:12},(_,i)=>{
      const n=i+1,allowed=context.AG24_STORY.EDITS[n];
      return {number:n,
        title:allowed.includes('title')?'Une proposition claire pour les entrepreneurs':'',
        body:allowed.includes('body')?'Une solution numérique adaptée au besoin exprimé':'',
        subtitle:allowed.includes('subtitle')?'Des sites internet pour développer la présence en ligne':''};
    });
    if(responseMode==='hallucination')slides[1].title='Nous avons signé 999 nouveaux contrats';
    if(responseMode==='bad-structure')slides.pop();
    return {getResponseCode:()=>200,
      getContentText:()=>JSON.stringify({status:'completed',model:'gpt-4.1-mini',
        output_text:JSON.stringify({slides}),usage:{input_tokens:300,output_tokens:240}})};
  }}
 };
 vm.createContext(context);
 for(const file of ['PitchQualityEngine.js','ContentBuilder.js','PitchStorytellingEngine.js'])
   vm.runInContext(read(file),context);
 return {context,project,rows,events,get calls(){return calls},
  get lastRequest(){return lastRequest},set responseMode(value){responseMode=value},
  prepare:(consent=true,token='valid-token')=>context.apiPreparePitchNarrative({
    projectId:project.projectId,token,consent}),
  status:(token='valid-token')=>context.apiPitchNarrativeStatus(project.projectId,token)};
}
test('consent must be explicit and token checked even for cached analysis',()=>{
 const f=harness();
 assert.equal(f.prepare(false).ok,false);
 assert.equal(f.prepare(true,'bad-token').ok,false);
 assert.equal(f.status('bad-token').ok,false);
 assert.equal(f.calls,0);
 assert.equal(f.rows.length,0);
});
test('OpenAI writes only versioned narrative, never modifies original answers',()=>{
 const f=harness(),initial=JSON.stringify(f.project.data);
 const result=f.prepare();
 assert.equal(result.ok,true,JSON.stringify(result.error));
 assert.equal(result.data.status,'READY');
 assert.equal(f.calls,1);
 assert.equal(JSON.stringify(f.project.data),initial);
 assert.equal(f.rows.length,2);
 assert.equal(f.rows[1][4],'READY');
 assert.equal(f.status().data.status,'READY');
 const slides=f.context.buildStandardDeckContent_(f.project);
 const applied=f.context.AG24_STORY_applyCached_(f.project,slides);
 assert.equal(applied.used,true);
 assert.equal(slides[1].title,'Une proposition claire pour les entrepreneurs');
 assert.equal(slides[11].title,'1000000 EUR');
 assert.equal(slides[11].contact,'confidential@example.com');
 assert.equal(f.prepare().data.cached,true);
 assert.equal(f.calls,1);
 assert.equal(f.lastRequest.store,false);
 assert.doesNotMatch(JSON.stringify(f.lastRequest),/confidential@example.com|valid-token|private@example.com/);
});
test('modified questionnaire invalidates old storytelling without losing the saved run',()=>{
 const f=harness();assert.equal(f.prepare().ok,true);
 f.project.data.solution.solutionDescription='Nouvelle solution numérique pour les écoles';
 assert.equal(f.status().data.status,'NOT_READY');
 const slides=f.context.buildStandardDeckContent_(f.project);
 assert.equal(f.context.AG24_STORY_applyCached_(f.project,slides).used,false);
 assert.equal(f.prepare().ok,true);
 assert.equal(f.calls,2);
 assert.equal(f.rows.length,3);
 assert.equal(f.rows[1][4],'READY');
});
test('rejects invented numeric facts and keeps free generation path available',()=>{
 const f=harness();f.responseMode='hallucination';
 const result=f.prepare();
 assert.equal(result.ok,false);
 assert.equal(f.rows[1][4],'FAILED');
 assert.equal(f.status().data.status,'NOT_READY');
 const slides=f.context.buildStandardDeckContent_(f.project);
 assert.equal(slides.length,12);
 assert.equal(f.context.AG24_STORY_applyCached_(f.project,slides).used,false);
 assert.ok(f.events.some(e=>e.event==='STORY_FAILED'));
});
test('rejects incomplete structure and OpenAI transport failure',()=>{
 const f=harness();f.responseMode='bad-structure';
 assert.equal(f.prepare().ok,false);
 f.responseMode='http';
 assert.equal(f.prepare().ok,false);
 assert.equal(f.rows.length,3);
 assert.equal(f.rows[2][6],'STORY_OPENAI_HTTP_429');
});
test('schema disallows funding-amount rewrite, new numeric claims and unapproved copy fields',()=>{
 const f=harness(),source=f.context.AG24_STORY_source_(f.project);
 const all=Array.from({length:12},(_,i)=>({number:i+1,title:'',body:'',subtitle:''}));
 all[11].title='5000000 EUR';
 assert.throws(()=>f.context.AG24_STORY_validate_(all,source),/STORY_UNEXPECTED_FIELD/);
 all[11].title='';
 all[1].title='Plus de 999 clients payants';
 assert.throws(()=>f.context.AG24_STORY_validate_(all,source),/STORY_UNSUPPORTED_NUMBER/);
 all[1].title='Garanties sur le projet';all[8].body='Autre information';
 assert.throws(()=>f.context.AG24_STORY_validate_(all,source),/STORY_UNEXPECTED_FIELD/);
});
test('resumed project has a separate explicit OpenAI action and safe status labels',()=>{
 const ui=read('App.html'),gen=read('SlidesGenerator.js');
 assert.match(ui,/function preparePitchStory_\(/);
 assert.match(ui,/window\.confirm\('Autoriser l’envoi des réponses/);
 assert.match(ui,/apiPreparePitchNarrative/);
 assert.match(ui,/consent:true/);
 assert.match(ui,/apiPitchNarrativeStatus/);
 assert.match(ui,/Régénérer le deck/);
 assert.match(gen,/AG24_STORY_applyCached_\(project,slidesContent\)/);
 assert.match(gen,/OPENAI_APPROVED/);
});
