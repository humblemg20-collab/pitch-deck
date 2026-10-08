function assertProjectToken_(project, token) {
  if (!project || !token || project.tokenHash !== hashValue_(token)) {
    throw new Error('Lien de projet invalide ou expiré.');
  }
  return true;
}

function assertResumeCredentials_(project, email, accessCode) {
  const emailMatches = cleanEmail_(project.email) === cleanEmail_(email);
  const codeMatches = project.codeHash === hashValue_(cleanString_(accessCode, 20));
  if (!emailMatches || !codeMatches) {
    throw new Error('Identifiants de reprise incorrects.');
  }
  return true;
}

function enforceCreationLimit_(email) {
  const rows = getProjectsSheet_().getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = rows.slice(1).filter(function(row) {
    const sameEmail = cleanEmail_(row[1]) === cleanEmail_(email);
    const created = row[10] ? new Date(row[10]) : new Date(0);
    return sameEmail && created >= today;
  }).length;
  if (count >= AG24_CONFIG.MAX_PROJECTS_PER_EMAIL_PER_DAY) {
    throw new Error('La limite quotidienne de création de projets a été atteinte pour cette adresse e-mail.');
  }
}

function createResumeUrl_(projectId, token) {
  const base = getPrivateConfig_().webAppUrl || ScriptApp.getService().getUrl() || '';
  if (!base) return '';
  return base + '?project=' + encodeURIComponent(projectId) + '&token=' + encodeURIComponent(token);
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
