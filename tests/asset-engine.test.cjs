'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< >>');

function createFixture() {
  const writes = [];
  const events = [];
  const files = new Map();
  const projects = new Map();
  const project = { projectId: 'AG24-PD-TEST', folderId: '', slidesUrl: '',
    pdfUrl: '', status: 'DRAFT' };
  projects.set(project.projectId, project);
  let idCounter = 0;
  const sheet = {
    rows: [],
    getLastRow() { return this.rows.length; },
    getRange(row, column, numRows, numCols) {
      return {
        getValues: () => Array.from({length: numRows}, (_, i) =>
          (this.rows[row - 1 + i] || []).slice(column - 1, column - 1 + numCols)),
        setValues: values => { values.forEach((valuesRow, i) => {
          const index = row - 1 + i;
          if (!this.rows[index]) this.rows[index] = [];
          valuesRow.forEach((v,j) => { this.rows[index][column - 1 + j] = v; });
        }); },
      };
    },
    setFrozenRows() {},
    appendRow(row) { this.rows.push(row.slice()); writes.push(row.slice()); }
  };
  const database = {
    sheets: new Map(),
    getSheetByName(n) { return this.sheets.get(n) || null; },
    insertSheet(n) { this.sheets.set(n, sheet); return sheet; }
  };
  const createFolder = name => ({
    name, folders: new Map(),
    getFoldersByName(key) {
      const next = this.folders.get(key);
      return { hasNext: () => !!next, next: () => next };
    },
    createFolder(key) {
      const next = createFolder(key); this.folders.set(key,next); return next;
    },
    createFile(blob) {
      const id = 'drive-' + (++idCounter);
      const f = {
        id, blob, trashed:false, getId() {return this.id;},
        getBlob() {return this.blob;},
        setTrashed(value) {this.trashed = value;}
      };
      files.set(id, f); return f;
    }
  });
  const folder = createFolder('project-root');
  const utils = {
    base64Decode: b64 => [...Buffer.from(b64, 'base64')],
    base64Encode: values => Buffer.from(values).toString('base64'),
    newBlob: (bytes,mime,name) => ({
      getBytes: () => bytes, getContentType: () => mime, getName: () => name
    }),
    getUuid: () => '00000000-0000-4000-8000-' + String(++idCounter).padStart(12,'0'),
    computeDigest: (_, bytes) => [...crypto.createHash('sha256').update(Buffer.from(bytes)).digest()],
    DigestAlgorithm: {SHA_256:'SHA_256'}
  };
  const ctx = vm.createContext({
    Utilities: utils,
    DriveApp: {getFileById: id => {
      if (!files.has(id)) throw new Error('file missing');
      return files.get(id);
    }},
    getDatabase_: () => database,
    getOrCreateProjectFolder_: p => {p.folderId = 'root-test'; return folder;},
    updateProject_: p => p,
    findProject_: id => projects.get(id),
    assertProjectToken_: (_, token) => {
      if (token !== 'topsecret') throw new Error('Not authorized');
    },
    cleanString_: (value,max) => String(value == null ? '' : value)
      .replace(/[<>]/g,'').trim().slice(0,max || 6000),
    safeApi_: cb => { try {return {ok:true,data:cb()};}
      catch(e){return {ok:false,error:{message:e.message}};} },
    withScriptLock_: cb => cb(),
    nowIso_: () => '2026-10-08T12:00:00Z',
    logEvent_: (id,event,details) => {events.push({id,event,details});},
    AG24_CONFIG: {STATUS:{READY:'READY'}},
    console
  });
  vm.runInContext(read('AssetEngine.js'),ctx,{filename:'AssetEngine.js'});
  function upload(data = {}) {
    const content = data.bytes || png;
    return ctx.apiUploadProjectAsset({
      projectId: project.projectId,token:'topsecret',fileName:'logo.png',
      role:'LOGO',mimeType:'image/png',size:content.length,
      base64:content.toString('base64'),...data
    });
  }
  return {ctx, project, sheet, files, writes, events, upload};
}

test('asset code and public API parse', () => {
  for (const p of ['AssetEngine.js','SlideAssets.js','Api.js',
    'SlidesGenerator.js','PdfExporter.js','Security.js',
    'Setup.js','Storage.js','Utils.js']) {
    assert.doesNotThrow(() => new Function(read(p)), p);
  }
  assert.doesNotThrow(() => new Function(read('App.html')
    .replace(/^<script>\s*/,'').replace(/<\/script>\s*$/,'')));
});

