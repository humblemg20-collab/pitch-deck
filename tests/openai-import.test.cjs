'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const SOURCE = fs.readFileSync(path.join(__dirname,'..','PitchOpenAIImport.js'),'utf8');

function setup() {
  const requests=[],events=[], project={
    projectId:'PITCH-1',data:{identity:{}},slidesUrl:'http://prior',
    pdfUrl:'http://prior.pdf',status:'GENERATED'
  };
  const fields=[
    {path:'identity.tagline',value:'Une énergie plus accessible',
      evidence:'énergie plus accessible',confidence:.92},
    {path:'identity.unknown',value:'faux',evidence:'invalide',confidence:1},
    {path:'identity.tagline',value:'doublon',evidence:'d',confidence:.98}
  ];
  const run=['IMP-1','PITCH-1','ASSET-1','SHA1','READY',
    'result-1','gpt-4.1-mini','', '2026-10-08T00:00:00Z','2026-10-08T00:00:00Z'];
  const sheet={
    rows:[['importId','projectId','assetId','sourceSha256','status',
      'resultFileId','model','errorCode','createdAt','updatedAt'],run],
    getLastRow(){return this.rows.length;},
    getRange(row,col,nr,nc){return{
      getValues:()=>Array.from({length:nr},(_,i)=>
        this.rows[row-1+i].slice(col-1,col-1+nc)),
      setValues:values=>values.forEach((v,i)=>{
        v.forEach((x,j)=>{this.rows[row-1+i][col-1+j]=x;});
      })
    };}
  };
  const result={sourceAssetId:'ASSET-1',sourceSha256:'SHA1',
    fields:fields};
  const doc=[37,80,68,70,45,49,46,48,10];
  const ctx=vm.createContext({
    console,
    Date, JSON, Object, Math, Array, String, Number,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>
      k==='OPENAI_API_KEY'?'dummy-test-key': ''})},
    Utilities:{
      base64Encode:v=>Buffer.from(v).toString('base64'),
      newBlob:(s,mime,name)=>({data:s,mime,name})
    },
    UrlFetchApp:{fetch:(url,options)=>{
      requests.push({url,options,payload:JSON.parse(options.payload)});
      return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({
        id:'resp-test',model:'gpt-4.1-mini',status:'completed',
        output:[{content:[{type:'output_text',text:JSON.stringify({fields})}]}],
        usage:{input_tokens:20,output_tokens:40}
      })};
    }},
    DriveApp:{getFileById:id=>{
      if(id==='file-1') return {getBlob:()=>({getBytes:()=>doc})};
      if(id==='result-1') return {getBlob:()=>({
        getDataAsString:()=>JSON.stringify(result)
      })};
      throw new Error('Unexpected file '+id);
    }},
    AG24_ASSETS_V1:{DOCUMENT_MAX_BYTES:8*1024*1024},
    AG24_ASSET_assertSignature_:(type,bytes)=>{
      if(type!=='application/pdf'||bytes[0]!==37) throw Error('Bad signature');
    },
    AG24_ASSET_authorize_:(id,token)=>{
      if(id!=='PITCH-1'||token!=='secret')throw Error('unauthorized');
      return project;
    },
    AG24_ASSET_findActive_:(id,assetId)=>assetId==='ASSET-1'?{
      assetId:'ASSET-1',kind:'DOCUMENT',role:'SOURCE_DOCUMENT',
      fileId:'file-1',mimeType:'application/pdf',
      name:'dossier.pdf',sha256:'SHA1'
    }:null,
    getQuestionnaireSchema_:()=>[{id:'identity',fields:[
      {id:'tagline',type:'textarea',maxLength:180},
      {id:'declaration',type:'checkbox'},
      {id:'country',type:'text',maxLength:60}
    ]}],
    getDatabase_:()=>({getSheetByName:()=>sheet}),
    cleanString_:(v,max)=>String(v==null?'':v).replace(/[<>]/g,'').trim().slice(0,max||6000),
    isValidEmail_:v=>/^\S+@\S+\.\S+$/.test(v),
    nowIso_:()=> '2026-10-08T02:00:00Z',
    safeApi_:cb=>{try{return{ok:true,data:cb()};}catch(e){return{ok:false,error:e.message};}},
    withScriptLock_:cb=>cb(),
    publicProject_:p=>p,
    calculateProgress_:()=>({percent:45}),
    runPitchRules_:()=>[],
    calculatePitchReadinessScore_:()=>({total:49}),
    updateProject_:()=>project,
    AG24_CONFIG:{STATUS:{READY:'READY',DRAFT:'DRAFT'}},
    logEvent_:(...args)=>events.push(args)
  });
  vm.runInContext(SOURCE,ctx,{filename:'PitchOpenAIImport.js'});
  return {ctx,project,requests,sheet,events,fields};
}

