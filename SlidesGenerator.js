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
    // A Slides link is not useful unless the paying project's contact can open it.
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

  switch (type) {
    case 'cover':
      createCoverSlide_(slide, data);
      break;

    case 'statement':
      createStatementSlide_(slide, data);
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
    totalSlides
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
  return Math.max(7, Number(value || 14) * 0.75);
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
  const theme = getPremiumTheme_();

  addTextBox_(
    slide,
    'AFRIGREEN24 PITCH STUDIO',
    54,
    48,
    360,
    22,
    {
      fontSize: 10,
      bold: true,
      color: theme.green
    }
  );

  addTextBox_(
    slide,
    ag24Text_(data.title, 'Projet sans nom'),
    54,
    100,
    560,
    120,
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
      'Proposition de valeur à compléter'
    ),
    54,
    232,
    560,
    78,
    {
      fontSize: 18,
      color: theme.text
    }
  );

  if (ag24Text_(data.meta)) {
    addPill_(
      slide,
      ag24Text_(data.meta),
      54,
      334,
      420,
      34,
      theme.panelAlt,
      theme.white
    );
  }

  addPanel_(
    slide,
    660,
    60,
    240,
    330,
    theme.panel
  );

  addTextBox_(
    slide,
    'AG24',
    690,
    112,
    180,
    54,
    {
      fontSize: 36,
      bold: true,
      color: theme.green,
      align: SlidesApp.ParagraphAlignment.CENTER
    }
  );

  addTextBox_(
    slide,
    'PITCH DECK\nSTANDARD',
    690,
    185,
    180,
    76,
    {
      fontSize: 20,
      bold: true,
      color: theme.white,
      align: SlidesApp.ParagraphAlignment.CENTER
    }
  );

  addTextBox_(
    slide,
    'Structuré pour être compris,\nprésenté et défendu.',
    690,
    286,
    180,
    56,
    {
      fontSize: 11,
      color: theme.muted,
      align: SlidesApp.ParagraphAlignment.CENTER
    }
  );
}

function createStatementSlide_(slide, data) {
  const theme = getPremiumTheme_();

  addSectionHeader_(slide, data.eyebrow, data.title);

  addPanel_(slide, 54, 190, 560, 170, theme.panel);

  addTextBox_(
    slide,
    ag24Text_(data.body, 'Information à compléter'),
    78,
    218,
    512,
    116,
    {
      fontSize: 16,
      color: theme.text
    }
  );

  addPanel_(slide, 642, 190, 258, 170, theme.panelAlt);

  addTextBox_(
    slide,
    ag24Text_(data.sideLabel, 'Point clé').toUpperCase(),
    666,
    216,
    210,
    18,
    {
      fontSize: 9,
      bold: true,
      color: theme.green
    }
  );

  addTextBox_(
    slide,
    ag24Text_(
      data.sideValue,
      'Information à compléter'
    ),
    666,
    250,
    210,
    82,
    {
      fontSize: 15,
      bold: true,
      color: theme.white
    }
  );

  addSourceLine_(
    slide,
    ag24Text_(data.proof, 'Source ou preuve à ajouter'),
    54,
    386,
    846
  );
}

function createSolutionSlide_(slide, data) {
  const theme = getPremiumTheme_();

  addSectionHeader_(slide, data.eyebrow, data.title);

  addPanel_(slide, 54, 192, 570, 168, theme.panel);

  addTextBox_(
    slide,
    ag24Text_(
      data.body,
      'Proposition de valeur à compléter'
    ),
    80,
    220,
    518,
    112,
    {
      fontSize: 17,
      color: theme.text
    }
  );

  addPanel_(slide, 650, 192, 250, 168, theme.panelAlt);

  addTextBox_(
    slide,
    'STATUT ACTUEL',
    674,
    216,
    200,
    18,
    {
      fontSize: 9,
      bold: true,
      color: theme.green
    }
  );

  addTextBox_(
    slide,
    ag24Text_(data.status, 'Stade à préciser'),
    674,
    252,
    200,
    76,
    {
      fontSize: 15,
      bold: true,
      color: theme.white
    }
  );
}

