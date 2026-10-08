function sendProjectCreatedEmail_(project, accessCode, resumeUrl) {
  if (!isValidEmail_(project.email)) return;
  const subject = 'Votre espace Pitch Deck AfriGreen24';
  const body = [
    'Bonjour,',
    '',
    'Votre espace projet a été créé.',
    'Projet : ' + project.projectName,
    'Identifiant : ' + project.projectId,
    'Code de reprise : ' + accessCode,
    '',
    resumeUrl ? 'Lien privé : ' + resumeUrl : '',
    '',
    'Conservez ce message. Le lien privé et le code permettent de reprendre votre travail.',
    '',
    'AfriGreen24'
  ].filter(function(line) { return line !== ''; }).join('\n');
  try {
    MailApp.sendEmail(project.email, subject, body);
  } catch (error) {
    console.warn('E-mail de création non envoyé : ' + error.message);
  }
}

function sendDeckGeneratedEmail_(project) {
  if (!isValidEmail_(project.email)) return;
  const subject = 'Votre Pitch Deck Standard est prêt';
  const body = [
    'Bonjour,',
    '',
    'Votre Pitch Deck Standard AfriGreen24 a été généré.',
    'Projet : ' + project.projectName,
    'Score de préparation : ' + ((project.score || {}).total || 0) + '/100',
    '',
    'Google Slides : ' + (project.slidesUrl || ''),
    'PDF : ' + (project.pdfUrl || ''),
    '',
    'Relisez les informations et corrigez toute donnée inexacte avant de présenter le document à un investisseur.',
    '',
    'AfriGreen24'
  ].join('\n');
  try {
    MailApp.sendEmail(project.email, subject, body);
  } catch (error) {
    console.warn('E-mail de génération non envoyé : ' + error.message);
  }
}
