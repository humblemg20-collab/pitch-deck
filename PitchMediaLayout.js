/**
 * PitchStudio V2.3.1: consented large-format media composition.
 *
 * Assets sheet + Drive own the files. Projects.data.presentationMedia owns
 * the user's explicit "include in this pitch deck" decisions. No separate
 * image truth or migration. Never infer relevance from photo filenames.
 */
const AG24_MEDIA = Object.freeze({
  VERSION:'pitch_media_v2_3_1',
  ROLE_BY_SLIDE:Object.freeze({
    cover:Object.freeze(['COVER_HERO','LOGO']),
    solution:Object.freeze(['PRODUCT','SOLUTION']),
    team:Object.freeze(['FOUNDER','TEAM']),
    traction:Object.freeze(['TRACTION_PROOF','IMPACT'])
  }),
  BOX:Object.freeze({
    cover:Object.freeze([487,72,432,326]),
    solution:Object.freeze([484,92,439,290]),
    team:Object.freeze([484,92,439,290]),
    traction:Object.freeze([484,92,439,290])
  })
});
function AG24_MEDIA_approvedIds_(project) {
  const ids=project && project.data && project.data.presentationMedia &&
    project.data.presentationMedia.approvedAssetIds;
  if(!Array.isArray(ids))return [];
  return ids.filter(function(id){return typeof id==='string' && /^ASSET-[\w-]+$/.test(id);})
    .slice(0,AG24_ASSETS_V1.MAX_ASSETS_PER_PROJECT);
}
function AG24_MEDIA_plan_(project,slides,assets) {
  const approved=AG24_MEDIA_approvedIds_(project),seen={},stats={
    version:AG24_MEDIA.VERSION,approvedAssets:approved.length,
    imageSlides:0,renderedRoles:[],unapprovedIgnored:0
  };
  (assets||[]).forEach(function(a){
    if(a.status==='ACTIVE' && a.kind==='IMAGE' && approved.indexOf(a.assetId)<0) {
      stats.unapprovedIgnored+=1;
    }
  });
  slides.forEach(function(slide){
    const kind=String(slide.type||'').toLowerCase();
    const roles=AG24_MEDIA.ROLE_BY_SLIDE[kind];
    if(!roles)return;
    let selected=null;
    for(let i=0;i<roles.length;i+=1){
      const role=roles[i];
      const candidates=(assets||[]).filter(function(a){
        return a.status==='ACTIVE' && a.kind==='IMAGE' &&
          a.role===role && approved.indexOf(a.assetId)>=0;
      });
      if(candidates.length){selected=candidates[candidates.length-1];break;}
    }
    if(!selected)return;
    // An explicitly approved role can be used on exactly one matching slide;
    // no arbitrary duplication to fill empty pages.
    if(seen[selected.assetId])return;
    seen[selected.assetId]=true;
    slide._mediaAsset=selected;
    slide.mediaLayout={mode:'EDITORIAL_IMAGE',role:selected.role,
      box:AG24_MEDIA.BOX[kind].slice(),assetId:selected.assetId};
    stats.imageSlides+=1;
    stats.renderedRoles.push(selected.role);
  });
  return stats;
}
/** Dedicated uncluttered editorial templates; 40-50% of usable slide for media. */
function AG24_MEDIA_render_(slide,data) {
  const media=data&&data.mediaLayout;
  if(!media || media.mode!=='EDITORIAL_IMAGE')return false;
  const theme=getPremiumTheme_();
  const kind=String(data.type||'').toLowerCase();
  if(kind==='cover'){
    addTextBox_(slide,'AFRIGREEN24  /  INVESTOR PRESENTATION',54,45,410,28,
      {fontSize:11,bold:true,color:theme.green});
    addTextBox_(slide,ag24Text_(data.title,'Projet sans nom'),
      54,118,405,135,{fontSize:34,bold:true,color:theme.white});
    if(ag24Text_(data.subtitle))addTextBox_(slide,data.subtitle,54,275,407,84,
      {fontSize:18,color:theme.text});
    if(ag24Text_(data.meta))addTextBox_(slide,data.meta,54,378,415,36,
      {fontSize:12,color:theme.muted});
    return true;
  }
  if(['solution','team','traction'].indexOf(kind)<0)return false;
  const heading=kind==='solution'?'LA SOLUTION':
    kind==='team'?'ÉQUIPE ET EXÉCUTION':'TRACTION ET RÉSULTATS';
  addTextBox_(slide,heading,54,43,416,25,
    {fontSize:11,bold:true,color:theme.green});
  addTextBox_(slide,ag24Text_(data.title,'Présentation du projet'),
    54,87,404,98,{fontSize:25,bold:true,color:theme.white});
  let body='',label='';
  if(kind==='solution'){
    body=ag24Text_(data.body,'');
    label=ag24Text_(data.status,'');
  } else if(kind==='team'){
    body=(Array.isArray(data.founders)?data.founders:[]).slice(0,2).join('\n');
    label=ag24Text_(data.skills,'');
  } else {
    const metric=(Array.isArray(data.metrics)?data.metrics:[])[0];
    body=metric?String(metric.value)+' — '+String(metric.label):'';
    label=ag24Text_(data.evidence,'');
  }
  if(body)addTextBox_(slide,body,54,209,405,121,
    {fontSize:17,color:theme.text,bold:kind==='traction'});
  if(label)addTextBox_(slide,label,54,346,412,62,
    {fontSize:12,color:theme.muted});
  // Explicit disclosure: user-tagged image does not itself certify a result.
  if(!data.submissionMode) addTextBox_(slide,'VISUEL FOURNI ET SÉLECTIONNÉ PAR LE PORTEUR',
    489,394,421,20,{fontSize:9,color:theme.muted});
  return true;
}
