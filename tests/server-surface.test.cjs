'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const sourceFiles=fs.readdirSync(root).filter(p=>p.endsWith('.js'));
test('no public admin, setup, testing, slide-generation or utility functions in Apps Script RPC',()=>{
  const definitions=[];
  for(const pathName of sourceFiles) {
    const text=fs.readFileSync(path.join(root,pathName),'utf8');
    for(const match of text.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) {
      definitions.push({pathName,name:match[1]});
    }
  }
  const publicFunctions=definitions.filter(f=>!f.name.endsWith('_'));
  const unsafe=publicFunctions.filter(f=>f.name!=='doGet'&&f.name!=='doPost'&&!/^api[A-Z]\w*$/.test(f.name));
  assert.deepEqual(unsafe,[], 'server functions reachable via google.script.run must only expose approved API');
  assert.ok(publicFunctions.some(f=>f.name==='apiCreateProject'));
  assert.ok(publicFunctions.some(f=>f.name==='doGet'));
});
test('free project cannot bypass token checks on document operations',()=>{
  const api=fs.readFileSync(path.join(root,'Api.js'),'utf8');
  const assets=fs.readFileSync(path.join(root,'AssetEngine.js'),'utf8');
  assert.match(api,/assertProjectToken_\(project, token\)/);
  assert.match(assets,/function AG24_ASSET_authorize_/);
  assert.match(assets,/assertProjectToken_\(project, token\)/);
});

test('doPost requires server-side secret authentication before handling requests',()=>{
  const src=fs.readFileSync(path.join(root,'PitchStudio_AfriGreenConnectorV1_1_0.js'),'utf8');
  assert.match(src,/function doPost\(e\)/);
  assert.match(src,/pitchAgAuthenticate_\(req.secret\)/);
  assert.match(src,/PITCH_AFRIGREEN_CONNECTOR_SECRET/);
});
