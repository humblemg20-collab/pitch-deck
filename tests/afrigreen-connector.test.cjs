'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'PitchStudio_AfriGreenConnectorV1_1_0.js'),'utf8');
function fixture(){
 const projects=[],links=[],secret='T'.repeat(64);let serial=0,mails=0;
 const sheet={
  getLastRow:()=>links.length+1,
  getRange:(row,col,count)=>({
   getValues:()=>row===1?[['sourceProjectId','pitchProjectId','email','projectName','createdAt','updatedAt']]:
      links.slice(row-2,row-2+count).map(a=>a.slice()),
   setValues:()=>{}
  }),
  setFrozenRows:()=>{},
  appendRow:row=>links.push(row.slice())
 };
 const context={
  console:{error:()=>{}},Date,JSON,Array,Math,Object,String,Error,RegExp,
  PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},
  Utilities:{DigestAlgorithm:{SHA_256:'SHA256'},Charset:{UTF_8:'UTF_8'},
   computeDigest:(type,value)=>Array.from(crypto.createHash('sha256').update(value).digest())},
  ContentService:{MimeType:{JSON:'JSON'},createTextOutput:text=>({text,setMimeType(){return this;}})},
  cleanEmail_:s=>String(s).trim().toLowerCase(),cleanString_:(s,n)=>String(s||'').trim().slice(0,n),
  isValidEmail_:s=>s.includes('@')&&s.includes('.'),
  getPrivateConfig_:()=>({webAppUrl:'https://script.google.com/macros/s/test/exec'}),
  ScriptApp:{getService:()=>({getUrl:()=>''})},
  getDatabase_:()=>({getSheetByName:()=>sheet}),
  getProjectsSheet_:()=>({getDataRange:()=>({getValues:()=>[
   ['projectId'],...projects.map(p=>[p.projectId,p.email,p.projectName])
  ]})}),
  rowToProject_:row=>projects.find(p=>p.projectId===row[0]),
  findProject_:id=>projects.find(p=>p.projectId===id)||null,
  withScriptLock_:fn=>fn(),enforceCreationLimit_:()=>{},
  createProjectId_:()=>('pitch-'+(++serial)),
  randomToken_:()=>('random-token-'+(++serial)),
  randomAccessCode_:()=>String(++serial).padStart(6,'0'),
  hashValue_:s=>'hash('+s+')',calculateProgress_:()=>({}),
  insertProject_:p=>(projects.push(p),p),updateProject_:p=>p,
  nowIso_:()=>new Date().toISOString(),logEvent_:()=>{},
  createResumeUrl_:(id,token)=>'https://script.google.com/macros/s/test/exec#project='+id+'&token='+token,
  sendProjectCreatedEmail_:()=>{mails+=1},
  AG24_CONFIG:{STATUS:{DRAFT:'DRAFT',GENERATED:'GENERATED'}},
  DriveApp:{getFileById:()=>{throw new Error('Should not access Drive in these tests');}}
 };
 vm.createContext(context);vm.runInContext(src,context);
 function call(data){return JSON.parse(context.doPost({postData:{contents:JSON.stringify(data)}}).text);}
 return {call,secret,projects,links,get mails(){return mails;}};
}
test('unauthenticated and unknown JSON POST operations fail closed',()=>{
 const f=fixture();
 assert.equal(f.call({action:'HEALTH'}).code,'PITCH_AG_UNAUTHORIZED');
 assert.equal(f.call({action:'HEALTH',secret:'X'.repeat(64)}).code,'PITCH_AG_UNAUTHORIZED');
 assert.equal(f.call({action:'INVALID',secret:f.secret}).code,'PITCH_AG_ACTION_NOT_ALLOWED');
 assert.equal(f.call({action:'HEALTH',secret:f.secret}).ok,true);
});
test('stable source ID never creates duplicates; URL token stays in fragment',()=>{
 const f=fixture();
 const req={action:'OPEN_OR_CREATE_PITCH_PROJECT',secret:f.secret,
 email:'member@example.com',projectName:'Initial',sourceProjectId:'AF24-ID-123'};
 const created=f.call(req);
 assert.equal(created.ok,true);assert.equal(created.created,true);
 assert.match(created.launchUrl,/#project=.*&token=/);
 assert.doesNotMatch(created.launchUrl,/\?project=|\?token=/);
 assert.equal(f.projects[0].codeHash,'hash('+created.pitchProjectId+'|000003)');
 const reopened=f.call({...req,projectName:'Updated externally'});
 assert.equal(reopened.ok,true);assert.equal(reopened.created,false);
 assert.equal(reopened.pitchProjectId,created.pitchProjectId);
 assert.equal(f.projects.length,1);assert.equal(f.links.length,1);
 assert.equal(f.projects[0].projectName,'Initial');
 assert.notEqual(created.launchUrl,reopened.launchUrl);
 assert.equal(f.mails,1);
 const denied=f.call({...req,email:'other@example.com'});
 assert.equal(denied.code,'PITCH_AG_SOURCE_OWNER_MISMATCH');
});
test('legacy identical names refuse ambiguous ownership matching',()=>{
 const f=fixture();
 f.projects.push({projectId:'A',projectName:'Same Name',email:'member@example.com'});
 f.projects.push({projectId:'B',projectName:'Same Name',email:'member@example.com'});
 const answer=f.call({action:'OPEN_OR_CREATE_PITCH_PROJECT',secret:f.secret,
   email:'member@example.com',projectName:'Same Name'});
 assert.equal(answer.code,'PITCH_AG_AMBIGUOUS_LEGACY_MATCH');
});
test('output query never renames, rotates tokens, grants viewers or creates rows',()=>{
 const f=fixture();
 const got=f.call({action:'GET_GENERATED_PITCH',secret:f.secret,
   email:'member@example.com',projectName:'Example',sourceProjectId:'never-created'});
 assert.equal(got.found,false);
 assert.equal(f.projects.length,0);assert.equal(f.links.length,0);
 assert.doesNotMatch(src,/addViewer\s*\(/);
 const diagnostics=fs.readFileSync(path.join(root,'RuntimeDiagnostics.js'),'utf8');
 assert.match(diagnostics,/function TEST_PITCH_STUDIO_GLOBAL_V2_\(/);
 assert.match(diagnostics,/getInstallationStatus_\(/);
 assert.match(diagnostics,/buildStandardDeckContent_\(/);
});