test('OpenAI code parses, never loads HumbleOS, strict result schema',()=>{
  assert.doesNotThrow(()=>new Function(SOURCE));
  assert.doesNotMatch(SOURCE,/UrlFetchApp\.fetch\([^)]*humbleos/i);
  assert.match(SOURCE,/function TEST_PITCH_OPENAI_CONNECTION_\(\)/);
  assert.match(SOURCE,/KEY_UNAVAILABLE_IN_THIS_SCRIPT/);
  assert.doesNotMatch(SOURCE,/return\s+\{[^}]*apiKey:/);
  const f=setup(), schema=f.ctx.AG24_IMPORT_schema_();
  assert.equal(schema.additionalProperties,false);
  assert.equal(schema.properties.fields.items.additionalProperties,false);
});

test('OpenAI receives private binary as Responses input_file, no stored response',()=>{
  const f=setup();
  const whitelist=f.ctx.AG24_IMPORT_whitelist_();
  const result=f.ctx.AG24_IMPORT_callOpenAI_({
    mimeType:'application/pdf',name:'dossier.pdf',fileId:'file-1'
  },whitelist);
  assert.equal(f.requests.length,1);
  const request=f.requests[0];
  assert.equal(request.url,'https://api.openai.com/v1/responses');
  assert.equal(request.payload.store,false);
  assert.equal(request.payload.text.format.strict,true);
  assert.equal(request.payload.input[0].content[0].type,'input_file');
  assert.match(request.payload.input[0].content[0].file_data,/^data:application\/pdf;base64,/);
  assert.equal(request.options.headers.Authorization,'Bearer dummy-test-key');
  assert.equal(result.content.length,1);
  assert.equal(result.content[0].path,'identity.tagline');
});

test('Unknown paths, duplicate fields, checkbox, weak evidence and low confidence excluded',()=>{
  const f=setup(), whitelist=f.ctx.AG24_IMPORT_whitelist_();
  assert.equal(whitelist['identity.declaration'],undefined);
  const cleaned=f.ctx.AG24_IMPORT_validateResult_({fields:[
    ...f.fields,
    {path:'identity.country',value:'X',evidence:'',confidence:1},
    {path:'identity.country',value:'Y',evidence:'Y',confidence:.3}
  ]},whitelist);
  assert.equal(cleaned.length,1);
  assert.equal(cleaned[0].value,'Une énergie plus accessible');
});

test('Approval fills only blanks and records applied paths',()=>{
  const f=setup();
  const outcome=f.ctx.apiApplyDocumentAnalysis({
    projectId:'PITCH-1',token:'secret',importId:'IMP-1',
    paths:['identity.tagline']
  });
  assert.equal(outcome.ok,true);
  assert.deepEqual(Array.from(outcome.data.applied),['identity.tagline']);
  assert.equal(f.project.data.identity.tagline,'Une énergie plus accessible');
  assert.equal(f.project.slidesUrl,'');
  assert.equal(f.sheet.rows[1][4],'APPLIED');
  assert.equal(f.events.at(-1)[1],'IMPORT_APPLIED');
});

test('Human value always wins, repeated apply cannot override',()=>{
  const f=setup();
  f.project.data.identity.tagline='Réponse humaine';
  const first=f.ctx.apiApplyDocumentAnalysis({
    projectId:'PITCH-1',token:'secret',importId:'IMP-1',
    paths:['identity.tagline']
  });
  assert.equal(first.ok,true);
  assert.deepEqual(Array.from(first.data.applied),[]);
  assert.deepEqual(Array.from(first.data.skipped),['identity.tagline']);
  assert.equal(f.project.data.identity.tagline,'Réponse humaine');
  assert.equal(f.project.slidesUrl,'http://prior');
  const again=f.ctx.apiApplyDocumentAnalysis({
    projectId:'PITCH-1',token:'secret',importId:'IMP-1',
    paths:['identity.tagline']
  });
  assert.equal(again.ok,true);
  assert.equal(again.data.alreadyApplied,true);
});

test('Unauthorized project or unapproved path never changes data',()=>{
  const f=setup();
  const bad=f.ctx.apiApplyDocumentAnalysis({
    projectId:'PITCH-1',token:'wrong',importId:'IMP-1',
    paths:['identity.tagline']
  });
  assert.equal(bad.ok,false);
  const injection=f.ctx.apiApplyDocumentAnalysis({
    projectId:'PITCH-1',token:'secret',importId:'IMP-1',
    paths:['review.declaration']
  });
  assert.equal(injection.ok,false);
  assert.equal(f.project.data.identity.tagline,undefined);
  assert.equal(f.sheet.rows[1][4],'READY');
});


test('OpenAI import requires explicit server-side document consent',()=>{
  const f=setup();
  const denied=f.ctx.apiAnalyzeProjectDocument({projectId:'PITCH-1',token:'secret',assetId:'ASSET-1'});
  assert.equal(denied.ok,false);
  assert.match(String(denied.error),'OPENAI_CONSENT_REQUIRED');
  assert.equal(f.requests.length,0);
});
