/**
 * AFRIGREEN24 PITCH STUDIO
 * SlidesGenerator.gs — Premium Design V2
 */

function generateStandardPresentation_(project, options) {
  const submission=!!(options && options.submission);
  // Defend against direct internal invocation bypassing the public API.
  if(submission) AG24_SUBMISSION_assertReady_(project);
  if (!project) {
    throw new Error('Projet introuvable pour la génération du Pitch Deck.');
  }

  if (typeof buildStandardDeckContent_ !== 'function') {
    throw new Error(
      'La fonction buildStandardDeckContent_(project) est introuvable dans ContentBuilder.gs.'
    );
  }

  const slidesContent = buildStandardDeckContent_(project);
  // Optional approved AI copy: use only if exactly matched to current facts.
  // Never invokes OpenAI here; deterministic generation is always available.
  const narrativeUse = AG24_STORY_applyCached_(project,slidesContent);
  const investorAudit = AG24_INVESTOR_plan_(project,slidesContent);
  if(submission) {
    slidesContent.forEach(function(slide){
      slide.submissionMode=true;
      slide.submissionProjectName=project.projectName||'';
      slide.qualityLabel='';
      if(Number(slide.number)===8) {
        // A textual claim ("Pilotes", "Contrats") is not a measured metric.
        slide.metrics=(slide.metrics||[]).filter(function(metric){
          return /^[ds.,]+$/.test(String(metric.value||''));
        });
      }
    });
  }
  logEvent_(project.projectId,'STORY_DECK_SOURCE',{
    mode:narrativeUse.used?'OPENAI_REFORMULATED':'DETERMINISTIC',status:narrativeUse.status,
    runId:narrativeUse.runId||'',planVersion:investorAudit.version,
    layoutsAI:investorAudit.selectedAI,layoutsRejected:investorAudit.blockedLayouts,
    weakFieldsRemoved:investorAudit.weakFieldsRemoved,
    evidenceMissing:investorAudit.missingEvidence
  });
  const projectAssets = AG24_ASSET_imagesForGeneration_(project.projectId);
  const mediaAudit = AG24_MEDIA_plan_(project,slidesContent,projectAssets);
  logEvent_(project.projectId,'DECK_MEDIA_PLAN',{
    version:mediaAudit.version,approvedAssets:mediaAudit.approvedAssets,
    imageSlides:mediaAudit.imageSlides,roles:mediaAudit.renderedRoles,
    unapprovedIgnored:mediaAudit.unapprovedIgnored
  });

  if (!Array.isArray(slidesContent) || !slidesContent.length) {
    throw new Error('Le contenu du Pitch Deck est vide.');
  }

  const projectName = ag24Text_(
    getAg24ProjectName_(project),
    'Projet sans nom'
  );

  const presentationName =
    projectName + (submission?' - Pitch Deck Investisseur':' - Pitch Deck Standard - AfriGreen24');

  const presentation = SlidesApp.create(presentationName);
  const presentationId = presentation.getId();

  try {
    const initialSlides = presentation.getSlides();

    if (initialSlides.length) {
      initialSlides[0].remove();
    }

    slidesContent.forEach(function(slideData, index) {
      slideData._hasFounderAsset = !!(slideData._mediaAsset && ['FOUNDER','TEAM'].indexOf(slideData._mediaAsset.role)>=0);
      slideData._coverAssetRole = slideData._mediaAsset && slideData._mediaAsset.role || '';
      const slide = createPremiumSlide_(
        presentation,
        slideData || {},
        index,
        slidesContent.length
      );
      AG24_SLIDE_placeImage_(slide, slideData, projectAssets);
    });

    presentation.saveAndClose();

    Utilities.sleep(1500);

    const slidesFile = DriveApp.getFileById(presentationId);

    moveGeneratedFileToOutputFolder_(
      slidesFile,
      getOrCreateGeneratedFolder_(project)
    );
    // A Slides link is not useful unless the project owner can open it.
    if (isValidEmail_(project.email)) slidesFile.addViewer(project.email);

    return {
      presentationId: presentationId,
      slidesId: presentationId,
      slidesUrl:
        'https://docs.google.com/presentation/d/' +
        presentationId +
        '/edit',
      fileName: presentationName,
      slideCount: slidesContent.length,
      layoutVersion:'pitch_layout_v2_5_0',
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    try {
      DriveApp.getFileById(presentationId).setTrashed(true);
    } catch (cleanupError) {
      // Ne bloque pas l'erreur principale.
    }

    throw new Error(
      'Échec de la génération du Pitch Deck : ' +
      getAg24ErrorMessage_(error)
    );
  }
}

function createPremiumSlide_(
  presentation,
  data,
  index,
  totalSlides
) {
  const slide = presentation.appendSlide(
    SlidesApp.PredefinedLayout.BLANK
  );

  applyPremiumCanvas_(slide);

  const type = ag24Text_(data.type).toLowerCase();

  if(typeof AG24_MEDIA_render_==='function' && AG24_MEDIA_render_(slide,data)) {
    addPremiumFooter_(slide,data.number||index+1,totalSlides,data.qualityLabel,data.submissionMode,data.submissionProjectName);
    return slide;
  }

  if(typeof AG24_INVESTOR_renderFocus_==='function' &&
      AG24_INVESTOR_renderFocus_(slide,data)) {
    addPremiumFooter_(slide,data.number||index+1,totalSlides,data.qualityLabel,data.submissionMode,data.submissionProjectName);
    return slide;
  }

  switch (type) {
    case 'cover':
      createCoverSlide_(slide, data);
      break;

    case 'statement':
      createStatementSlide_(slide, data);
      break;

    case 'insight':
      createInsightSlide_(slide, data);
      break;

    case 'solution':
      createSolutionSlide_(slide, data);
      break;

    case 'steps':
      createStepsSlide_(slide, data);
      break;

    case 'market':
      createMarketSlide_(slide, data);
      break;

    case 'business':
      createBusinessSlide_(slide, data);
      break;

    case 'traction':
      createTractionSlide_(slide, data);
      break;

    case 'competition':
      createCompetitionSlide_(slide, data);
      break;

    case 'gotomarket':
      createGoToMarketSlide_(slide, data);
      break;

    case 'team':
      createTeamSlide_(slide, data);
      break;

    case 'funding':
      createFundingSlide_(slide, data);
      break;

    default:
      createGenericSlide_(slide, data);
      break;
  }

  addPremiumFooter_(
    slide,
    data.number || index + 1,
    totalSlides,
    data.qualityLabel,
    data.submissionMode,
    data.submissionProjectName
  );
  return slide;
}

/**
 * Le design est construit sur une grille 960 x 540, alors que
 * Google Slides crée par défaut une page 16:9 de 720 x 405 points.
 * Ces fonctions convertissent automatiquement toutes les coordonnées.
 */
function ag24ScaleX_(value) {
  return Number(value || 0) * 0.75;
}

function ag24ScaleY_(value) {
  return Number(value || 0) * 0.75;
}

function ag24ScaleFont_(value) {
  return Math.max(9, Number(value || 14) * 0.86);
}

function getPremiumTheme_() {
  return {
    background: '#061D2B',
    panel: '#0E2A3B',
    panelAlt: '#123448',
    green: '#12C98A',
    greenSoft: '#0F3D3A',
    yellow: '#F4C95D',
    white: '#FFFFFF',
    text: '#E8F2F6',
    muted: '#9DB4BF',
    line: '#244556'
  };
}

function applyPremiumCanvas_(slide) {
  const theme = getPremiumTheme_();

  slide.getBackground().setSolidFill(theme.background);

  const leftRail = slide.insertShape(
    SlidesApp.ShapeType.RECTANGLE,
    ag24ScaleX_(0),
    ag24ScaleY_(0),
    ag24ScaleX_(8),
    ag24ScaleY_(540)
  );

  leftRail.getFill().setSolidFill(theme.green);
  removeShapeBorder_(leftRail);

  const topLine = slide.insertShape(
    SlidesApp.ShapeType.RECTANGLE,
    ag24ScaleX_(8),
    ag24ScaleY_(0),
    ag24ScaleX_(952),
    ag24ScaleY_(4)
  );

  topLine.getFill().setSolidFill(theme.greenSoft);
  removeShapeBorder_(topLine);
}

function createCoverSlide_(slide, data) {
  const theme=getPremiumTheme_();
  addTextBox_(slide,data.submissionMode?'PRÉSENTATION INVESTISSEUR':'AFRIGREEN24 / PRÉSENTATION DE PROJET',54,47,525,26,
    {fontSize:11,bold:true,color:theme.green});
  addTextBox_(slide,ag24Text_(data.title,'Projet sans nom'),54,103,540,128,
    {fontSize:40,bold:true,color:theme.white});
  if(ag24Text_(data.subtitle)) {
    addTextBox_(slide,data.subtitle,54,240,530,86,
      {fontSize:20,color:theme.text});
  }
  if(ag24Text_(data.meta)) {
    addTextBox_(slide,data.meta,54,352,520,34,
      {fontSize:13,color:theme.muted});
  }
  // The right panel is a deliberate hero area, not fake proof or a stock photo.
  addPanel_(slide,654,67,246,324,theme.panelAlt);
  // No filler copy in the cover hero area.
}

function createStatementSlide_(slide,data) {
  const t=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  const side=ag24Text_(data.sideValue);
  const leftWidth=side?560:846;
  if(ag24Text_(data.body)){
    addPanel_(slide,54,190,leftWidth,245,t.panel);
    addTextBox_(slide,data.body,78,214,leftWidth-48,198,{fontSize:18,color:t.text});
  }
  if(side){
    addPanel_(slide,642,190,258,245,t.panelAlt);
    addTextBox_(slide,ag24Text_(data.sideLabel,'PUBLIC CONCERNÉ').toUpperCase(),666,214,210,24,
      {fontSize:10,bold:true,color:t.green});
    addTextBox_(slide,side,666,248,210,164,{fontSize:17,bold:true,color:t.white});
  }
  addSourceLine_(slide,data.proof,54,457,846);
}

function createInsightSlide_(slide,data) {
  const theme=getPremiumTheme_();
  addTextBox_(slide,ag24Text_(data.eyebrow,'CONTEXTE'),54,45,680,24,
    {fontSize:11,bold:true,color:theme.green});
  addTextBox_(slide,ag24Text_(data.title,'Le contexte du problème'),
    54,91,820,116,{fontSize:29,bold:true,color:theme.white});
  if(ag24Text_(data.body)) {
    addPanel_(slide,54,233,540,138,theme.panel);
    addTextBox_(slide,data.body,78,259,490,92,
      {fontSize:18,color:theme.text});
  }
  if(ag24Text_(data.sideValue)) {
    addTextBox_(slide,ag24Text_(data.sideLabel,'CONTEXTE').toUpperCase(),
      636,238,250,24,{fontSize:10,bold:true,color:theme.green});
    addTextBox_(slide,data.sideValue,636,273,253,81,
      {fontSize:17,bold:true,color:theme.white});
  }
  addSourceLine_(slide,data.proof,54,385,840);
}

function createSolutionSlide_(slide,data) {
  const t=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  const status=ag24Text_(data.status);
  const width=status?570:846;
  if(ag24Text_(data.body)){
    addPanel_(slide,54,190,width,245,t.panel);
    addTextBox_(slide,data.body,80,216,width-52,197,{fontSize:18,color:t.text});
  }
  if(status){
    addPanel_(slide,650,190,250,245,t.panelAlt);
    addTextBox_(slide,'STATUT ACTUEL',674,215,200,20,
      {fontSize:10,bold:true,color:t.green});
    addTextBox_(slide,status,674,250,200,165,
      {fontSize:17,bold:true,color:t.white});
  }
}

function createStepsSlide_(slide,data) {
  const t=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  const items=normalizeSlideItems_(data.items,5).slice(0,5);
  if(!items.length) return;
  const cols=items.length===1?1:2;
  const gap=16, cellW=(846-gap*(cols-1))/cols;
  const rows=Math.ceil(items.length/cols);
  const cellH=(254-gap*(rows-1))/rows;
  items.forEach(function(item,index){
    const x=54+(index%cols)*(cellW+gap);
    const y=185+Math.floor(index/cols)*(cellH+gap);
    addPanel_(slide,x,y,cellW,cellH,t.panel);
    addTextBox_(slide,'0'+(index+1),x+16,y+14,37,27,
      {fontSize:16,bold:true,color:t.green});
    addTextBox_(slide,item,x+57,y+15,cellW-76,cellH-27,
      {fontSize:16,bold:true,color:t.white});
  });
}

function createMarketSlide_(slide,data) {
  const t=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  const geo=ag24Text_(data.geography),est=ag24Text_(data.estimate);
  if(geo){
    addPanel_(slide,54,190,330,246,t.panelAlt);
    addTextBox_(slide,'GÉOGRAPHIE PRIORITAIRE',75,213,289,22,
      {fontSize:10,bold:true,color:t.green});
    addTextBox_(slide,geo,75,252,285,157,{fontSize:19,bold:true,color:t.white});
  }
  if(est){
    const x=geo?408:54, w=geo?492:846;
    addPanel_(slide,x,190,w,246,t.panel);
    addTextBox_(slide,'POTENTIEL DÉCLARÉ',x+24,213,w-48,22,
      {fontSize:10,bold:true,color:t.green});
    addTextBox_(slide,est,x+24,250,w-48,163,{fontSize:19,bold:true,color:t.white});
  }
  addSourceLine_(slide,data.source,54,455,846);
}

function createBusinessSlide_(slide,data) {
  const t=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  const pricing=ag24Text_(data.pricing), acquisition=ag24Text_(data.acquisition);
  const revenue=ag24Text_(data.revenue);
  if(pricing){
    addPanel_(slide,54,190,390,247,t.panelAlt);
    addTextBox_(slide,'TARIFICATION',78,212,342,23,
      {fontSize:10,bold:true,color:t.green});
    addTextBox_(slide,pricing,78,248,342,164,
      {fontSize:21,bold:true,color:t.white});
  }
  if(acquisition || revenue){
    const x=pricing?472:54,w=pricing?428:846;
    addPanel_(slide,x,190,w,247,t.panel);
    if(acquisition){
      addTextBox_(slide,'ACQUISITION CLIENT',x+24,211,w-48,22,
        {fontSize:10,bold:true,color:t.green});
      addTextBox_(slide,acquisition,x+24,244,w-48,revenue?107:165,
        {fontSize:17,color:t.white});
    }
    if(revenue){
      addTextBox_(slide,'REVENUS',x+24,acquisition?361:215,w-48,19,
        {fontSize:10,bold:true,color:t.yellow});
      addTextBox_(slide,revenue,x+24,acquisition?387:250,w-48,43,
        {fontSize:17,bold:true,color:t.white});
    }
  }
}

function createTractionSlide_(slide,data){
  const t=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  const metrics=Array.isArray(data.metrics)?data.metrics.slice(0,3):[];
  const gap=16, width=metrics.length?(846-gap*(metrics.length-1))/metrics.length:0;
  metrics.forEach(function(metric,index){
    const x=54+index*(width+gap);
    addPanel_(slide,x,191,width,246,t.panelAlt);
    addTextBox_(slide,ag24Text_(metric.value),x+18,225,width-36,86,
      {fontSize:30,bold:true,color:t.green,align:SlidesApp.ParagraphAlignment.CENTER});
    addTextBox_(slide,ag24Text_(metric.label),x+16,330,width-32,78,
      {fontSize:13,color:t.text,align:SlidesApp.ParagraphAlignment.CENTER});
  });
  addSourceLine_(slide,data.evidence,54,458,846);
}

function createCompetitionSlide_(slide,data){
  const t=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  const competitors=normalizeSlideItems_(data.competitors,5).slice(0,5);
  const advantage=ag24Text_(data.advantage);
  if(competitors.length){
    const width=advantage?406:846;
    addPanel_(slide,54,190,width,249,t.panel);
    addTextBox_(slide,'ALTERNATIVES EXISTANTES',77,214,width-45,22,
      {fontSize:10,bold:true,color:t.green});
    addTextBox_(slide,competitors.map(function(s){return '• '+s;}).join('\n'),
      78,253,width-50,158,{fontSize:15,color:t.text});
  }
  if(advantage){
    const x=competitors.length?480:54,w=competitors.length?420:846;
    addPanel_(slide,x,190,w,249,t.panelAlt);
    addTextBox_(slide,'NOTRE DIFFÉRENCIATION',x+24,214,w-48,22,
      {fontSize:10,bold:true,color:t.yellow});
    addTextBox_(slide,advantage,x+24,253,w-48,158,
      {fontSize:18,bold:true,color:t.white});
  }
}

function AG24_LAYOUT_pickMilestones_(items,maxCount){
  const clean=(items||[]).filter(function(item){return AG24_LAYOUT_plain_(item);});
  // A prose introduction is not itself a milestone when dated objectives exist.
  const dated=clean.filter(function(item){
    return /(?:\bmois\s*\d+|\btrimestre\s*\d+|\bannée\s*\d+|\bT[1-4]\b)/i.test(item);
  });
  const relevant=dated.length>=2?dated:clean;
  if(relevant.length<=maxCount)return relevant;
  const selected=[];
  for(let i=0;i<maxCount;i++){
    const index=Math.round(i*(relevant.length-1)/(maxCount-1));
    selected.push(relevant[index]);
  }
  return selected;
}

function createGoToMarketSlide_(slide,data){
  const t=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  const items=AG24_LAYOUT_pickMilestones_(normalizeSlideItems_(data.milestones,4),4);
  if(!items.length)return;
  const cols=items.length===1?1:2, gap=16;
  const w=(846-gap*(cols-1))/cols,rows=Math.ceil(items.length/cols);
  const h=(265-gap*(rows-1))/rows;
  items.forEach(function(item,index){
    const x=54+(index%cols)*(w+gap), y=184+Math.floor(index/cols)*(h+gap);
    addPanel_(slide,x,y,w,h,t.panel);
    addTextBox_(slide,'0'+(index+1),x+15,y+13,39,25,
      {fontSize:15,bold:true,color:t.green});
    addTextBox_(slide,item,x+60,y+12,w-77,h-26,
      {fontSize:14,bold:true,color:t.white});
  });
}

function createTeamSlide_(slide, data) {
  const theme = getPremiumTheme_();

  addSectionHeader_(slide, data.eyebrow, data.title);

  addPanel_(slide, 54, 205, 446, 158, theme.panel);

  addTextBox_(
    slide,
    'FONDATEURS ET RESPONSABLES',
    78,
    224,
    360,
    18,
    {
      fontSize: 9,
      bold: true,
      color: theme.green
    }
  );

  const founders = normalizeSlideItems_(
    data.founders,
    2
  ).slice(0, 4);

  addTextBox_(
    slide,
    founders.map(function(item) {
      return '• ' + item;
    }).join('\n'),
    78,
    260,
    390,
    76,
    {
      fontSize: 13,
      color: theme.white
    }
  );

  if (data._hasFounderAsset) {
    addPanel_(slide, 526, 205, 374, 158, theme.panelAlt);
    addTextBox_(slide, 'COMPÉTENCES CLÉS', 685, 218, 190, 18,
      { fontSize: 9, bold: true, color: theme.green });
    addTextBox_(slide, ag24Text_(data.skills, ''), 685, 241, 192, 48,
      { fontSize: 11, color: theme.white });
    addTextBox_(slide, 'À RENFORCER', 685, 299, 192, 16,
      { fontSize: 9, bold: true, color: theme.yellow });
    addTextBox_(slide, ag24Text_(data.gaps, ''), 685, 322, 192, 26,
      { fontSize: 10, color: theme.white });
    return;
  }

  addPanel_(slide, 526, 205, 374, 72, theme.panelAlt);

  addTextBox_(
    slide,
    'COMPÉTENCES CLÉS',
    550,
    220,
    180,
    16,
    {
      fontSize: 9,
      bold: true,
      color: theme.green
    }
  );

  addTextBox_(
    slide,
    ag24Text_(data.skills, ''),
    550,
    244,
    326,
    24,
    {
      fontSize: 12,
      color: theme.white
    }
  );

  addPanel_(slide, 526, 291, 374, 72, theme.panelAlt);

  addTextBox_(
    slide,
    'COMPÉTENCES À RENFORCER',
    550,
    306,
    220,
    16,
    {
      fontSize: 9,
      bold: true,
      color: theme.yellow
    }
  );

  addTextBox_(
    slide,
    ag24Text_(data.gaps, ''),
    550,
    330,
    326,
    24,
    {
      fontSize: 12,
      color: theme.white
    }
  );
}

function createFundingSlide_(slide, data) {
  const theme = getPremiumTheme_();

  addTextBox_(
    slide,
    ag24Text_(
      data.eyebrow,
      'FINANCEMENT'
    ).toUpperCase(),
    54,
    48,
    520,
    20,
    {
      fontSize: 10,
      bold: true,
      color: theme.green
    }
  );

  addTextBox_(
    slide,
    ag24Text_(data.title, ''),
    54,
    88,
    520,
    62,
    {
      fontSize: 34,
      bold: true,
      color: theme.white
    }
  );

  addTextBox_(
    slide,
    ag24Text_(
      data.subtitle,
      ''
    ),
    54,
    152,
    520,
    28,
    {
      fontSize: 15,
      color: theme.green
    }
  );

  addPanel_(slide, 54, 205, 410, 150, theme.panel);

  addTextBox_(
    slide,
    'UTILISATION DES FONDS',
    78,
    224,
    300,
    18,
    {
      fontSize: 9,
      bold: true,
      color: theme.green
    }
  );

  addTextBox_(
    slide,
    normalizeSlideItems_(data.uses, 3)
      .slice(0, 5)
      .map(function(item) {
        return '• ' + item;
      })
      .join('\n'),
    78,
    258,
    350,
    82,
    {
      fontSize: 12,
      color: theme.white
    }
  );

  addPanel_(slide, 490, 205, 410, 150, theme.panelAlt);

  addTextBox_(
    slide,
    'JALONS ATTENDUS',
    514,
    224,
    300,
    18,
    {
      fontSize: 9,
      bold: true,
      color: theme.yellow
    }
  );

  addTextBox_(
    slide,
    normalizeSlideItems_(data.milestones, 2)
      .slice(0, 4)
      .map(function(item) {
        return '• ' + item;
      })
      .join('\n'),
    514,
    258,
    350,
    76,
    {
      fontSize: 12,
      color: theme.white
    }
  );

  addTextBox_(
    slide,
    ag24Text_(data.vision),
    54,
    382,
    500,
    22,
    {
      fontSize: 10,
      color: theme.muted
    }
  );

  addTextBox_(
    slide,
    ag24Text_(data.contact, ''),
    580,
    382,
    320,
    22,
    {
      fontSize: 10,
      bold: true,
      color: theme.white,
      align: SlidesApp.ParagraphAlignment.END
    }
  );
}

function createGenericSlide_(slide, data) {
  const theme = getPremiumTheme_();

  addSectionHeader_(
    slide,
    data.eyebrow,
    data.title
  );

  addPanel_(slide, 54, 205, 846, 150, theme.panel);

  addTextBox_(
    slide,
    ag24Text_(
      data.body ||
      data.subtitle ||
      data.description,
      ''
    ),
    80,
    232,
    794,
    98,
    {
      fontSize: 16,
      color: theme.text
    }
  );
}

function addSectionHeader_(slide, eyebrow, title) {
  const theme = getPremiumTheme_();

  addTextBox_(
    slide,
    ag24Text_(
      eyebrow,
      'PITCH DECK'
    ).toUpperCase(),
    54,
    44,
    520,
    20,
    {
      fontSize: 10,
      bold: true,
      color: theme.green
    }
  );

  addTextBox_(
    slide,
    ag24Text_(
      title,
      'Section du projet'
    ),
    54,
    82,
    846,
    92,
    {
      fontSize: 25,
      bold: true,
      color: theme.white
    }
  );
}

function addPanel_(
  slide,
  x,
  y,
  width,
  height,
  color
) {
  const theme = getPremiumTheme_();

  const shape = slide.insertShape(
    SlidesApp.ShapeType.ROUND_RECTANGLE,
    ag24ScaleX_(x),
    ag24ScaleY_(y),
    ag24ScaleX_(width),
    ag24ScaleY_(height)
  );

  shape.getFill().setSolidFill(
    color || theme.panel
  );

  setShapeBorder_(
    shape,
    theme.line,
    0.8
  );

  return shape;
}

function addMetricCard_(
  slide,
  label,
  value,
  x,
  y,
  width,
  height
) {
  const theme = getPremiumTheme_();

  addPanel_(
    slide,
    x,
    y,
    width,
    height,
    theme.panel
  );

  addTextBox_(
    slide,
    label,
    x + 18,
    y + 18,
    width - 36,
    18,
    {
      fontSize: 9,
      bold: true,
      color: theme.green
    }
  );

  addTextBox_(
    slide,
    value,
    x + 18,
    y + 50,
    width - 36,
    height - 62,
    {
      fontSize: 14,
      bold: true,
      color: theme.white
    }
  );
}

function addCircleNumber_(
  slide,
  value,
  x,
  y
) {
  const theme = getPremiumTheme_();

  const circle = slide.insertShape(
    SlidesApp.ShapeType.ELLIPSE,
    ag24ScaleX_(x),
    ag24ScaleY_(y),
    ag24ScaleX_(34),
    ag24ScaleY_(34)
  );

  circle.getFill().setSolidFill(theme.green);
  removeShapeBorder_(circle);

  const range = circle.getText();

  range.setText(value);

  range.getTextStyle()
    .setFontFamily('Arial')
    .setFontSize(ag24ScaleFont_(13))
    .setBold(true)
    .setForegroundColor(theme.background);

  range.getParagraphStyle().setParagraphAlignment(
    SlidesApp.ParagraphAlignment.CENTER
  );

  circle.setContentAlignment(
    SlidesApp.ContentAlignment.MIDDLE
  );
}

function addPill_(
  slide,
  text,
  x,
  y,
  width,
  height,
  backgroundColor,
  textColor
) {
  const shape = slide.insertShape(
    SlidesApp.ShapeType.ROUND_RECTANGLE,
    ag24ScaleX_(x),
    ag24ScaleY_(y),
    ag24ScaleX_(width),
    ag24ScaleY_(height)
  );

  shape.getFill().setSolidFill(backgroundColor);
  removeShapeBorder_(shape);

  const range = shape.getText();

  range.setText(text);

  range.getTextStyle()
    .setFontFamily('Arial')
    .setFontSize(ag24ScaleFont_(10))
    .setBold(true)
    .setForegroundColor(textColor);

  range.getParagraphStyle().setParagraphAlignment(
    SlidesApp.ParagraphAlignment.CENTER
  );

  shape.setContentAlignment(
    SlidesApp.ContentAlignment.MIDDLE
  );

  return shape;
}

function addSourceLine_(slide,text,x,y,width){
  const t=getPremiumTheme_(),clean=AG24_LAYOUT_plain_(text);
  if(!clean)return;
  addTextBox_(slide,'Source : '+clean,x,y||456,width,39,
    {fontSize:10,minFontSize:10,color:t.muted});
}

/**
 * Render-only typographic preflight. Canonical project data is never modified.
 * Every textbox adapts its font to its actual available width and height.
 */
function AG24_LAYOUT_plain_(value){
  let s=String(value===null||value===undefined?'':value);
  if(/^(?:projet sans nom|information non documentée|information à compléter|source requise|à préciser|montant à définir|non renseignée?)$/i.test(s.trim()))return '';
  return s.replace(/\u0007/g,' • ')
    .replace(/\*\*/g,'')
    .replace(/__(.*?)__/g,'$1')
    .replace(/(^|\n)\s*#{1,6}\s*/g,'$1')
    .replace(/(^|\n)\s*[-*]\s+/g,'$1• ')
    .replace(/[ \t]+/g,' ').trim();
}
function AG24_LAYOUT_countLines_(text,width,font,bold){
  const charWidth=font*(bold?0.56:0.51);
  const max=Math.max(8,(width*0.75-9)/charWidth);
  let lines=0;
  String(text).split('\n').forEach(function(paragraph){
    if(!paragraph.trim()){lines+=1;return;}
    let current=0;
    paragraph.split(/\s+/).forEach(function(word){
      const len=Array.from(word).reduce(function(sum,c){
        return sum+(/[MW@%]/.test(c)?1.4:/[il.,:;!|]/.test(c)?0.46:1);
      },0);
      if(current>0 && current+1+len>max){lines+=1;current=0;}
      if(len>max){lines+=Math.floor(len/max);current=len%max;}
      else current+=len+(current>0?1:0);
    });
    if(current>0)lines+=1;
  });
  return Math.max(lines,1);
}
function AG24_LAYOUT_font_(text,width,height,requested,bold,minSize){
  const base=Number(requested)||14;
  const lower=Number(minSize)||10;
  for(let size=base;size>=lower;size-=0.5){
    const actual=ag24ScaleFont_(size);
    const lines=AG24_LAYOUT_countLines_(text,width,actual,bold);
    const needed=lines*actual*1.24+3;
    if(needed<=height*0.75)return actual;
  }
  return ag24ScaleFont_(lower);
}
function addTextBox_(slide,text,x,y,width,height,options){
  const t=getPremiumTheme_(),opts=options||{};
  const clean=AG24_LAYOUT_plain_(text);
  if(!clean || width<=0 || height<=0)return null;
  const box=slide.insertTextBox(clean,ag24ScaleX_(x),ag24ScaleY_(y),
    ag24ScaleX_(width),ag24ScaleY_(height));
  const range=box.getText();
  range.getTextStyle().setFontFamily(opts.fontFamily||'Arial')
    .setFontSize(AG24_LAYOUT_font_(clean,width,height,opts.fontSize||14,
      Boolean(opts.bold),opts.minFontSize||10))
    .setBold(Boolean(opts.bold))
    .setForegroundColor(opts.color||t.text);
  range.getParagraphStyle().setParagraphAlignment(
    opts.align||SlidesApp.ParagraphAlignment.START);
  return box;
}

function addPremiumFooter_(slide,number,totalSlides,qualityLabel,submissionMode,submissionProjectName){
  // Draft feedback, warnings and document-editing instructions belong to the
  // app's diagnostics. Investor facts and source qualifications remain in copy.
  const t=getPremiumTheme_();
  const line=slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
    ag24ScaleX_(54),ag24ScaleY_(503),ag24ScaleX_(846),Math.max(1,ag24ScaleY_(1)));
  line.getFill().setSolidFill(t.line);removeShapeBorder_(line);
  if(submissionMode && AG24_LAYOUT_plain_(submissionProjectName))
    addTextBox_(slide,submissionProjectName,54,510,540,18,
      {fontSize:9,color:t.muted});
  addTextBox_(slide,String(number||'')+' / '+String(totalSlides||12),
    810,510,90,18,{fontSize:9,color:t.muted,
      align:SlidesApp.ParagraphAlignment.END});
}

function setShapeBorder_(
  shape,
  color,
  weight
) {
  try {
    shape
      .getBorder()
      .getLineFill()
      .setSolidFill(color);

    shape
      .getBorder()
      .setWeight(weight || 1);

  } catch (error) {
    // Ignore.
  }
}

function removeShapeBorder_(shape) {
  try {
    shape
      .getBorder()
      .getLineFill()
      .setTransparent();

  } catch (error) {
    // Ignore.
  }
}

function moveGeneratedFileToOutputFolder_(file, folder) {
  if (!folder || !file) throw new Error('Dossier généré manquant.');
  file.moveTo(folder);
}

function getAg24ProjectName_(project) {
  const data =
    project && project.data
      ? project.data
      : {};

  const identity = data.identity || {};

  return (
    identity.projectName ||
    project.projectName ||
    'Projet sans nom'
  );
}

function ag24Text_(value, fallback) {
  const text = String(
    value === null ||
    value === undefined
      ? ''
      : value
  )
    .replace(/\s+/g, ' ')
    .trim();

  return text || fallback || '';
}

function normalizeSlideItems_(items, minimum) {
  let result = [];

  if (Array.isArray(items)) {
    result = items
      .map(function(item) {
        return ag24Text_(item);
      })
      .filter(Boolean);

  } else if (items) {
    result = String(items)
      .split(/\r?\n|;|•/)
      .map(function(item) {
        return ag24Text_(item);
      })
      .filter(Boolean);
  }

  // V2.1: never invent missing steps, competitors, founders or milestones.
  return result;
}

function getAg24ErrorMessage_(error) {
  if (!error) {
    return 'Erreur inconnue';
  }

  if (error.message) {
    return String(error.message);
  }

  return String(error);
}

function authorizeSlidesCreation_() {
  const presentation = SlidesApp.create(
    'TEST AUTORISATION AFRIGREEN24'
  );

  const presentationId =
    presentation.getId();

  presentation.saveAndClose();

  DriveApp
    .getFileById(presentationId)
    .setTrashed(true);

  return 'Autorisation Slides accordée.';
}
