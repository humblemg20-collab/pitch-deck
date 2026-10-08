function getDatabase_() {
  const config = requireSetup_();
  return SpreadsheetApp.openById(config.databaseSpreadsheetId);
}

function getProjectsSheet_() {
  return getDatabase_().getSheetByName(AG24_CONFIG.SHEETS.PROJECTS);
}

function getEventsSheet_() {
  return getDatabase_().getSheetByName(AG24_CONFIG.SHEETS.EVENTS);
}

function rowToProject_(row, rowNumber) {
  return {
    rowNumber: rowNumber,
    projectId: row[0] || '',
    email: row[1] || '',
    projectName: row[2] || '',
    tokenHash: row[3] || '',
    codeHash: row[4] || '',
    data: safeJsonParse_(row[5], {}),
    progress: safeJsonParse_(row[6], {}),
    score: safeJsonParse_(row[7], null),
    alerts: safeJsonParse_(row[8], []),
    status: row[9] || AG24_CONFIG.STATUS.DRAFT,
    createdAt: row[10] || '',
    updatedAt: row[11] || '',
    folderId: row[12] || '',
    slidesUrl: row[13] || '',
    pdfUrl: row[14] || ''
  };
}

function projectToRow_(project) {
  return [
    project.projectId,
    project.email,
    project.projectName,
    project.tokenHash,
    project.codeHash,
    JSON.stringify(project.data || {}),
    JSON.stringify(project.progress || {}),
    JSON.stringify(project.score || null),
    JSON.stringify(project.alerts || []),
    project.status || AG24_CONFIG.STATUS.DRAFT,
    project.createdAt || nowIso_(),
    project.updatedAt || nowIso_(),
    project.folderId || '',
    project.slidesUrl || '',
    project.pdfUrl || ''
  ];
}

function findProject_(projectId) {
  const sheet = getProjectsSheet_();
  const values = sheet.getDataRange().getValues();
  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][0]) === String(projectId)) {
      return rowToProject_(values[index], index + 1);
    }
  }
  return null;
}

function insertProject_(project) {
  const sheet = getProjectsSheet_();
  sheet.appendRow(projectToRow_(project));
  return findProject_(project.projectId);
}

function updateProject_(project) {
  const sheet = getProjectsSheet_();
  const rowNumber = project.rowNumber || (findProject_(project.projectId) || {}).rowNumber;
  if (!rowNumber) throw new Error('Projet introuvable.');
  project.updatedAt = nowIso_();
  sheet.getRange(rowNumber, 1, 1, AG24_CONFIG.PROJECT_HEADERS.length).setValues([projectToRow_(project)]);
  return findProject_(project.projectId);
}

function logEvent_(projectId, eventType, details) {
  try {
    getEventsSheet_().appendRow([
      nowIso_(),
      cleanString_(projectId, 80),
      cleanString_(eventType, 80),
      JSON.stringify(sanitizeObject_(details || {}))
    ]);
  } catch (error) {
    console.warn('Impossible de journaliser l’événement: ' + error.message);
  }
}

