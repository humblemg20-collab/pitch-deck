/**
 * À exécuter une seule fois depuis l'éditeur Apps Script.
 * Crée la base Sheets et le dossier Drive racine.
 */
function setupAfriGreen24PitchDeck() {
  return withScriptLock_(function() {
    const props = PropertiesService.getScriptProperties();
    const current = props.getProperties();

    let spreadsheet;
    if (current.AG24_DATABASE_SPREADSHEET_ID) {
      spreadsheet = SpreadsheetApp.openById(current.AG24_DATABASE_SPREADSHEET_ID);
    } else {
      spreadsheet = SpreadsheetApp.create('AfriGreen24_PitchDeck_Database');
      props.setProperty('AG24_DATABASE_SPREADSHEET_ID', spreadsheet.getId());
    }

    ensureSheet_(spreadsheet, AG24_CONFIG.SHEETS.PROJECTS, AG24_CONFIG.PROJECT_HEADERS);
    ensureSheet_(spreadsheet, AG24_CONFIG.SHEETS.EVENTS, AG24_CONFIG.EVENT_HEADERS);
    ensureSheet_(spreadsheet, AG24_CONFIG.SHEETS.SETTINGS, ['key', 'value', 'updatedAt']);
    ensureSheet_(spreadsheet, AG24_ASSETS_V1.SHEET, AG24_ASSETS_V1.HEADERS);
    ensureSheet_(spreadsheet, AG24_PITCH_IMPORT.SHEET, AG24_PITCH_IMPORT.HEADERS);

    let rootFolder;
    if (current.AG24_ROOT_FOLDER_ID) {
      rootFolder = DriveApp.getFolderById(current.AG24_ROOT_FOLDER_ID);
    } else {
      rootFolder = DriveApp.createFolder('AfriGreen24 - Pitch Decks');
      props.setProperty('AG24_ROOT_FOLDER_ID', rootFolder.getId());
    }

    const webAppUrl = ScriptApp.getService().getUrl() || '';
    if (webAppUrl) props.setProperty('AG24_WEB_APP_URL', webAppUrl);
    const ownerEmail = Session.getEffectiveUser().getEmail() || '';
    if (ownerEmail) props.setProperty('AG24_OWNER_EMAIL', ownerEmail);

    writeSetting_('APP_VERSION', AG24_CONFIG.APP_VERSION);
    writeSetting_('LAST_SETUP_AT', nowIso_());

    return {
      success: true,
      spreadsheetId: spreadsheet.getId(),
      spreadsheetUrl: spreadsheet.getUrl(),
      rootFolderId: rootFolder.getId(),
      rootFolderUrl: rootFolder.getUrl(),
      webAppUrl: webAppUrl,
      nextStep: 'Déployez le projet comme application Web, puis ouvrez son URL.'
    };
  });
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const shouldWrite = headers.some(function(header, index) { return firstRow[index] !== header; });
  if (shouldWrite) {
    if (sheet.getLastRow() > 0) {
      throw new Error('Schéma incompatible pour ' + name + '. Migration explicite requise.');
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

function writeSetting_(key, value) {
  const config = requireSetup_();
  const sheet = SpreadsheetApp.openById(config.databaseSpreadsheetId).getSheetByName(AG24_CONFIG.SHEETS.SETTINGS);
  const rows = sheet.getDataRange().getValues();
  const rowIndex = rows.findIndex(function(row, index) { return index > 0 && row[0] === key; });
  const row = [key, String(value), nowIso_()];
  if (rowIndex >= 1) sheet.getRange(rowIndex + 1, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
}

function setAfriGreen24SupportEmail(email) {
  if (email && !isValidEmail_(email)) throw new Error('Adresse e-mail invalide.');
  PropertiesService.getScriptProperties().setProperty('AG24_SUPPORT_EMAIL', cleanEmail_(email));
  return { success: true, supportEmail: cleanEmail_(email) };
}

function getInstallationStatus() {
  const config = getPrivateConfig_();
  return {
    installed: Boolean(config.databaseSpreadsheetId && config.rootFolderId),
    databaseSpreadsheetId: config.databaseSpreadsheetId,
    rootFolderId: config.rootFolderId,
    webAppUrl: config.webAppUrl,
    ownerEmail: config.ownerEmail,
    supportEmail: config.supportEmail
  };
}
function setupLeadsSheet_() {
  const spreadsheet = getAg24LeadsSpreadsheet_();

  let sheet = spreadsheet.getSheetByName('AG24_Leads');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('AG24_Leads');
  }

  const headers = [
    'leadId',
    'email',
    'projectId',
    'projectName',
    'consent',
    'status',
    'source',
    'lastAction',
    'createdAt',
    'updatedAt'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}function getAg24LeadsSpreadsheet_() {
  const spreadsheetId =
    AG24_CONFIG.SPREADSHEET_ID ||
    AG24_CONFIG.DATABASE_SPREADSHEET_ID ||
    AG24_CONFIG.DATA_SPREADSHEET_ID ||
    '';

  if (!spreadsheetId) {
    throw new Error(
      'Ajoutez SPREADSHEET_ID dans AG24_CONFIG pour enregistrer les prospects.'
    );
  }

  return SpreadsheetApp.openById(spreadsheetId);
}
function installLeadsSheet() {
  const sheet = setupLeadsSheet_();

  return {
    ok: true,
    sheetName: sheet.getName()
  };
}