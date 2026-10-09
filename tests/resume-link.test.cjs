'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function clientHarness(config) {
  const src=read('App.html');
  const start=src.indexOf('  function readInitialResumeParams_() {');
  const end=src.indexOf('  function showToast(',start);
  assert.ok(start>=0 && end>start);
  const win={AG24_INITIAL_STATE:config.legacy||{},
    setTimeout:(callback)=>{}};
  const google=config.google===null?undefined:{
    script:{url:{getLocation:cb=>cb(config.google||{})}}
  };
  const context=vm.createContext({window:win,google,URLSearchParams,Promise,String});
  vm.runInContext(src.slice(start,end)+';this.extract=readInitialResumeParams_',context);
  return context.extract();
}

test('server creates fragment-based resume link, never query token',()=>{
  const context=vm.createContext({
    getPrivateConfig_:()=>({webAppUrl:'https://script.google.com/macros/s/EXAMPLE/exec'}),
    ScriptApp:{getService:()=>({getUrl:()=>''})},
    encodeURIComponent
  });
  vm.runInContext(read('Security.js')+';this.build=createResumeUrl_',context);
  const link=context.build('AG24-PD-123','secure+token/=');
  assert.equal(link,'https://script.google.com/macros/s/EXAMPLE/exec#project=AG24-PD-123&token=secure%2Btoken%2F%3D');
  assert.equal(link.includes('?token='),false);
});

test('startup reads new fragment link from google.script.url',async()=>{
  const actual=await clientHarness({google:{hash:'project=AG24-PD-123&token=very%2Bprivate',
    parameter:{}}});
  assert.deepEqual({projectId:actual.projectId,token:actual.token},
    {projectId:'AG24-PD-123',token:'very+private'});
});

test('legacy server injected query values remain supported',async()=>{
  const actual=await clientHarness({legacy:{projectId:'AG24-PD-OLD',token:'legacy-secret'},
    google:{hash:'',parameter:{}}});
  assert.equal(actual.projectId,'AG24-PD-OLD');
  assert.equal(actual.token,'legacy-secret');
});

test('legacy URL parameters supported via google.script.url',async()=>{
  const actual=await clientHarness({google:{hash:'',parameter:{
    project:'PD-QUERY',token:'q-token'
  }}});
  assert.equal(actual.projectId,'PD-QUERY');
  assert.equal(actual.token,'q-token');
});

test('client falls back cleanly when Apps Script URL service missing',async()=>{
  const actual=await clientHarness({legacy:{projectId:'OLD',token:'secret'},google:null});
  assert.equal(actual.projectId,'OLD');
  assert.equal(actual.token,'secret');
});

test('production HTML embeds existing server initial state and client loads it',()=>{
  const index=read('Index.html'),app=read('App.html'),code=read('Code.js');
  assert.match(index,/window\.AG24_INITIAL_STATE\s*=\s*<\?!= initialState \?>/);
  assert.match(code,/template\.initialState\s*=\s*JSON\.stringify/);
  assert.match(app,/await readInitialResumeParams_\(\)/);
  assert.doesNotMatch(app,/url\.searchParams\.set\('token'/);
  assert.match(app,/#project=['"]?\s*\+\s*encodeURIComponent/);
});
