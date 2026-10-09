/**
 * AFRIGREEN24 PITCH STUDIO
 * SlidesGenerator.gs — Premium Design V2
 */

function generateStandardPresentation_(project) {
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
  logEvent_(project.projectId,'STORY_DECK_SOURCE',{
    mode:narrativeUse.used?'OPENAI_REFORMULATED':'DETERMINISTIC',status:narrativeUse.status,
    runId:narrativeUse.runId||'',planVersion:investorAudit.version,
    layoutsAI:investorAudit.selectedAI,layoutsRejected:investorAudit.blockedLayouts,
    weakFieldsRemoved:investorAudit.weakFieldsRemoved,
    evidenceMissing:investorAudit.missingEvidence
  });
  const projectAssets = AG24_ASSET_imagesForGeneration_(project.projectId);

  if (!Array.isArray(slidesContent) || !slidesContent.length) {
    throw new Error('Le contenu du Pitch Deck est vide.');
  }

  const projectName = ag24Text_(
    getAg24ProjectName_(project),
    'Projet sans nom'
  );

  const presentationName =
    projectName + ' - Pitch Deck Standard - AfriGreen24';

  const presentation = SlidesApp.create(presentationName);
  const presentationId = presentation.getId();

  try {
    const initialSlides = presentation.getSlides();

    if (initialSlides.length) {
      initialSlides[0].remove();
    }

    slidesContent.forEach(function(slideData, index) {
      slideData._hasFounderAsset = !!AG24_SLIDE_selectAsset_(projectAssets, ['FOUNDER', 'TEAM']);
      slideData._coverAssetRole = (AG24_SLIDE_selectAsset_(projectAssets, ['COVER_HERO', 'LOGO']) || {}).role || '';
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

  if(typeof AG24_INVESTOR_renderFocus_==='function' &&
      AG24_INVESTOR_renderFocus_(slide,data)) {
    addPremiumFooter_(slide,data.number||index+1,totalSlides,data.qualityLabel);
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
    data.qualityLabel
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
  addTextBox_(slide,'AFRIGREEN24  /  INVESTOR PRESENTATION',54,47,525,26,
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
  if(!data._coverAssetRole) {
    addTextBox_(slide,'AG24',682,130,188,76,
      {fontSize:46,bold:true,color:theme.green,
       align:SlidesApp.ParagraphAlignment.CENTER});
    addTextBox_(slide,'PITCH STUDIO',682,225,188,32,
      {fontSize:17,bold:true,color:theme.white,
       align:SlidesApp.ParagraphAlignment.CENTER});
    addTextBox_(slide,'12 SECTIONS  ·  1 VISION',672,305,206,27,
      {fontSize:11,color:theme.muted,
       align:SlidesApp.ParagraphAlignment.CENTER});
  } else if(data._coverAssetRole==='LOGO') {
    addTextBox_(slide,'PITCH STUDIO',676,284,201,35,
      {fontSize:16,bold:true,color:theme.white,
       align:SlidesApp.ParagraphAlignment.CENTER});
  }
}

function createStatementSlide_(slide,data) {
  const theme=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  if(ag24Text_(data.body)) {
    addPanel_(slide,54,190,560,170,theme.panel);
    addTextBox_(slide,data.body,78,218,512,116,
      {fontSize:17,color:theme.text});
  }
  if(ag24Text_(data.sideValue)) {
    addPanel_(slide,642,190,258,170,theme.panelAlt);
    addTextBox_(slide,ag24Text_(data.sideLabel,'PUBLIC VISÉ').toUpperCase(),
      666,216,210,18,{fontSize:10,bold:true,color:theme.green});
    addTextBox_(slide,data.sideValue,666,252,210,83,
      {fontSize:17,bold:true,color:theme.white});
  }
  addSourceLine_(slide,data.proof,54,386,846);
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
  const theme=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  if(ag24Text_(data.body)) {
    addPanel_(slide,54,192,570,168,theme.panel);
    addTextBox_(slide,data.body,80,218,518,117,
      {fontSize:18,color:theme.text});
  }
  if(ag24Text_(data.status)) {
    addPanel_(slide,650,192,250,168,theme.panelAlt);
    addTextBox_(slide,'STATUT ACTUEL',674,216,200,18,
      {fontSize:10,bold:true,color:theme.green});
    addTextBox_(slide,data.status,674,252,200,75,
      {fontSize:16,bold:true,color:theme.white});
  }
}

function createStepsSlide_(slide, data) {
  const theme = getPremiumTheme_();

  addSectionHeader_(slide, data.eyebrow, data.title);

  const items = normalizeSlideItems_(data.items, 3).slice(0, 5);
  if (!items.length) {
    addTextBox_(slide,'Les étapes du service ne sont pas encore décrites.',
      60,243,785,64,{fontSize:19,color:theme.muted});
    return;
  }
  const gap = 12;
  const totalWidth = 846;
  const width =
    (totalWidth - gap * (items.length - 1)) /
    items.length;

  items.forEach(function(item, index) {
    const x = 54 + index * (width + gap);

    addPanel_(slide, x, 210, width, 142, theme.panel);

    addCircleNumber_(
      slide,
      String(index + 1),
      x + 16,
      226
    );

    addTextBox_(
      slide,
      ag24Text_(item, ''),
      x + 16,
      278,
      width - 32,
      54,
      {
        fontSize: 12,
        bold: true,
        color: theme.white
      }
    );
  });
}

function createMarketSlide_(slide,data) {
  const theme=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  // Use a large piece of REAL declared data, not invented TAM/SAM/SOM.
  if(ag24Text_(data.geography)) {
    addPanel_(slide,54,209,330,158,theme.panelAlt);
    addTextBox_(slide,'GÉOGRAPHIE PRIORITAIRE',75,229,289,20,
      {fontSize:10,bold:true,color:theme.green});
    addTextBox_(slide,data.geography,75,263,285,77,
      {fontSize:21,bold:true,color:theme.white});
  }
  if(ag24Text_(data.estimate)) {
    addPanel_(slide,408,209,492,158,theme.panel);
    addTextBox_(slide,'POTENTIEL DÉCLARÉ',432,229,450,20,
      {fontSize:10,bold:true,color:theme.green});
    addTextBox_(slide,data.estimate,432,262,440,88,
      {fontSize:18,bold:true,color:theme.white});
  }
  addSourceLine_(slide,data.source,54,386,846);
}
function createBusinessSlide_(slide,data) {
  const theme=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  if(ag24Text_(data.pricing)) {
    addPanel_(slide,54,210,388,156,theme.panelAlt);
    addTextBox_(slide,'MODÈLE DE TARIFICATION',76,230,344,23,
      {fontSize:10,bold:true,color:theme.green});
    addTextBox_(slide,data.pricing,76,268,344,72,
      {fontSize:24,bold:true,color:theme.white});
  }
  if(ag24Text_(data.acquisition)) {
    addTextBox_(slide,'ACQUISITION CLIENT',480,217,395,26,
      {fontSize:10,bold:true,color:theme.green});
    addTextBox_(slide,data.acquisition,480,252,395,63,
      {fontSize:17,color:theme.white});
  }
  if(ag24Text_(data.revenue)) {
    addTextBox_(slide,'STATUT DES REVENUS',480,325,395,22,
      {fontSize:10,bold:true,color:theme.yellow});
    addTextBox_(slide,data.revenue,480,349,395,42,
      {fontSize:17,bold:true,color:theme.white});
  }
}

function createTractionSlide_(slide,data) {
  const theme=getPremiumTheme_();
  addSectionHeader_(slide,data.eyebrow,data.title);
  const metrics=Array.isArray(data.metrics)?data.metrics.slice(0,3):[];
  if(metrics.length===0) {
    addTextBox_(slide,'Aucun indicateur chiffré documenté pour le moment.',
      54,241,770,72,{fontSize:19,color:theme.muted});
  }
  const gap=16,totalWidth=846;
  const width=metrics.length?(totalWidth-gap*(metrics.length-1))/metrics.length:0;
  metrics.forEach(function(metric,index){
    const x=54+index*(width+gap);
    addPanel_(slide,x,203,width,163,theme.panelAlt);
    addTextBox_(slide,ag24Text_(metric.value),x+18,225,width-36,60,
      {fontSize:29,bold:true,color:theme.green,
       align:SlidesApp.ParagraphAlignment.CENTER});
    addTextBox_(slide,ag24Text_(metric.label),x+16,299,width-32,56,
      {fontSize:12,color:theme.text,
       align:SlidesApp.ParagraphAlignment.CENTER});
  });
  addSourceLine_(slide,data.evidence,54,390,846);
}

function createCompetitionSlide_(slide, data) {
  const theme = getPremiumTheme_();

  addSectionHeader_(slide, data.eyebrow, data.title);

  addPanel_(slide, 54, 205, 390, 166, theme.panel);

  addTextBox_(
    slide,
    'ALTERNATIVES EXISTANTES',
    78,
    224,
    320,
    18,
    {
      fontSize: 9,
      bold: true,
      color: theme.green
    }
  );

  const competitors = normalizeSlideItems_(
    data.competitors,
    3
  ).slice(0, 5);

  addTextBox_(
    slide,
    competitors.map(function(item) {
      return '• ' + item;
    }).join('\n'),
    78,
    258,
    330,
    92,
    {
      fontSize: 13,
      color: theme.text
    }
  );

  addPanel_(slide, 470, 205, 430, 166, theme.panelAlt);

  addTextBox_(
    slide,
    'AVANTAGE DIFFÉRENCIATEUR',
    494,
    224,
    330,
    18,
    {
      fontSize: 9,
      bold: true,
      color: theme.yellow
    }
  );

  addTextBox_(
    slide,
    ag24Text_(data.title, 'Avantage à préciser'),
    494,
    258,
    382,
    84,
    {
      fontSize: 17,
      bold: true,
      color: theme.white
    }
  );
}

function createGoToMarketSlide_(slide, data) {
  const theme = getPremiumTheme_();

  addSectionHeader_(slide, data.eyebrow, data.title);

  const milestones = normalizeSlideItems_(
    data.milestones,
    3
  ).slice(0, 4);
  if (!milestones.length) {
    addTextBox_(slide,'Les jalons de croissance restent à définir.',
      54,254,790,55,{fontSize:19,color:theme.muted});
    return;
  }

  milestones.forEach(function(item, index) {
    const slotWidth = (846 - (milestones.length - 1) * 14) / milestones.length;
    const x = 54 + index * (slotWidth + 14);

    addPanel_(slide, x, 212, slotWidth, 142, theme.panel);

    addTextBox_(
      slide,
      '0' + String(index + 1),
      x + 16,
      228,
      48,
      26,
      {
        fontSize: 18,
        bold: true,
        color: theme.green
      }
    );

    addTextBox_(
      slide,
      item,
      x + 16,
      272,
      slotWidth - 32,
      62,
      {
        fontSize: 12,
        bold: true,
        color: theme.white
      }
    );
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

function addSourceLine_(
  slide,
  text,
  x,
  y,
  width
) {
  const theme = getPremiumTheme_();

  if (!ag24Text_(text)) return;
  addTextBox_(
    slide,
    'PREUVE / SOURCE : ' +
      ag24Text_(
        text,
        ''
      ),
    x,
    y,
    width,
    22,
    {
      fontSize: 9,
      color: theme.muted
    }
  );
}

function addTextBox_(
  slide,
  text,
  x,
  y,
  width,
  height,
  options
) {
  const theme = getPremiumTheme_();
  const settings = options || {};

  const box = slide.insertTextBox(
    ag24Text_(text),
    ag24ScaleX_(x),
    ag24ScaleY_(y),
    ag24ScaleX_(width),
    ag24ScaleY_(height)
  );

  const range = box.getText();

  range.getTextStyle()
    .setFontFamily(
      settings.fontFamily || 'Arial'
    )
    .setFontSize(
      ag24ScaleFont_(settings.fontSize || 14)
    )
    .setBold(
      Boolean(settings.bold)
    )
    .setForegroundColor(
      settings.color || theme.text
    );

  range.getParagraphStyle().setParagraphAlignment(
    settings.align ||
    SlidesApp.ParagraphAlignment.START
  );

  return box;
}

function addPremiumFooter_(
  slide,
  number,
  totalSlides,
  qualityLabel
) {
  const theme = getPremiumTheme_();

  const line = slide.insertShape(
    SlidesApp.ShapeType.RECTANGLE,
    ag24ScaleX_(54),
    ag24ScaleY_(420),
    ag24ScaleX_(846),
    Math.max(1, ag24ScaleY_(1))
  );

  line.getFill().setSolidFill(theme.line);
  removeShapeBorder_(line);

  addTextBox_(
    slide,
    'AfriGreen24 Pitch Studio',
    54,
    428,
    300,
    12,
    {
      fontSize: 8,
      color: theme.muted
    }
  );

  if (qualityLabel && qualityLabel !== 'PRÊT POUR REVUE HUMAINE') {
    addTextBox_(slide,qualityLabel + ' • DONNÉES À VÉRIFIER',
      330,426,430,20,{fontSize:9,bold:true,color:theme.yellow,
      align:SlidesApp.ParagraphAlignment.CENTER});
  }
  addTextBox_(
    slide,
    String(number || '') +
      ' / ' +
      String(totalSlides || 12),
    810,
    428,
    90,
    12,
    {
      fontSize: 8,
      color: theme.muted,
      align: SlidesApp.ParagraphAlignment.END
    }
  );
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
