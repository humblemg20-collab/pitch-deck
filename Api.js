function apiBootstrap() {
  return safeApi_(function() {
    requireSetup_();
    return {
      config: getPublicConfig_(),
      schema: getQuestionnaireSchema_()
    };
  });
}

function apiCreateProject(input) {
  return safeApi_(function() {
    const payload = sanitizeObject_(input || {});
    const email = cleanEmail_(payload.email);
    const projectName = cleanString_(payload.projectName, 180);
    if (!isValidEmail_(email)) {
      throw new Error('Veuillez saisir une adresse e-mail valide.');
    }

    if (projectName.length < 2) {
      throw new Error('Veuillez saisir le nom du projet.');
    }

    if (!normalizeBoolean_(payload.consent)) {
      throw new Error(
        'Vous devez accepter les conditions de traitement des informations.'
      );
    }

    return withScriptLock_(function() {
      enforceCreationLimit_(email);

      const token = randomToken_();
      const accessCode = randomAccessCode_();
      const projectId = createProjectId_();
      const createdAt = nowIso_();
      const data = {
        identity: { projectName: projectName },
        review: { contactEmail: email }
      };

      const project = insertProject_({
        projectId: projectId,
        email: email,
        projectName: projectName,
        tokenHash: hashValue_(token),
        codeHash: hashValue_(projectId + '|' + accessCode),
        data: data,
        progress: calculateProgress_(data),
        score: null,
        alerts: [],
        status: AG24_CONFIG.STATUS.DRAFT,
        createdAt: createdAt,
        updatedAt: createdAt,
        folderId: '',
        slidesUrl: '',
        pdfUrl: ''
      });

      if (typeof saveLeadEmail_ === 'function') {
        try { saveLeadEmail_({
          email: email,
          projectId: projectId,
          projectName: projectName,
          consent: true,
          status: 'QUESTIONNAIRE_EN_COURS',
          source: 'AfriGreen24 Pitch Studio',
          lastAction: 'Projet Pitch Studio créé gratuitement'
        }); } catch (crmError) {
          console.error('LEAD_SYNC_NONBLOCKING', crmError);
          logEvent_(projectId, 'LEAD_SYNC_FAILED', {});
        }
      }

      const resumeUrl = createResumeUrl_(projectId, token);
      logEvent_(projectId, 'PROJECT_CREATED', { creationMode: 'FREE' });
      sendProjectCreatedEmail_(project, accessCode, resumeUrl);

      return {
        project: publicProject_(project),
        token: token,
        accessCode: accessCode,
        resumeUrl: resumeUrl
      };
    });
  });
}

function apiLoadProject(projectId, token) {
  return safeApi_(function() {
    const project = findProject_(cleanString_(projectId, 100));
    if (!project) throw new Error('Projet introuvable.');
    assertProjectToken_(project, token);
    return { project: publicProject_(project) };
  });
}

function apiResumeProject(input) {
  return safeApi_(function() {
    const payload = sanitizeObject_(input || {});
    return withScriptLock_(function() {
      const project = findProject_(cleanString_(payload.projectId, 100));
      if (!project) throw new Error('Projet introuvable.');
      assertResumeCredentials_(project, payload.email, payload.accessCode);
      // Upgrade pre-existing six-digit legacy hashes after a successful resume.
      project.codeHash = hashValue_(project.projectId + '|' +
        cleanString_(payload.accessCode, 20));
      const token = randomToken_();
      project.tokenHash = hashValue_(token);
      updateProject_(project);
      const resumeUrl = createResumeUrl_(project.projectId, token);
      logEvent_(project.projectId, 'PROJECT_RESUMED', {});
      return {
        project: publicProject_(project),
        token: token,
        resumeUrl: resumeUrl
      };
    });
  });
}

function apiSaveSection(input) {
  return safeApi_(function() {
    const payload = sanitizeObject_(input || {});
    const projectId = cleanString_(payload.projectId, 100);
    const token = cleanString_(payload.token, 100);
    const sectionId = cleanString_(payload.sectionId, 80);
    const schema = getQuestionnaireSchema_();
    if (!schema.some(function(section) { return section.id === sectionId; })) throw new Error('Section inconnue.');

    return withScriptLock_(function() {
      const project = findProject_(projectId);
      if (!project) throw new Error('Projet introuvable.');
      assertProjectToken_(project, token);
      const nextSection = sanitizeObject_(payload.values || {});
      const changed = JSON.stringify(project.data[sectionId] || {}) !==
        JSON.stringify(nextSection);
      const priorSection=project.data[sectionId]||{};
      project.data[sectionId] = nextSection;
      // Any later correction of canonical answers invalidates the owner's
      // previous final-review attestation. The owner must review again.
      if(changed && project.data.review){
        if(sectionId!=='review'){
          project.data.review.investorSubmissionApproved=false;
        } else {
          // Editing contact/details in the same save cannot silently reuse an
          // attestation given for the previous version of that information.
          const before=Object.assign({},nextSection);
          const prior=Object.assign({},priorSection);
          delete before.investorSubmissionApproved;
          delete prior.investorSubmissionApproved;
          if(JSON.stringify(before)!==JSON.stringify(prior)){
            project.data.review.investorSubmissionApproved=false;
          }
        }
      }
      // A changed answer invalidates the old deck, but never deletes its archived files.
      if (changed && (project.slidesUrl || project.pdfUrl)) {
        project.slidesUrl = '';
        project.pdfUrl = '';
        logEvent_(projectId, 'DECK_INVALIDATED_BY_EDIT', { sectionId: sectionId });
      }
      if (sectionId === 'identity' && project.data.identity.projectName) {
        project.projectName = cleanString_(project.data.identity.projectName, 180);
      }
      project.progress = calculateProgress_(project.data);
      project.alerts = runPitchRules_(project.data);
      project.score = calculatePitchReadinessScore_(project.data, project.alerts);
      project.status = project.progress.percent === 100 ? AG24_CONFIG.STATUS.READY : AG24_CONFIG.STATUS.DRAFT;
      const updated = updateProject_(project);
      logEvent_(projectId, 'SECTION_SAVED', { sectionId: sectionId, progress: updated.progress.percent });
      return {
        project: publicProject_(updated),
        encouragement: (schema.find(function(section) { return section.id === sectionId; }) || {}).encouragement || 'Vos réponses sont enregistrées.'
      };
    });
  });
}

