/**
 * AfriGreen AI -> PitchStudio connector, reconciled from local ZIP v1.0.1.
 * Trusted JSON POST only, no browser credentials or payment dependency.
 * Required private Script Property: PITCH_AFRIGREEN_CONNECTOR_SECRET.
 * New requests must include sourceProjectId (stable AfriGreen AI project ID).
 */
const PITCH_AG_BRIDGE = Object.freeze({
  VERSION:'pitch_afrigreen_connector_v1_1_0',
  SECRET:'PITCH_AFRIGREEN_CONNECTOR_SECRET',
  LINKS:'ConnectorLinks',
  HEADERS:['sourceProjectId','pitchProjectId','email','projectName','createdAt','updatedAt']
});

function doPost(e) {
  try {
    const raw=String(e && e.postData && e.postData.contents || '');
    if (!raw || raw.length>65536) throw new Error('PITCH_AG_INVALID_BODY');
    let req;
    try {req=JSON.parse(raw);} catch (_) {throw new Error('PITCH_AG_INVALID_BODY');}
    if (!req || typeof req!=='object' || Array.isArray(req)) throw new Error('PITCH_AG_INVALID_BODY');
    pitchAgAuthenticate_(req.secret);
    const action=String(req.action || '').trim().toUpperCase();
    if (action==='HEALTH') return pitchAgResponse_({ok:true,version:PITCH_AG_BRIDGE.VERSION});
    if (action==='OPEN_OR_CREATE_PITCH_PROJECT') return pitchAgResponse_(pitchAgOpen_(req));
    if (action==='GET_GENERATED_PITCH') return pitchAgResponse_(pitchAgGenerated_(req));
    throw new Error('PITCH_AG_ACTION_NOT_ALLOWED');
  } catch(error) {
    const code=pitchAgError_(error);
    console.error('PITCH_CONNECTOR_REJECTED',code);
    return pitchAgResponse_({ok:false,code:code,message:'Demande refusée ou indisponible.'});
  }
}

function pitchAgResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
function pitchAgError_(error) {
  const msg=String(error && error.message || error);
  return /^PITCH_AG_[A-Z0-9_]+$/.test(msg)?msg:'PITCH_AG_INTERNAL_ERROR';
}
function pitchAgAuthenticate_(value) {
  const expected=String(PropertiesService.getScriptProperties()
    .getProperty(PITCH_AG_BRIDGE.SECRET) || '');
  if (expected.length<32) throw new Error('PITCH_AG_SECRET_NOT_CONFIGURED');
  if (typeof value!=='string' || value.length<32) throw new Error('PITCH_AG_UNAUTHORIZED');
  const a=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8);
  const b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,expected,Utilities.Charset.UTF_8);
  let mismatch=a.length ^ b.length;
  for(let i=0;i<Math.min(a.length,b.length);i+=1) mismatch|=a[i]^b[i];
  if (mismatch) throw new Error('PITCH_AG_UNAUTHORIZED');
}
function pitchAgIdentity_(req) {
  const email=cleanEmail_(req.email || '');
  const name=cleanString_(req.projectName || '',180);
  const sourceId=cleanString_(req.sourceProjectId || req.afrigreenProjectId || '',120);
  const pitchId=cleanString_(req.pitchProjectId || '',100);
  if (!isValidEmail_(email)) throw new Error('PITCH_AG_EMAIL_REQUIRED');
  if (!name) throw new Error('PITCH_AG_PROJECT_NAME_REQUIRED');
  return {email:email,name:name,sourceId:sourceId,pitchId:pitchId};
}
function pitchAgLinksSheet_(create) {
  const db=getDatabase_();
  let sheet=db.getSheetByName(PITCH_AG_BRIDGE.LINKS);
  if (!sheet && !create) return null;
  if (!sheet) sheet=db.insertSheet(PITCH_AG_BRIDGE.LINKS);
  if (sheet.getLastRow()===0) {
    sheet.getRange(1,1,1,6).setValues([PITCH_AG_BRIDGE.HEADERS.slice()]);
    sheet.setFrozenRows(1);
  }
  const headers=sheet.getRange(1,1,1,6).getValues()[0];
  if (!PITCH_AG_BRIDGE.HEADERS.every(function(h,i){return headers[i]===h;})) {
    throw new Error('PITCH_AG_LINK_SCHEMA_MISMATCH');
  }
  return sheet;
}
function pitchAgFindLink_(sheet,sourceId) {
  if(!sheet || !sourceId || sheet.getLastRow()<2) return null;
  const rows=sheet.getRange(2,1,sheet.getLastRow()-1,6).getValues();
  const found=[];
  rows.forEach(function(row) {
    if (String(row[0])===sourceId) {
      found.push({pitchId:String(row[1]||''),email:cleanEmail_(row[2])});
    }
  });
  if(found.length>1) throw new Error('PITCH_AG_DUPLICATE_LINK');
  return found[0]||null;
}
function pitchAgNormalizeName_(value) {
  let text=String(value||'').trim().toLowerCase();
  try {text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');} catch(_){}
  return text.replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function pitchAgLegacyMatch_(identity) {
  const rows=getProjectsSheet_().getDataRange().getValues();
  const matches=[];
  for(let i=1;i<rows.length;i+=1) {
    const p=rowToProject_(rows[i],i+1);
    if (cleanEmail_(p.email)===identity.email &&
        pitchAgNormalizeName_(p.projectName)===pitchAgNormalizeName_(identity.name)) matches.push(p);
  }
  if(matches.length>1) throw new Error('PITCH_AG_AMBIGUOUS_LEGACY_MATCH');
  return matches[0]||null;
}
function pitchAgSelect_(identity,sheet) {
  const link=identity.sourceId?pitchAgFindLink_(sheet,identity.sourceId):null;
  if(link) {
    if(link.email!==identity.email) throw new Error('PITCH_AG_SOURCE_OWNER_MISMATCH');
    if(identity.pitchId && link.pitchId!==identity.pitchId) throw new Error('PITCH_AG_SOURCE_LINK_CONFLICT');
    return {project:findProject_(link.pitchId),reserved:link.pitchId,linked:true};
  }
  if(identity.pitchId) return {project:findProject_(identity.pitchId),reserved:'',linked:false};
  if(!identity.sourceId) return {project:pitchAgLegacyMatch_(identity),reserved:'',linked:false};
  return {project:null,reserved:'',linked:false};
}
function pitchAgAppendLink_(sheet,identity,pitchId) {
  if(!identity.sourceId) return;
  const now=nowIso_();
  sheet.appendRow([identity.sourceId,pitchId,identity.email,identity.name,now,now]);
  logEvent_(pitchId,'CONNECTOR_LINK_CREATED',{sourceProjectId:identity.sourceId});
}
function pitchAgOpen_(req) {
  const identity=pitchAgIdentity_(req);
  return withScriptLock_(function() {
    const sheet=identity.sourceId?pitchAgLinksSheet_(true):null;
    const selection=pitchAgSelect_(identity,sheet);
    let project=selection.project,token='',recoveryCode='',created=false;
    if(project && cleanEmail_(project.email)!==identity.email) {
      throw new Error('PITCH_AG_PROJECT_OWNERSHIP_MISMATCH');
    }
    if(!project) {
      if(identity.pitchId) throw new Error('PITCH_AG_PROJECT_NOT_FOUND');
      enforceCreationLimit_(identity.email);
      const id=selection.reserved||createProjectId_();
      if(sheet && !selection.linked) pitchAgAppendLink_(sheet,identity,id);
      const data={identity:{projectName:identity.name},review:{contactEmail:identity.email}};
      token=randomToken_();recoveryCode=randomAccessCode_();
      const now=nowIso_();
      project=insertProject_({
        projectId:id,email:identity.email,projectName:identity.name,
        tokenHash:hashValue_(token),codeHash:hashValue_(id+'|'+recoveryCode),
        data:data,progress:calculateProgress_(data),score:null,alerts:[],
        status:AG24_CONFIG.STATUS.DRAFT,createdAt:now,updatedAt:now,
        folderId:'',slidesUrl:'',pdfUrl:''
      });
      created=true;
      logEvent_(id,'PROJECT_CREATED',{source:'AFRIGREEN_AI'});
    } else {
      token=randomToken_();
      project.tokenHash=hashValue_(token);
      project=updateProject_(project);
      logEvent_(project.projectId,'CONNECTOR_PROJECT_RESUMED',{source:'AFRIGREEN_AI'});
      if(sheet && !selection.linked) pitchAgAppendLink_(sheet,identity,project.projectId);
    }
    const url=createResumeUrl_(project.projectId,token);
    if(!url || url.indexOf('#project=')===-1) throw new Error('PITCH_AG_WEBAPP_URL_MISSING');
    if(created) {
      try{sendProjectCreatedEmail_(project,recoveryCode,url);}
      catch(e){logEvent_(project.projectId,'CONNECTOR_MAIL_FAILED',{});}
    }
    return {ok:true,created:created,pitchProjectId:project.projectId,
      sourceProjectId:identity.sourceId,projectName:project.projectName,
      status:project.status,launchUrl:url};
  });
}
function pitchAgDriveId_(url) {
  const text=String(url||'');
  for(const pattern of [/\/d\/([a-zA-Z0-9_-]{20,})/,
/[?&]id=([a-zA-Z0-9_-]{20,})/,/^([a-zA-Z0-9_-]{20,})$/]) {
    const m=text.match(pattern);
    if(m) return m[1];
  }
  return '';
}
function pitchAgGenerated_(req) {
  const identity=pitchAgIdentity_(req);
  const sheet=identity.sourceId?pitchAgLinksSheet_(false):null;
  const p=pitchAgSelect_(identity,sheet).project;
  if(p && cleanEmail_(p.email)!==identity.email) {
    throw new Error('PITCH_AG_PROJECT_OWNERSHIP_MISMATCH');
  }
  // Pure read: no renaming, token rotation or Drive sharing mutations.
  if(!p || p.status!==AG24_CONFIG.STATUS.GENERATED) {
    return {ok:true,found:false,status:'NOT_READY'};
  }
  const slidesId=pitchAgDriveId_(p.slidesUrl),pdfId=pitchAgDriveId_(p.pdfUrl);
  if(!slidesId || !pdfId) throw new Error('PITCH_AG_GENERATED_FILE_ID_MISSING');
  const slides=DriveApp.getFileById(slidesId),pdf=DriveApp.getFileById(pdfId);
  if(slides.getMimeType()!=='application/vnd.google-apps.presentation') {
    throw new Error('PITCH_AG_SLIDES_FILE_INVALID');
  }
  if(pdf.getMimeType()!=='application/pdf') {
    throw new Error('PITCH_AG_PDF_FILE_INVALID');
  }
  return {ok:true,found:true,status:'GENERATED',
    pitch:{projectId:p.projectId,projectName:p.projectName,
      updatedAt:p.updatedAt,progress:p.progress,score:p.score},
    slidesDocument:{type:'PITCH_PRESENTATION',status:'READY',fileId:slidesId,
      fileUrl:p.slidesUrl,fileName:slides.getName(),mimeType:slides.getMimeType(),generatedAt:p.updatedAt},
    pdfDocument:{type:'PITCH_DECK',status:'READY',fileId:pdfId,
      fileUrl:p.pdfUrl,fileName:pdf.getName(),mimeType:pdf.getMimeType(),generatedAt:p.updatedAt}
  };
}
function pitchAgConnectorStatus_() {
  const key=PropertiesService.getScriptProperties().getProperty(PITCH_AG_BRIDGE.SECRET)||'';
  return {version:PITCH_AG_BRIDGE.VERSION,configured:key.length>=32,
    linksSheetPresent:Boolean(pitchAgLinksSheet_(false))};
}
