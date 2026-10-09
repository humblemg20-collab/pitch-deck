'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function fixture(approved) {
  const assets=[
    {assetId:'ASSET-01',role:'COVER_HERO',kind:'IMAGE',status:'ACTIVE'},
    {assetId:'ASSET-02',role:'LOGO',kind:'IMAGE',status:'ACTIVE'},
    {assetId:'ASSET-03',role:'PRODUCT',kind:'IMAGE',status:'ACTIVE'},
    {assetId:'ASSET-04',role:'FOUNDER',kind:'IMAGE',status:'ACTIVE'},
    {assetId:'ASSET-05',role:'TRACTION_PROOF',kind:'IMAGE',status:'ACTIVE'},
    {assetId:'ASSET-06',role:'PRODUCT',kind:'IMAGE',status:'DELETED'}
  ];
  const project={projectId:'P1',data:{presentationMedia:{approvedAssetIds:approved||[]}},
    slidesUrl:'',pdfUrl:''};
  const ctx={Array,Number,String,JSON,Object,Math,Date,console,
    AG24_ASSETS_V1:{MAX_ASSETS_PER_PROJECT:30},
    cleanString_:(s,n)=>String(s||'').slice(0,n||100),
    ag24Text_:s=>String(s||''),
    getPremiumTheme_:()=>({green:'#0f9',white:'#fff',text:'#ddd',muted:'#999'}),
    addTextBox_:()=>{},addSectionHeader_:()=>{},addSourceLine_:()=>{},
    safeApi_:fn=>{try{return {ok:true,data:fn()};}catch(e){return {ok:false,error:{message:e.message}};}},
    withScriptLock_:fn=>fn(),
    findProject_:id=>id===project.projectId?project:null,
    assertProjectToken_:(p,t)=>{if(t!=='owner-token')throw Error('UNAUTHORIZED');},
    updateProject_:()=>{ctx.saves=(ctx.saves||0)+1;},
    logEvent_:(...args)=>{(ctx.events||(ctx.events=[])).push(args);}
  };
  vm.createContext(ctx);vm.runInContext(read('PitchMediaLayout.js'),ctx);
  return {ctx,project,assets,slides:[
    {type:'cover',number:1,title:'Nom'},
    {type:'solution',number:4,title:'Solution',body:'Création de sites'},
    {type:'traction',number:8,title:'Traction',metrics:[]},
    {type:'team',number:11,title:'Équipe',founders:['Personne']}
  ]};
}
test('no image appears in investor slides without explicit owner approval',()=>{
  const f=fixture([]);
  const res=f.ctx.AG24_MEDIA_plan_(f.project,f.slides,f.assets);
  assert.equal(res.imageSlides,0);
  assert.equal(res.unapprovedIgnored,5);
  for(const s of f.slides)assert.equal(s.mediaLayout,undefined);
});
test('approved media roles map to exactly one relevant slide and use large safe slots',()=>{
  const f=fixture(['ASSET-01','ASSET-02','ASSET-03','ASSET-04','ASSET-05','ASSET-06']);
  const res=f.ctx.AG24_MEDIA_plan_(f.project,f.slides,f.assets);
  assert.equal(res.imageSlides,4);
  assert.equal(f.slides[0].mediaLayout.role,'COVER_HERO');
  assert.equal(f.slides[1].mediaLayout.role,'PRODUCT');
  assert.equal(f.slides[2].mediaLayout.role,'TRACTION_PROOF');
  assert.equal(f.slides[3].mediaLayout.role,'FOUNDER');
  assert.ok(f.slides.every(s=>s.mediaLayout.box[2]>=430));
  assert.ok(f.slides.every(s=>s.mediaLayout.box[1]+s.mediaLayout.box[3]<420));
  assert.equal(f.slides[1].mediaLayout.assetId,'ASSET-03');
  assert.ok(res.renderedRoles.includes('FOUNDER'));
  // No unchecked photos are inserted into other sections, even with approval.
  assert.equal(f.slides.some(s=>s.type==='funding'),false);
});
test('approved logo gets the cover if no hero image is approved',()=>{
  const f=fixture(['ASSET-02']);
  const res=f.ctx.AG24_MEDIA_plan_(f.project,f.slides,f.assets);
  assert.equal(res.imageSlides,1);
  assert.equal(f.slides[0].mediaLayout.role,'LOGO');
  assert.equal(f.slides[1].mediaLayout,undefined);
});
test('image contain layout preserves landscape, portrait and square ratios without footer overlap',()=>{
 const f=fixture(['ASSET-03']);
 f.ctx.AG24_MEDIA_plan_(f.project,f.slides,f.assets);
 let nextOriginal={w:1200,h:800};
 let placed=null;
 f.ctx.ag24ScaleX_=x=>x*.75;
 f.ctx.ag24ScaleY_=x=>x*.75;
 f.ctx.AG24_ASSET_imageBlob_=()=>({bytes:[1]});
 f.ctx.SlidesApp={ParagraphAlignment:{CENTER:'CENTER'}};
 vm.runInContext(read('SlideAssets.js'),f.ctx);
 for(const pair of [{w:1200,h:800},{w:600,h:1100},{w:900,h:900}]){
  nextOriginal=pair;
  const image={w:pair.w,h:pair.h,
    getWidth(){return this.w},getHeight(){return this.h},
    setWidth(v){this.w=v},setHeight(v){this.h=v},
    setLeft(v){this.x=v},setTop(v){this.y=v}};
  const slide={insertImage:()=>image};
  assert.equal(f.ctx.AG24_SLIDE_placeImage_(slide,f.slides[1],f.assets),true);
  const box=f.slides[1].mediaLayout.box;
  const [x,y,w,h]=box.map(t=>t*.75);
  assert.ok(Math.abs(image.w/image.h-pair.w/pair.h)<1e-9);
  assert.ok(image.w>0&&image.h>0);
  assert.ok(image.x>=x-1e-6&&image.y>=y-1e-6);
  assert.ok(image.x+image.w<=x+w+1e-6);
  assert.ok(image.y+image.h<=y+h+1e-6);
  assert.ok((image.y+image.h)/.75<420,'never collide with footer line');
  placed=image;
 }
 assert.ok(placed.w>0);
});
test('approved media uses editorial split, leaves text and caption outside image area',()=>{
 const f=fixture(['ASSET-03']);
 f.ctx.AG24_MEDIA_plan_(f.project,f.slides,f.assets);
 const texts=[];
 f.ctx.addTextBox_=(slide,txt,x,y,w,h)=>{texts.push({txt:String(txt),x,y,w,h});};
 assert.equal(f.ctx.AG24_MEDIA_render_({},f.slides[1]),true);
 const image=f.slides[1].mediaLayout.box;
 const left=texts.filter(t=>t.x===54);
 assert.ok(left.length>=3);
 assert.ok(left.every(t=>t.x+t.w<image[0]));
 const caption=texts.find(t=>t.txt.includes('VISUEL FOURNI'));
 assert.ok(caption);
 assert.ok(caption.y>=image[1]+image[3]);
 assert.ok(caption.y+caption.h<420);
});
test('owner approval is authenticated, idempotent and stored only in project data',()=>{
 const f=fixture([]);
 const ctx=f.ctx;
 let current={assetId:'ASSET-03',kind:'IMAGE',role:'PRODUCT',status:'ACTIVE'};
 ctx.AG24_ASSET_findActive_=(id,aid)=>(id==='P1'&&aid===current.assetId)?current:null;
 vm.runInContext(read('AssetEngine.js'),ctx);
 // Override the function declaration after loading AssetEngine.
 ctx.AG24_ASSET_findActive_=(id,aid)=>(id==='P1'&&aid===current.assetId)?current:null;
 let a=ctx.apiSetProjectAssetPresentationApproval({projectId:'P1',token:'owner-token',
  assetId:'ASSET-03',approved:true});
 assert.equal(a.ok,true,JSON.stringify(a.error));
 assert.equal(a.data.approved,true);
 assert.equal(ctx.saves,1);
 assert.deepEqual(Array.from(ctx.AG24_MEDIA_approvedIds_(f.project)),['ASSET-03']);
 a=ctx.apiSetProjectAssetPresentationApproval({projectId:'P1',token:'owner-token',
  assetId:'ASSET-03',approved:true});
 assert.equal(a.data.unchanged,true);
 assert.equal(ctx.saves,1);
 a=ctx.apiSetProjectAssetPresentationApproval({projectId:'P1',token:'wrong-token',
  assetId:'ASSET-03',approved:false});
 assert.equal(a.ok,false);
 a=ctx.apiSetProjectAssetPresentationApproval({projectId:'P1',token:'owner-token',
  assetId:'ASSET-999',approved:true});
 assert.equal(a.ok,false);
 a=ctx.apiSetProjectAssetPresentationApproval({projectId:'P1',token:'owner-token',
  assetId:'ASSET-03',approved:false});
 assert.equal(a.ok,true);
 assert.equal(ctx.AG24_MEDIA_approvedIds_(f.project).length,0);
 assert.equal(ctx.saves,2);
 assert.ok(ctx.events.some(e=>e[1]==='DECK_IMAGE_APPROVAL_CHANGED'));
});
test('user must confirm image relevance; UI exposes approval and revoke',()=>{
 const ui=read('App.html'),engine=read('AssetEngine.js'),slides=read('SlidesGenerator.js');
 assert.match(ui,/Afficher en grand dans le Pitch Deck/);
 assert.match(ui,/Retirer du Pitch Deck/);
 assert.match(ui,/window\.confirm\(\s*'Confirmer que cette image correspond réellement/);
 assert.match(ui,/apiSetProjectAssetPresentationApproval/);
 assert.match(engine,/presentationApproved/);
 assert.match(engine,/AG24_ASSET_invalidateDeck_\(project\)/);
 assert.match(slides,/AG24_MEDIA_plan_\(project,slidesContent,projectAssets\)/);
 assert.match(slides,/AG24_MEDIA_render_\(slide,data\)/);
 assert.match(read('PitchMediaLayout.js'),/VISUEL FOURNI ET SÉLECTIONNÉ PAR LE PORTEUR/);
});
