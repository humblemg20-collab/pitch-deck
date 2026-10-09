function assertProjectToken_(project, token) {
  if (!project || !token || project.tokenHash !== hashValue_(token)) {
    throw new Error('Lien de projet invalide ou expiré.');
  }
  return true;
}

function assertResumeCredentials_(project, email, accessCode) {
  // The caller already holds a script lock; CacheService limits online guessing.
  // Codes in legacy projects remain valid and are upgraded upon successful use.
  const normalizedEmail = cleanEmail_(email);
  const key = 'pd_resume_' + hashValue_(project.projectId + '|' + normalizedEmail)
    .slice(0, 48);
  const cache = CacheService.getScriptCache();
  const attempts = Number(cache.get(key) || 0);
  if (attempts >= 5) {
    throw new Error('Trop de tentatives. Réessayez dans 15 minutes.');
  }
  const code = cleanString_(accessCode, 20);
  const codeHash = hashValue_(project.projectId + '|' + code);
  const legacyHash = hashValue_(code);
  const valid = normalizedEmail === cleanEmail_(project.email) &&
    (project.codeHash === codeHash || project.codeHash === legacyHash);
  if (!valid) {
    cache.put(key, String(attempts + 1), 15 * 60);
    logEvent_(project.projectId, 'RESUME_CREDENTIALS_REJECTED', {});
    throw new Error('Identifiants de reprise incorrects.');
  }
  cache.remove(key);
  return true;
}

function enforceCreationLimit_(email) {
  const rows = getProjectsSheet_().getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rowsToday = rows.slice(1).filter(function(row) {
    const created = row[10] ? new Date(row[10]) : new Date(0);
    return created >= today;
  });
  // Protect the anonymous, free service from rotating-email quota exhaustion.
  // Deliberate operational cap: changes require a reviewed code/config change.
  const maxDaily = AG24_CONFIG.MAX_TOTAL_PROJECTS_PER_DAY;
  if (rowsToday.length >= maxDaily) {
    throw new Error('Capacité quotidienne atteinte. Veuillez réessayer demain.');
  }
  const count = rowsToday.filter(function(row) {
    return cleanEmail_(row[1]) === cleanEmail_(email);
  }).length;
  if (count >= AG24_CONFIG.MAX_PROJECTS_PER_EMAIL_PER_DAY) {
    throw new Error('La limite quotidienne de création de projets a été atteinte pour cette adresse e-mail.');
  }
}

function createResumeUrl_(projectId, token) {
  const base = getPrivateConfig_().webAppUrl || ScriptApp.getService().getUrl() || '';
  if (!base) return '';
  // Fragment content is not sent to web servers. Keep query-style links
  // supported by the client for historical projects.
  return base.split('#')[0].split('?')[0] + '#project=' +
    encodeURIComponent(projectId) + '&token=' + encodeURIComponent(token);
}

function publicProject_(project) {
  return {
    projectId: project.projectId,
    email: project.email,
    projectName: project.projectName,
    data: project.data,
    progress: project.progress,
    score: project.score,
    alerts: project.alerts,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    slidesUrl: project.slidesUrl,
    pdfUrl: project.pdfUrl
  };
}
