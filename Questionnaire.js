function getQuestionnaireSchema_() {
  return [
    {
      id: 'identity',
      title: 'Votre projet',
      subtitle: 'Posons les bases de votre histoire entrepreneuriale.',
      encouragement: 'Votre projet possède maintenant une identité claire.',
      fields: [
        field_('projectName', 'Nom du projet ou de l’entreprise', 'text', true, 'Exemple : SolarFresh Africa', 'Le nom affiché sur la couverture du Pitch Deck.'),
        field_('tagline', 'Votre projet en une phrase', 'textarea', true, 'Exemple : Une chaîne du froid solaire accessible aux petits producteurs.', 'Une phrase courte : cible + solution + bénéfice.', { maxLength: 180 }),
        field_('sector', 'Secteur principal', 'select', true, '', '', {
          options: ['Agriculture', 'Agroalimentaire', 'Énergie', 'Climat', 'Technologie', 'Fintech', 'Santé', 'Éducation', 'Industrie', 'Commerce', 'Logistique', 'Immobilier', 'Entreprise sociale', 'Association / impact', 'Autre']
        }),
        field_('country', 'Pays principal d’activité', 'text', true, 'Exemple : Sénégal', 'Indiquez le pays où le projet opère ou commencera.'),
        field_('stage', 'Stade actuel du projet', 'select', true, '', '', {
          options: ['Idée structurée', 'Prototype', 'Pilote', 'Lancement commercial', 'Premiers revenus', 'Croissance', 'PME établie']
        }),
        field_('website', 'Site web ou page de présentation', 'url', false, 'https://', 'Facultatif, mais utile pour renforcer la crédibilité.')
      ]
    },
    {
      id: 'problem',
      title: 'Le problème',
      subtitle: 'Un investisseur doit comprendre rapidement pourquoi ce problème mérite une solution.',
      encouragement: 'Le besoin auquel vous répondez est désormais mieux défini.',
      fields: [
        field_('targetUser', 'Qui rencontre précisément ce problème ?', 'textarea', true, 'Décrivez le profil, le secteur, la zone et la situation de la personne ou de l’organisation concernée.', 'Évitez les réponses comme « tout le monde ».', { maxLength: 800 }),
        field_('problemDescription', 'Quel problème concret rencontrez-vous ?', 'textarea', true, 'Décrivez la situation actuelle, sa fréquence et pourquoi les solutions existantes ne suffisent pas.', 'Restez factuel et spécifique.', { maxLength: 1400 }),
        field_('consequences', 'Quelles sont les conséquences de ce problème ?', 'textarea', true, 'Pertes financières, temps perdu, baisse de productivité, risques, exclusion, impact environnemental…', 'Expliquez ce que coûte l’inaction.', { maxLength: 1000 }),
        field_('problemEvidence', 'Quelle preuve confirme l’existence du problème ?', 'textarea', false, 'Enquête, entretiens clients, étude, statistique sourcée, observation terrain…', 'Une preuve renforce fortement la crédibilité.', { maxLength: 1000 })
      ]
    },
    {
      id: 'solution',
      title: 'Votre solution',
      subtitle: 'Montrez comment votre offre transforme concrètement la situation.',
      encouragement: 'Votre proposition de valeur est maintenant plus facile à comprendre.',
      fields: [
        field_('solutionDescription', 'Quelle solution proposez-vous ?', 'textarea', true, 'Décrivez votre produit ou service avec des mots simples.', 'Évitez le jargon technique inutile.', { maxLength: 1400 }),
        field_('valueProposition', 'Quel bénéfice principal apportez-vous au client ?', 'textarea', true, 'Exemple : réduire les pertes après récolte de 30 % tout en diminuant les coûts énergétiques.', 'Le bénéfice doit être observable ou mesurable.', { maxLength: 700 }),
        field_('howItWorks', 'Comment la solution fonctionne-t-elle ?', 'textarea', true, 'Présentez les 3 à 5 étapes du fonctionnement ou du parcours client.', 'Une étape par ligne facilite la mise en page.', { maxLength: 1200 }),
        field_('currentStatus', 'Qu’avez-vous déjà construit ou testé ?', 'textarea', false, 'Prototype, démonstrateur, pilote, service opérationnel, version bêta…', 'Distinguez ce qui existe de ce qui est prévu.', { maxLength: 900 })
      ]
    },
    {
      id: 'market',
      title: 'Marché et concurrence',
      subtitle: 'Définissez qui paie, où se trouve l’opportunité et pourquoi votre approche est différente.',
      encouragement: 'Votre opportunité de marché est désormais plus lisible.',
      fields: [
        field_('payingCustomer', 'Qui paie réellement pour votre solution ?', 'textarea', true, 'Client final, entreprise, administration, coopérative, distributeur…', 'L’utilisateur et le client payeur peuvent être différents.', { maxLength: 700 }),
        field_('geography', 'Quelle zone géographique ciblez-vous en priorité ?', 'textarea', true, 'Ville, région, pays ou corridor commercial prioritaire.', 'Commencez par un marché accessible.', { maxLength: 600 }),
        field_('marketEstimate', 'Comment estimez-vous la taille ou le potentiel du marché ?', 'textarea', false, 'Nombre de clients accessibles, dépenses annuelles, volume de transactions…', 'Une estimation simple et vérifiable vaut mieux qu’un grand chiffre vague.', { maxLength: 900 }),
        field_('marketSource', 'Quelle est la source de cette estimation ?', 'textarea', false, 'Lien, nom de l’étude, organisme, année, calcul interne expliqué…', 'Ne présentez jamais une taille de marché non sourcée comme un fait.', { maxLength: 900 }),
        field_('competitors', 'Quelles solutions les clients utilisent-ils aujourd’hui ?', 'textarea', true, 'Un concurrent ou une alternative par ligne.', 'Incluez aussi les solutions informelles et le statu quo.', { maxLength: 1000 }),
        field_('advantage', 'Pourquoi votre solution sera-t-elle préférée ?', 'textarea', true, 'Prix, accès, distribution, technologie, données, expertise, partenariats, expérience…', 'Précisez un avantage défendable, pas seulement « meilleure qualité ».', { maxLength: 1000 })
      ]
    },
    {
      id: 'businessModel',
      title: 'Modèle économique',
      subtitle: 'Expliquez simplement comment l’entreprise gagne ou gagnera de l’argent.',
      encouragement: 'Votre logique de revenus est maintenant mieux structurée.',
      fields: [
        field_('revenueModel', 'Comment générez-vous des revenus ?', 'textarea', true, 'Vente directe, abonnement, commission, licence, location, contrat B2B…', 'Indiquez qui paie, pour quoi et à quelle fréquence.', { maxLength: 900 }),
        field_('pricing', 'Quel est votre prix ou votre méthode de tarification ?', 'textarea', true, 'Exemple : 15 000 FCFA par abonnement mensuel et par point de vente.', 'Précisez l’unité facturée.', { maxLength: 700 }),
        field_('acquisition', 'Comment allez-vous acquérir vos premiers clients ?', 'textarea', true, 'Vente directe, partenaires, distribution, prescripteurs, digital, appels d’offres…', 'Privilégiez 2 ou 3 canaux réalistes.', { maxLength: 900 }),
        field_('hasRevenue', 'Avez-vous déjà généré des revenus ?', 'select', true, '', '', { options: ['Non', 'Oui'] }),
        conditionalField_('monthlyRevenue', 'Revenu mensuel moyen actuel', 'number', false, '0', 'Montant moyen des trois derniers mois.', 'businessModel.hasRevenue', 'Oui'),
        conditionalField_('annualRevenue', 'Revenu annuel actuel ou des 12 derniers mois', 'number', false, '0', 'Utilisez la même devise que pour votre demande de financement.', 'businessModel.hasRevenue', 'Oui'),
        conditionalField_('customerCount', 'Nombre de clients payants actifs', 'number', false, '0', 'Ne comptez que les clients ayant réellement payé.', 'businessModel.hasRevenue', 'Oui')
      ]
    },
    {
      id: 'traction',
      title: 'Traction et preuves',
      subtitle: 'Présentez les signaux réels montrant que le marché réagit.',
      encouragement: 'Vous avez ajouté les éléments qui rendent votre projet plus crédible.',
      fields: [
        field_('tractionSummary', 'Quels résultats ou signaux de traction avez-vous obtenus ?', 'textarea', true, 'Utilisateurs, ventes, précommandes, pilotes, contrats, entretiens, taux de rétention…', 'Au stade de l’idée, indiquez les validations déjà réalisées.', { maxLength: 1400 }),
        field_('users', 'Nombre d’utilisateurs ou bénéficiaires actifs', 'number', false, '0', 'Indiquez uniquement un nombre vérifiable.'),
        field_('pilots', 'Pilotes, tests ou démonstrations réalisés', 'textarea', false, 'Précisez avec qui, quand et avec quel résultat.', 'Un pilote concret peut compenser l’absence de revenus.', { maxLength: 900 }),
        field_('contracts', 'Contrats, commandes ou lettres d’intention', 'textarea', false, 'Décrivez sans révéler d’informations confidentielles.', 'Distinguez contrat signé, discussion et intention.', { maxLength: 900 }),
        field_('partnerships', 'Partenariats utiles au développement', 'textarea', false, 'Nom, rôle et statut du partenariat.', 'Ne qualifiez pas de partenaire une organisation simplement contactée.', { maxLength: 900 }),
        field_('tractionEvidence', 'Quelles preuves pouvez-vous fournir ?', 'textarea', false, 'Factures, captures, rapports de pilote, contrats, tableau de bord, témoignages…', 'Indiquez un lien ou la nature du document disponible.', { maxLength: 1000 })
      ]
    },
    {
      id: 'team',
      title: 'Équipe',
      subtitle: 'Montrez pourquoi cette équipe peut exécuter le projet.',
      encouragement: 'Le lien entre votre équipe et le projet est maintenant plus convaincant.',
      fields: [
        field_('founders', 'Présentez les fondateurs et leurs rôles', 'textarea', true, 'Une personne par ligne : nom, rôle, expérience pertinente, disponibilité.', 'Mettez en avant l’expérience directement liée au projet.', { maxLength: 1600 }),
        field_('keySkills', 'Quelles compétences clés sont déjà réunies ?', 'textarea', true, 'Technique, commercial, opérations, finance, secteur, réseau…', 'Reliez chaque compétence à l’exécution du projet.', { maxLength: 900 }),
        field_('missingSkills', 'Quelles compétences ou fonctions doivent encore être renforcées ?', 'textarea', false, 'Soyez honnête : recrutement prévu, expert externe, membre du conseil…', 'Identifier un manque avec un plan est un signe de maturité.', { maxLength: 800 })
      ]
    },
    {
      id: 'funding',
      title: 'Financement et feuille de route',
      subtitle: 'Reliez le montant demandé à des actions et à des résultats mesurables.',
      encouragement: 'Votre demande de financement est désormais plus concrète.',
      fields: [
        field_('amountRequested', 'Quel montant recherchez-vous ?', 'number', true, '0', 'Indiquez le montant total de cette levée.'),
        field_('currency', 'Devise', 'select', true, '', '', { options: ['FCFA', 'EUR', 'USD', 'GBP', 'CAD', 'Autre'] }),
        field_('fundingType', 'Quel type de financement recherchez-vous ?', 'select', true, '', '', { options: ['Investissement en capital', 'Dette convertible', 'Prêt', 'Subvention', 'Partenariat financier', 'Mixte', 'À définir'] }),
        field_('useOfFunds', 'Comment les fonds seront-ils utilisés ?', 'textarea', true, 'Une ligne par poste : montant ou pourcentage, action et résultat attendu.', 'Évitez « marketing, recrutement, développement » sans détail.', { maxLength: 1600 }),
        field_('milestones', 'Quels jalons atteindrez-vous grâce à ce financement ?', 'textarea', true, 'Une ligne par jalon avec délai et indicateur mesurable.', 'Exemple : 500 clients payants sous 12 mois.', { maxLength: 1400 }),
        field_('runway', 'Combien de mois ce financement doit-il couvrir ?', 'number', false, '18', 'Souvent appelé runway ou horizon de financement.')
      ]
    },
    {
      id: 'review',
      title: 'Crédibilité et vérification',
      subtitle: 'Terminons par les risques, les sources et vos coordonnées.',
      encouragement: 'Toutes les informations nécessaires au Pitch Deck Standard sont réunies.',
      fields: [
        field_('risks', 'Quels sont les trois principaux risques du projet ?', 'textarea', true, 'Une ligne par risque, avec la mesure prévue pour le réduire.', 'Un risque reconnu et maîtrisé rassure davantage qu’un risque ignoré.', { maxLength: 1200 }),
        field_('impact', 'Quel impact social ou environnemental mesurable créez-vous ?', 'textarea', false, 'Emplois, revenus, émissions évitées, accès à un service, inclusion…', 'Ne remplissez que si cet impact est réellement central.', { maxLength: 1000 }),
        field_('sourceLinks', 'Sources et liens utiles', 'textarea', false, 'Un lien ou une référence par ligne.', 'Ajoutez les sources des chiffres importants.', { maxLength: 1400 }),
        field_('contactName', 'Nom du contact à afficher', 'text', true, 'Prénom et nom', 'Cette information apparaît sur la dernière slide.'),
        field_('contactEmail', 'E-mail de contact à afficher', 'email', true, 'contact@entreprise.com', 'Utilisez une adresse professionnelle si possible.'),
        field_('declaration', 'Je confirme que les informations fournies sont sincères et que les hypothèses sont présentées comme telles.', 'checkbox', true, '', 'Cette confirmation est obligatoire avant la génération.'),
        field_('investorSubmissionApproved', 'Après vérification, je confirme avoir relu les chiffres, les sources, les informations de financement et les visuels pour une transmission à un financeur.', 'checkbox', false, '', 'La version de travail reste disponible sans cette confirmation. Une modification du dossier impose une nouvelle revue.')
      ]
    }
  ];
}

