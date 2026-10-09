function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.initialState = JSON.stringify({
    projectId: cleanString_(e && e.parameter ? e.parameter.project : '', 100),
    token: cleanString_(e && e.parameter ? e.parameter.token : '', 100)
  });
  return template.evaluate()
    .setTitle(AG24_CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(
  HtmlService.XFrameOptionsMode.ALLOWALL
);
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Test rapide depuis l'éditeur Apps Script après installation.
 */
function testInstallation_() {
  const status = getInstallationStatus_();
  if (!status.installed) throw new Error('Exécutez setupAfriGreen24PitchDeck_() avant ce test.');
  return {
    status: status,
    schemaSections: getQuestionnaireSchema_().length,
    timestamp: nowIso_()
  };
}