function apiAnalyzeProject(projectId, token) {
  return safeApi_(function() {
    return withScriptLock_(function() {
      const project = findProject_(cleanString_(projectId, 100));
      if (!project) throw new Error('Projet introuvable.');
      assertProjectToken_(project, token);
      project.progress = calculateProgress_(project.data);
      project.alerts = runPitchRules_(project.data);
      project.score = calculatePitchReadinessScore_(project.data, project.alerts);
      project.status = project.progress.percent === 100 ? AG24_CONFIG.STATUS.READY : AG24_CONFIG.STATUS.DRAFT;
      const updated = updateProject_(project);
      logEvent_(project.projectId, 'PROJECT_ANALYZED', { score: updated.score.total });
      return { project: publicProject_(updated) };
    });
  });
}

function apiEvaluatePitchSubmission(projectId, token) {
  return safeApi_(function(){
    const project=findProject_(cleanString_(projectId,100));
    if(!project)throw new Error('Projet introuvable.');
    assertProjectToken_(project,token);
    return AG24_SUBMISSION_gate_(project);
  });
}

function apiGenerateSubmissionDeck(projectId, token) {
  return AG24_API_generateDeck_(projectId,token,'SUBMISSION');
}
function apiGenerateStandardDeck(projectId, token) {
  return AG24_API_generateDeck_(projectId,token,'STANDARD');
}
function AG24_API_generateDeck_(projectId,token,mode) {

  return safeApi_(function() {
    return withScriptLock_(function() {
      let project = findProject_(cleanString_(projectId, 100));
      if (!project) throw new Error('Projet introuvable.');
      assertProjectToken_(project, token);
      project.progress = calculateProgress_(project.data);
      project.alerts = runPitchRules_(project.data);
      project.score = calculatePitchReadinessScore_(project.data, project.alerts);

      const declaration = normalizeBoolean_(getByPath_(project.data, 'review.declaration'));
      if (!declaration) throw new Error('Confirmez la déclaration de sincérité avant de générer le deck.');
      if (!cleanString_(project.projectName)) throw new Error('Le nom du projet est obligatoire.');
      const presentationQuality = AG24_PITCH_quality_(project);
      // Recheck after acquiring the project lock. A disabled UI button is
      // never sufficient authorization for an investor-ready export.
      const submissionGate=mode==='SUBMISSION'?
        AG24_SUBMISSION_assertReady_(project):null;
      logEvent_(project.projectId,'PRESENTATION_QUALITY_GATE',{
        state:presentationQuality.state,issueCodes:presentationQuality.issues.map(function(item){return item.code;})
      });

      let presentation = null;
      let pdf = null;
      try {
        // A single generator creates Slides; exactly one exporter creates the PDF.
        presentation = generateStandardPresentation_(project,{submission:mode==='SUBMISSION'});
        pdf = exportPresentationToPdf_(project, presentation);
        project.slidesUrl = presentation.slidesUrl;
        project.pdfUrl = pdf.pdfUrl;
        project.status = AG24_CONFIG.STATUS.GENERATED;
        project = updateProject_(project);
      } catch (error) {
        // Keep previously published URLs unchanged when a new run fails.
        [pdf && pdf.pdfId, presentation && presentation.presentationId]
          .filter(Boolean)
          .forEach(function(fileId) {
            try { DriveApp.getFileById(fileId).setTrashed(true); }
            catch (cleanupError) { console.error('GENERATION_ROLLBACK_FAILED', cleanupError); }
          });
        logEvent_(project.projectId, 'DECK_GENERATION_FAILED', {
          error: String(error && error.message || error).slice(0, 300)
        });
        throw error;
      }
      logEvent_(project.projectId, 'DECK_GENERATED', {
        score: project.score.total,
        mode:mode,submissionGate:submissionGate&&submissionGate.version||'',
        slidesUrl: project.slidesUrl,
        pdfUrl: project.pdfUrl
      });
      sendDeckGeneratedEmail_(project);
      return { project: publicProject_(project),presentationQuality:presentationQuality,mode:mode,submissionGate:submissionGate };
    });
  });
}