function field_(id, label, type, required, placeholder, help, extra) {
  return Object.assign({
    id: id,
    label: label,
    type: type,
    required: Boolean(required),
    placeholder: placeholder || '',
    help: help || ''
  }, extra || {});
}

function conditionalField_(id, label, type, required, placeholder, help, conditionPath, equalsValue) {
  return field_(id, label, type, required, placeholder, help, {
    condition: { path: conditionPath, equals: equalsValue }
  });
}

function getRequiredFieldPaths_() {
  const paths = [];
  getQuestionnaireSchema_().forEach(function(section) {
    section.fields.forEach(function(field) {
      if (field.required) paths.push(section.id + '.' + field.id);
    });
  });
  return paths;
}

function isFieldConditionMet_(field, data) {
  if (!field.condition) return true;
  return String(getByPath_(data, field.condition.path) || '') === String(field.condition.equals);
}

function calculateProgress_(data) {
  const schema = getQuestionnaireSchema_();

  let globalTotal = 0;
  let globalCompleted = 0;

  const sections = {};

  schema.forEach(function(section) {
    let visibleFields = 0;
    let filledFields = 0;

    let requiredTotal = 0;
    let requiredCompleted = 0;

    section.fields.forEach(function(field) {
      if (!isFieldConditionMet_(field, data)) return;

      visibleFields += 1;
      globalTotal += 1;

      const value = getByPath_(
        data,
        section.id + '.' + field.id
      );

      const isFilled = field.type === 'checkbox'
        ? normalizeBoolean_(value)
        : cleanString_(value).length > 0;

      if (isFilled) {
        filledFields += 1;
        globalCompleted += 1;
      }

      if (field.required) {
        requiredTotal += 1;

        if (isFilled) {
          requiredCompleted += 1;
        }
      }
    });

    const percent = visibleFields
      ? Math.round((filledFields / visibleFields) * 100)
      : 100;

    let status = 'À commencer';

    if (filledFields > 0) {
      status = 'En cours';
    }

    const requiredComplete =
      requiredTotal === 0 ||
      requiredCompleted === requiredTotal;

    const allVisibleFieldsComplete =
      visibleFields === 0 ||
      filledFields === visibleFields;

    if (requiredComplete && allVisibleFieldsComplete) {
      status = 'Terminé';
    }

    sections[section.id] = {
      completed: filledFields,
      total: visibleFields,
      requiredCompleted: requiredCompleted,
      requiredTotal: requiredTotal,
      percent: percent,
      status: status
    };
  });

  return {
    completed: globalCompleted,
    total: globalTotal,
    percent: globalTotal
      ? Math.round((globalCompleted / globalTotal) * 100)
      : 0,
    sections: sections
  };
}
