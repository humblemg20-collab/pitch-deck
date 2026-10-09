/**
 * Configuration centrale AfriGreen24 Pitch Deck Standard.
 * Les identifiants créés par setupAfriGreen24PitchDeck_() sont enregistrés
 * dans les propriétés du script, pas dans le code.
 */
const AG24_CONFIG = Object.freeze({
  APP_NAME: 'AfriGreen24 Pitch Studio',
  SPREADSHEET_ID: '1OgfdXJ3KRrxbSvqKhKOYGka5wfsKTurIpsfAxFD-3Zo',
  APP_VERSION: '1.0.0',
  BRAND_NAME: 'AfriGreen24',
  
LOGO_FILE_ID: 'https://drive.google.com/file/d/1Y8263hmQecuIZQMsTCZTKd8ReAKuBa3T/view?usp=sharing' ,
  DEFAULT_TIMEZONE: 'Africa/Dakar',
  DEFAULT_CURRENCY: 'FCFA',
  SUPPORT_EMAIL: '',
  PROJECT_PREFIX: 'AG24-PD',
  MAX_PROJECTS_PER_EMAIL_PER_DAY: 3,
  MAX_TOTAL_PROJECTS_PER_DAY: 250,
  MAX_TEXT_LENGTH: 6000,
  TOKEN_BYTES: 24,
  ACCESS_CODE_LENGTH: 6,
  SHEETS: Object.freeze({
    PROJECTS: 'Projects',
    EVENTS: 'Events',
    SETTINGS: 'Settings'
  }),
  PROJECT_HEADERS: Object.freeze([
    'projectId',
    'email',
    'projectName',
    'tokenHash',
    'codeHash',
    'dataJson',
    'progressJson',
    'scoreJson',
    'alertsJson',
    'status',
    'createdAt',
    'updatedAt',
    'folderId',
    'slidesUrl',
    'pdfUrl'
  ]),
  EVENT_HEADERS: Object.freeze([
    'timestamp',
    'projectId',
    'eventType',
    'detailsJson'
  ]),
  STATUS: Object.freeze({
    DRAFT: 'DRAFT',
    READY: 'READY',
    GENERATED: 'GENERATED'
  }),
  ALERT_LEVELS: Object.freeze({
    INFO: 'information',
    IMPROVEMENT: 'amelioration',
    IMPORTANT: 'importante',
    CRITICAL: 'critique'
  }),
  THEME: Object.freeze({
    NAVY: '#071A2B',
    NAVY_LIGHT: '#0E2942',
    EMERALD: '#18B77A',
    GOLD: '#C9A45C',
    OFF_WHITE: '#F7F4EC',
    WHITE: '#FFFFFF',
    MUTED: '#B9C5D0',
    DARK_TEXT: '#18212A'
  })
});

function getPrivateConfig_() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return {
    databaseSpreadsheetId: props.AG24_DATABASE_SPREADSHEET_ID || '',
    rootFolderId: props.AG24_ROOT_FOLDER_ID || '',
    webAppUrl: props.AG24_WEB_APP_URL || ScriptApp.getService().getUrl() || '',
    ownerEmail: props.AG24_OWNER_EMAIL || Session.getEffectiveUser().getEmail() || '',
    supportEmail: props.AG24_SUPPORT_EMAIL || AG24_CONFIG.SUPPORT_EMAIL || ''
  };
}

function getPublicConfig_() {
  const privateConfig = getPrivateConfig_();
  return {
    appName: AG24_CONFIG.APP_NAME,
    appVersion: AG24_CONFIG.APP_VERSION,
    brandName: AG24_CONFIG.BRAND_NAME,
    defaultCurrency: AG24_CONFIG.DEFAULT_CURRENCY,
    supportEmail: privateConfig.supportEmail,
    webAppUrl: privateConfig.webAppUrl,
    maxTextLength: AG24_CONFIG.MAX_TEXT_LENGTH
  };
}
