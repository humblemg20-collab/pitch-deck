# GreenIN AI — Investor Narrative Engine V2.3

## Transformation réelle

Passer de 12 pages de questionnaire à 12 slides d'une narration destinée à être expliquée à un investisseur : un message central par page, des preuves explicitement déclarées, une mise en page choisie selon les données réellement disponibles.

**Cas d'acceptation :** humble mg, troisième PDF. Détecter les textes d'attente « Potentiel de marché à quantifier », « Preuves à préciser », « Compétences à renforcer non précisées » ; refuser « Cameroun — Logistique » comme géographie fiable ; signaler une demande de 1 000 000 EUR non ventilée ; ne pas placer de photo agricole sur une présentation technologique sans vérification de sa pertinence.

## Exécution SYSTEMS FIRST

Projects.dataJson + Assets (source canonique)
→ qualité déterministe des champs
→ consentement GreenIN AI et plan de narration (optionnel, OpenAI fournisseur technique)
→ validation des faits, quotas, schéma et choix de layout
→ plan de présentation déterministe
→ 12 compositions Google Slides + PDF
→ journal de release et preuve de génération.

### Contrat de narration

Le modèle propose, pour chaque section, les champs textuels autorisés ainsi qu'un choix parmi DEFAULT / FOCUS / SPLIT / DATA / TIMELINE. Le code refuse un mode qui nécessite une preuve ou des étapes absentes. L'avis du modèle ne peut créer une métrique, un budget, un statut de marché ou une photo.

Les données restent intouchées ; le cache Drive NarrativeRuns porte la version `pitch_story_v2_3_0` et un hash des faits, du modèle et du moteur.

### Matrice de rendu

- **FOCUS** : une seule affirmation principale, qualification claire des éléments déclarés, espaces non artificiellement remplis.
- **SPLIT** : deux informations réellement disponibles ; pas de deuxième carte fictive.
- **DATA** : chiffres existants (traction, marché) et source correspondante, jamais une TAM/SAM/SOM imaginée.
- **TIMELINE** : au moins deux étapes réellement décrites, jamais des étapes ajoutées.
- Cover : logo explicitement classé comme tel, pas d'affiche promotionnelle choisie automatiquement.
- Aucun visuel de produit/équipe automatique en mode FOCUS sans vérification contextuelle.

### Contrôles

- Problème, marché, traction, géographie, utilisation des fonds et statut commercial font l'objet de règles réutilisables.
- Les placeholders sont exclus du contenu présenté, **pas supprimés des réponses utilisateur**.
- GreenIN AI reste facultatif, avec consentement explicite et fournisseur OpenAI déclaré. Aucun paiement ne conditionne le deck.
- CI : tests JS + staging PowerShell. Les 12 slides sont simulées avant fusion ; le rendu PDF réel nécessite Apps Script en environnement autorisé.

### Non-objectifs de cette itération

Aucun chiffre, contrat, source, visuel, allocation budgétaire ou résultat commercial inventé. Ne pas prétendre qu'un passage CI vaut validation de qualité auprès d'investisseurs.
