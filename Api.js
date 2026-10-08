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
    const paymentAccessCode = cleanString_(
      payload.paymentAccessCode,
      40
    ).toUpperCase();

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

    if (!paymentAccessCode) {
      throw new Error('Veuillez saisir votre code d’accès au Pitch Deck.');
    }

    return withScriptLock_(function() {
      const paymentAccess = verifyPitchAccess_(
        email,
        paymentAccessCode
      );

      if (!paymentAccess.valid) {
        throw new Error(paymentAccess.message);
      }

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
        codeHash: hashValue_(accessCode),
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

      consumePitchAccessForProject_(
        email,
        paymentAccessCode,
        projectId
      );

      if (typeof saveLeadEmail_ === 'function') {
        saveLeadEmail_({
          email: email,
          projectId: projectId,
          projectName: projectName,
          consent: true,
          status: 'QUESTIONNAIRE_EN_COURS',
          source: 'AfriGreen24 Pitch Studio',
          lastAction: 'Accès payé et projet créé'
        });
      }

      const resumeUrl = createResumeUrl_(projectId, token);
      logEvent_(projectId, 'PROJECT_CREATED', {
        email: email,
        paymentId: paymentAccess.paymentId || ''
      });
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
      project.data[sectionId] = sanitizeObject_(payload.values || {});
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

function apiGenerateStandardDeck(projectId, token) {
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

      const content = buildStandardDeckContent_(project);
      const presentation = generateStandardPresentation_(project, content);
      const pdf = exportPresentationToPdf_(project, presentation);
      project.slidesUrl = presentation.slidesUrl;
      project.pdfUrl = pdf.pdfUrl;
      project.status = AG24_CONFIG.STATUS.GENERATED;
      project = updateProject_(project);
      logEvent_(project.projectId, 'DECK_GENERATED', {
        score: project.score.total,
        slidesUrl: project.slidesUrl,
        pdfUrl: project.pdfUrl
      });
      sendDeckGeneratedEmail_(project);
      return { project: publicProject_(project) };
    });
  });
}