function getOrCreateProjectFolder_(project) {
  const config = requireSetup_();
  if (project.folderId) {
    try {
      return DriveApp.getFolderById(project.folderId);
    } catch (error) {
      project.folderId = '';
    }
  }
  const root = DriveApp.getFolderById(config.rootFolderId);
  const folderName = project.projectId + ' - ' + slugify_(project.projectName);
  const folder = root.createFolder(folderName);
  project.folderId = folder.getId();
  return folder;
}
function saveLeadEmail_(leadData) {
  const email = normalizeLeadEmail_(leadData.email);

  if (!email) {
    throw new Error('Adresse e-mail du prospect invalide.');
  }

  const sheet = setupLeadsSheet_();
  const now = nowIso_();

  const values = sheet.getDataRange().getValues();
  const headers = values.length ? values[0] : [];

  const emailColumn = headers.indexOf('email');
  const projectIdColumn = headers.indexOf('projectId');

  let existingRow = -1;

  for (let index = 1; index < values.length; index++) {
    const rowEmail = normalizeLeadEmail_(
      emailColumn >= 0 ? values[index][emailColumn] : ''
    );

    const rowProjectId = cleanString_(
      projectIdColumn >= 0 ? values[index][projectIdColumn] : '',
      150
    );

    if (
      rowEmail === email &&
      rowProjectId === cleanString_(leadData.projectId, 150)
    ) {
      existingRow = index + 1;
      break;
    }
  }

  if (existingRow > 0) {
    updateLeadRow_(sheet, existingRow, headers, {
      email: email,
      projectId: cleanString_(leadData.projectId, 150),
      projectName: cleanString_(leadData.projectName, 180),
      consent: Boolean(leadData.consent),
      status: cleanString_(leadData.status || 'PROSPECT', 50),
      source: cleanString_(leadData.source || 'Pitch Studio', 100),
      lastAction: cleanString_(leadData.lastAction || 'Projet mis à jour', 150),
      updatedAt: now
    });

    return {
      created: false,
      email: email
    };
  }

  const leadId =
    'AG24-LEAD-' +
    Utilities.getUuid()
      .replace(/-/g, '')
      .slice(0, 12)
      .toUpperCase();

  sheet.appendRow([
    leadId,
    email,
    cleanString_(leadData.projectId, 150),
    cleanString_(leadData.projectName, 180),
    Boolean(leadData.consent),
    cleanString_(leadData.status || 'PROSPECT', 50),
    cleanString_(leadData.source || 'Pitch Studio', 100),
    cleanString_(leadData.lastAction || 'Projet créé', 150),
    now,
    now
  ]);

  return {
    created: true,
    leadId: leadId,
    email: email
  };
}

function updateLeadRow_(sheet, rowNumber, headers, updates) {
  Object.keys(updates).forEach(function(key) {
    const columnIndex = headers.indexOf(key);

    if (columnIndex < 0) return;

    sheet
      .getRange(rowNumber, columnIndex + 1)
      .setValue(updates[key]);
  });
}

function normalizeLeadEmail_(email) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();

  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);

  return valid ? normalized : '';
}
function saveLeadEmail_(leadData) {
  leadData = leadData || {};

  const email = normalizeLeadEmail_(leadData.email);

  if (!email) {
    throw new Error('Adresse e-mail du prospect invalide.');
  }

  const sheet = setupLeadsSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values.length ? values[0] : [];

  const emailColumn = headers.indexOf('email');
  const projectIdColumn = headers.indexOf('projectId');

  const projectId = cleanString_(leadData.projectId, 150);
  const now = nowIso_();

  let existingRow = -1;

  for (let index = 1; index < values.length; index++) {
    const rowEmail = normalizeLeadEmail_(
      emailColumn >= 0 ? values[index][emailColumn] : ''
    );

    const rowProjectId = cleanString_(
      projectIdColumn >= 0 ? values[index][projectIdColumn] : '',
      150
    );

    if (rowEmail === email && rowProjectId === projectId) {
      existingRow = index + 1;
      break;
    }
  }

  const leadValues = {
    email: email,
    projectId: projectId,
    projectName: cleanString_(leadData.projectName, 180),
    consent: Boolean(leadData.consent),
    status: cleanString_(
      leadData.status || 'QUESTIONNAIRE_EN_COURS',
      50
    ),
    source: cleanString_(
      leadData.source || 'AfriGreen24 Pitch Studio',
      100
    ),
    lastAction: cleanString_(
      leadData.lastAction || 'Création du projet',
      150
    ),
    updatedAt: now
  };

  if (existingRow > 0) {
    updateLeadRow_(sheet, existingRow, headers, leadValues);

    return {
      created: false,
      email: email
    };
  }

  const leadId =
    'AG24-LEAD-' +
    Utilities.getUuid()
      .replace(/-/g, '')
      .slice(0, 12)
      .toUpperCase();

  sheet.appendRow([
    leadId,
    email,
    projectId,
    leadValues.projectName,
    leadValues.consent,
    leadValues.status,
    leadValues.source,
    leadValues.lastAction,
    now,
    now
  ]);

  return {
    created: true,
    leadId: leadId,
    email: email
  };
}

function updateLeadRow_(sheet, rowNumber, headers, updates) {
  Object.keys(updates).forEach(function(key) {
    const columnIndex = headers.indexOf(key);

    if (columnIndex < 0) return;

    sheet
      .getRange(rowNumber, columnIndex + 1)
      .setValue(updates[key]);
  });
}

function normalizeLeadEmail_(email) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();

  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);

  return valid ? normalized : '';
}