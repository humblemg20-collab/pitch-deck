'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
test('free Pitch Studio does not expose paid sales/gates',()=>{
 const app=read('App.html'),api=read('Api.js');
 for(const s of [app,api])assert.doesNotMatch(s,/selar|paymentAccessCode|verifyPitchAccess_|apiVerifyPitchAccess|consumePitchAccessForProject_|data-selar-payment/i);
 assert.match(app,/Commencer gratuitement/);
 assert.match(api,/enforceCreationLimit_\(\s*email\s*\)/);
});
test('anonymous free project creation requires valid email, name and consent',()=>{
 const created=[];let checked=0;
 const ctx=vm.createContext({
  sanitizeObject_:v=>v,cleanEmail_:v=>String(v||'').trim().toLowerCase(),
  cleanString_:(v,n)=>String(v||'').trim().slice(0,n||6000),
  isValidEmail_:v=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),normalizeBoolean_:v=>v===true,
  withScriptLock_:fn=>fn(),enforceCreationLimit_:()=>{checked++},
  randomToken_:()=> 'token',randomAccessCode_:()=> '837261',createProjectId_:()=> 'PITCH-1',
  nowIso_:()=> '2026-10-09T10:00:00Z',hashValue_:x=>'hash:'+x,
  calculateProgress_:()=>({percent:1}),insertProject_:p=>{created.push(p);return {...p,rowNumber:2}},
  saveLeadEmail_:()=>({}),createResumeUrl_:()=> 'https://example.org/#project=PITCH-1',
  logEvent_:()=>{},sendProjectCreatedEmail_:()=>{},publicProject_:p=>p,
  AG24_CONFIG:{STATUS:{DRAFT:'DRAFT'}},console,
  safeApi_:fn=>{try{return {ok:true,data:fn()}}catch(e){return {ok:false,error:{message:e.message}}}}
 });
 vm.runInContext(read('Api.js'),ctx);
 assert.equal(ctx.apiCreateProject({email:'bad',projectName:'Demo',consent:true}).ok,false);
 assert.equal(ctx.apiCreateProject({email:'x@example.com',projectName:'Demo',consent:false}).ok,false);
 assert.equal(checked,0);
 const success=ctx.apiCreateProject({email:'x@example.com',projectName:'Demo',consent:true});
 assert.equal(success.ok,true);assert.equal(checked,1);assert.equal(created.length,1);
 assert.equal(success.data.token,'token');assert.equal(success.data.project.projectName,'Demo');
});