test('valid private image persists metadata with role, never base64 or token', () => {
  const f = createFixture();
  const up = f.upload();
  assert.equal(up.ok,true);
  assert.equal(up.data.asset.role,'LOGO');
  assert.equal(f.writes.length,1);
  const text = JSON.stringify(f.sheet.rows);
  assert.doesNotMatch(text,/topsecret|iVBOR/);
  const list = f.ctx.apiListProjectAssets(f.project.projectId,'topsecret');
  assert.equal(list.ok,true);
  assert.equal(list.data.assets.length,1);
  assert.equal(list.data.assets[0].kind,'IMAGE');
  assert.equal(list.data.assets[0].fileId,undefined);
});

test('duplicate content and role is idempotent', () => {
  const f=createFixture();
  assert.equal(f.upload().ok,true);
  const again=f.upload();
  assert.equal(again.ok,true);
  assert.equal(again.data.deduplicated,true);
  assert.equal(f.writes.length,1);
});

test('real signature, type, role, declared size and token are enforced', () => {
  const f=createFixture();
  assert.equal(f.upload({bytes:Buffer.from('not-a-png')}).ok,false);
  assert.equal(f.upload({role:'UNKNOWN'}).ok,false);
  assert.equal(f.upload({size:1}).ok,false);
  assert.equal(f.ctx.apiListProjectAssets('AG24-PD-TEST','invalid').ok,false);
  assert.equal(f.ctx.apiGetProjectImageData('AG24-PD-TEST','invalid','x').ok,false);
  assert.equal(f.writes.length,0);
});

test('PDF source upload allowed but not rendered as image', () => {
  const f=createFixture();
  const res=f.upload({fileName:'business-plan.pdf',mimeType:'application/pdf',
    role:'SOURCE_DOCUMENT',bytes:pdf});
  assert.equal(res.ok,true);
  assert.equal(res.data.asset.kind,'DOCUMENT');
  assert.equal(f.ctx.apiGetProjectImageData(f.project.projectId,
    'topsecret',res.data.asset.assetId).ok,false);
});

test('asset mutation invalidates stale output without deleting previous deck', () => {
  const f=createFixture();
  f.project.slidesUrl='https://example.org/oldslides';
  f.project.pdfUrl='https://example.org/oldpdf';
  const res=f.upload();
  assert.equal(res.ok,true);
  assert.equal(f.project.slidesUrl,'');
  assert.equal(f.project.pdfUrl,'');
  assert.ok(f.events.some(x=>x.event==='DECK_INVALIDATED_BY_ASSET_CHANGE'));
});

test('delete is scoped, repeatable, and removes image from canonical registry', () => {
  const f=createFixture();
  const created=f.upload();
  const id=created.data.asset.assetId;
  assert.equal(f.ctx.apiDeleteProjectAsset({projectId:f.project.projectId,
    token:'invalid',assetId:id}).ok,false);
  const del=f.ctx.apiDeleteProjectAsset({projectId:f.project.projectId,
    token:'topsecret',assetId:id});
  assert.equal(del.ok,true);
  assert.equal(f.ctx.apiListProjectAssets(f.project.projectId,
    'topsecret').data.assets.length,0);
  assert.equal(f.ctx.apiDeleteProjectAsset({projectId:f.project.projectId,
    token:'topsecret',assetId:id}).ok,true);
  assert.equal([...f.files.values()][0].trashed,true);
});

test('single PDF path and known content builder', () => {
  const api=read('Api.js');
  const slides=read('SlidesGenerator.js');
  assert.doesNotMatch(api,/buildStandardDeckContent_\s*\(/);
  assert.match(api,/generateStandardPresentation_\s*\(\s*project\s*,\s*\{submission:/);
  assert.match(api,/exportPresentationToPdf_\s*\(\s*project\s*,\s*presentation\s*\)/);
  assert.doesNotMatch(slides,/exportStandardPresentationToPdf_\s*\(/);
  assert.match(slides,/AG24_SLIDE_placeImage_/);
  assert.match(read('PdfExporter.js'),/getOrCreateGeneratedFolder_/);
  assert.doesNotMatch(read('Setup.js'),/sheet\.clear\s*\(/);
});
