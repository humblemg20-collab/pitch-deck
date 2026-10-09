'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('GreenIN AI branding on all end-user analysis and storytelling surfaces',()=>{
  const app=read('App.html');
  for(const phrase of [
    'Analyser avec GreenIN AI',
    'Analyse GreenIN AI',
    'Propositions GreenIN AI à vérifier',
    'Reformulation du Pitch Deck avec GreenIN AI',
    'Améliorer les 12 slides avec GreenIN AI',
    'Reformulation GreenIN AI',
    'Statut GreenIN AI indisponible',
    'sans GreenIN AI'
  ]) assert.ok(app.includes(phrase),'missing UI brand: '+phrase);
  assert.doesNotMatch(app,/(?:Analyser avec|Propositions|Reformulation du Pitch Deck avec|Améliorer les 12 slides avec) OpenAI/);
  assert.doesNotMatch(app,/\b(?:L’IA|l’IA|sans IA|par l’IA)\b/);
});
test('consent remains explicit and names real technical processor OpenAI',()=>{
  const app=read('App.html');
  assert.match(app,/Autoriser GreenIN AI à analyser ce document/);
  assert.match(app,/Autoriser GreenIN AI à reformuler les 12 slides/);
  assert.match(app,/transmis à OpenAI, fournisseur technique de GreenIN AI/);
  assert.match(app,/traitement technique est assuré par OpenAI/);
  assert.match(app,/consent:true/);
});
test('backend keeps canonical OpenAI provider identifiers, API and secrets',()=>{
  const api=read('PitchOpenAIImport.js'),story=read('PitchStorytellingEngine.js');
  assert.match(api,/OPENAI_API_KEY/);
  assert.match(api,/https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(api,/provider:'OPENAI'/);
  assert.match(api,/function apiPitchOpenAIHealth\(/);
  assert.match(story,/OPENAI_CONSENT_REQUIRED/);
  assert.match(story,/store:false/);
  assert.match(api,/GreenIN AI n’est pas configuré côté serveur/);
});
test('client-facing errors mask backend provider codes, not required transparency',()=>{
  const ui=read('App.html');
  assert.match(ui,/function greenInAiPublicError_\(/);
  assert.match(ui,/greenInAiPublicError_\(error\)/);
  assert.match(ui,/replace\(\/\\bOpenAI\\b\/g,'GreenIN AI'\)/);
});
