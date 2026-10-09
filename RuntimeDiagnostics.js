/**
 * Read-only editor diagnostics, adapted from user supplied RuntimeDiagnostics.js.
 * Private names keep it out of google.script.run.
 */
function TEST_PITCH_STUDIO_GLOBAL_V2_() {
  const dependencies={
    contentBuilder:typeof buildStandardDeckContent_==='function',
    slidesGenerator:typeof generateStandardPresentation_==='function',
    pdfExporter:typeof exportPresentationToPdf_==='function',
    scoring:typeof calculatePitchReadinessScore_==='function',
    rules:typeof runPitchRules_==='function',
    storage:typeof findProject_==='function',
    connector:typeof pitchAgConnectorStatus_==='function'
  };
  const output={build:'AG24-PITCH-MAIN-20261009',appVersion:String(AG24_CONFIG.APP_VERSION||''),
    timestamp:new Date().toISOString(),dependencies:dependencies,installation:null,
    contentBuilder:null,connector:null,success:false};
  try { output.installation={installed:Boolean(getInstallationStatus_().installed)}; }
  catch(e) {output.installation={installed:false,errorCode:'CHECK_UNAVAILABLE'};}
  try {
    const data=typeof getDemoData_==='function'?getDemoData_():
      {identity:{projectName:'Diagnostic test'}};
    const slides=buildStandardDeckContent_({
      projectName:'Diagnostic test',email:'diagnostic@example.invalid',data:data});
    output.contentBuilder={isArray:Array.isArray(slides),
      slideCount:Array.isArray(slides)?slides.length:0,
      hasUndefinedText:/undefined/i.test(JSON.stringify(slides))};
  } catch(e){output.contentBuilder={errorCode:'CONTENT_CHECK_FAILED'};}
  try {output.connector=pitchAgConnectorStatus_();}
  catch(e){output.connector={errorCode:'CONNECTOR_CHECK_FAILED'};}
  output.success=Object.keys(dependencies).every(function(k){return dependencies[k];}) &&
    output.contentBuilder.slideCount===12 && !output.contentBuilder.hasUndefinedText;
  console.log(JSON.stringify(output));
  return output;
}