function createStepsSlide_(slide, data) {
  const theme = getPremiumTheme_();

  addSectionHeader_(slide, data.eyebrow, data.title);

  const items = normalizeSlideItems_(data.items, 3).slice(0, 5);
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
      ag24Text_(item, 'Information à compléter'),
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

function createMarketSlide_(slide, data) {
  const theme = getPremiumTheme_();

  addSectionHeader_(slide, data.eyebrow, data.title);

  addMetricCard_(
    slide,
    'ZONE PRIORITAIRE',
    ag24Text_(data.geography, 'À préciser'),
    54,
    210,
    260,
    126
  );

  addMetricCard_(
    slide,
    'POTENTIEL ESTIMÉ',
    ag24Text_(data.estimate, 'À quantifier'),
    327,
    210,
    300,
    126
  );

  addMetricCard_(
    slide,
    'SOURCE',
    ag24Text_(data.source, 'Source requise'),
    640,
    210,
    260,
    126
  );

  addTextBox_(
    slide,
    'Une estimation crédible précise la source, la date et la méthode de calcul.',
    54,
    370,
    846,
    24,
    {
      fontSize: 10,
      color: theme.muted
    }
  );
}

function createBusinessSlide_(slide, data) {
  addSectionHeader_(slide, data.eyebrow, data.title);

  addMetricCard_(
    slide,
    'TARIFICATION',
    ag24Text_(data.pricing, 'À préciser'),
    54,
    210,
    260,
    132
  );

  addMetricCard_(
    slide,
    'ACQUISITION CLIENT',
    ag24Text_(data.acquisition, 'À préciser'),
    327,
    210,
    300,
    132
  );

  addMetricCard_(
    slide,
    'REVENUS',
    ag24Text_(data.revenue, 'À préciser'),
    640,
    210,
    260,
    132
  );
}

function createTractionSlide_(slide, data) {
  const theme = getPremiumTheme_();

  addSectionHeader_(slide, data.eyebrow, data.title);

  const metrics = Array.isArray(data.metrics)
    ? data.metrics.slice(0, 3)
    : [];

  while (metrics.length < 3) {
    metrics.push({
      value: 'À préciser',
      label: 'indicateur de validation'
    });
  }

  metrics.forEach(function(metric, index) {
    const x = 54 + index * 282;

    addPanel_(slide, x, 210, 266, 128, theme.panel);

    addTextBox_(
      slide,
      ag24Text_(metric.value, 'À préciser'),
      x + 18,
      228,
      230,
      44,
      {
        fontSize: 26,
        bold: true,
        color: theme.green,
        align: SlidesApp.ParagraphAlignment.CENTER
      }
    );

    addTextBox_(
      slide,
      ag24Text_(metric.label, 'indicateur'),
      x + 18,
      286,
      230,
      28,
      {
        fontSize: 10,
        color: theme.muted,
        align: SlidesApp.ParagraphAlignment.CENTER
      }
    );
  });

  addSourceLine_(
    slide,
    ag24Text_(data.evidence, 'Preuves à préciser'),
    54,
    372,
    846
  );
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

  milestones.forEach(function(item, index) {
    const x = 54 + index * 214;

    addPanel_(slide, x, 212, 198, 142, theme.panel);

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
      166,
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
    addTextBox_(slide, ag24Text_(data.skills, 'À préciser'), 685, 241, 192, 48,
      { fontSize: 11, color: theme.white });
    addTextBox_(slide, 'À RENFORCER', 685, 299, 192, 16,
      { fontSize: 9, bold: true, color: theme.yellow });
    addTextBox_(slide, ag24Text_(data.gaps, 'À préciser'), 685, 322, 192, 26,
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
    ag24Text_(data.skills, 'À préciser'),
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
    ag24Text_(data.gaps, 'À préciser'),
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
    ag24Text_(data.title, 'Montant à préciser'),
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
      'Type de financement à préciser'
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
    ag24Text_(data.contact, 'Contact à préciser'),
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
      'Information à compléter'
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
      'Information à compléter'
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

  addTextBox_(
    slide,
    'PREUVE / SOURCE : ' +
      ag24Text_(
        text,
        'Source ou preuve à ajouter'
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
  totalSlides
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

  while (result.length < minimum) {
    result.push('Information à compléter');
  }

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
