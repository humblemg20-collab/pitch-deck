# Pitch Deck — GreenIN AI / OpenAI Import Engine V1

## Décision CTO

**GreenIN AI est la marque affichée aux utilisateurs ; OpenAI reste l'unique fournisseur technique de traitement.** Aucun HumbleOS worker, endpoint ou fallback HumbleOS.
Le système métier détermine les droits, les limites, les champs autorisés, les statuts et la fusion.
OpenAI propose uniquement des valeurs qualitatives provenant du document.

## Source canonique

- `Projects` : données utilisateurs du questionnaire, dans `dataJson`.
- `Assets` : métadonnées de fichiers uploadés, liées au `projectId`.
- Dossier Drive privé : documents sources et propositions d'extraction au format JSON.
- `ImportRuns` : suivi de l'extraction, provenance (document, hash, modèle, statut, timestamps).
- `Events` : journal technique des opérations sans contenu de fichiers ni secret.

## Séquence

1. Le porteur de projet reprend son projet avec les identifiants existants.
2. Il charge un document PDF/DOC/DOCX (max 8 Mio).
3. Le document est stocké en Drive privé avec un rôle `SOURCE_DOCUMENT`.
4. Sur demande explicite (`consent: true` vérifié côté serveur et événement `IMPORT_STARTED` journalisé), le backend vérifie `projectId + token + assetId` et un budget de 3 tentatives par document.
5. Le serveur réserve un `ImportRun: RUNNING` sous verrou. Aucun réseau sous ce verrou.
6. Un seul appel `POST /v1/responses` avec `input_file` base64, `store: false` et `text.format` JSON Schema strict.
7. Les suggestions sont limitées à des champs autorisés de `getQuestionnaireSchema_()`, avec valeur, indice de preuve et confiance. Les suggestions invalides sont rejetées.
8. Le résultat est persisté sur Drive et le run passe à `READY` ; un échec passe à `FAILED` sans modifier les réponses.
9. Le client affiche les preuves et coche les propositions à valider.
10. `apiApplyDocumentAnalysis` relit les suggestions **côté serveur**, applique seulement les champs **vides**, recalcule diagnostic, invalide le deck précédent si des valeurs changent et journalise la provenance.
11. Un nouveau deck est généré depuis les données désormais canoniques.

## Contrats de sécurité

- Secret serveur exclusivement via `PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY')`. Ne jamais mettre de clé dans le dépôt, l'HTML, les logs ou les URL.
- Modèle configurable séparément pour ce projet via `AG24_PITCH_OPENAI_MODEL` (par défaut : `gpt-4.1-mini`).
- Aucune dépendance à HumbleOS.
- `store: false` pour éviter de conserver la réponse API comme objet de conversation stocké par défaut ; ce réglage ne signifie pas qu'aucune donnée n'est traitée ou journalisée par le fournisseur selon les conditions de la plateforme.
- Aucune tentative automatique répétée sur 429/5xx. Le client peut relancer manuellement dans la limite prévue.
- Contenu du document traité comme une **source non fiable**, pas comme des instructions système.
- Les preuves sont des indices générés par le modèle ; elles restent **à vérifier par l'utilisateur**, car une citation peut être incorrecte.
- Champs `checkbox`, `select` et déclaration de sincérité exclus du préremplissage.
- Les montants numériques sont filtrés strictement ; aucune interprétation implicite des revenus ou chiffres.
- Pas de remplacement silencieux d'une valeur déjà saisie dans le questionnaire.
- Aucun accès aux dossiers des autres projets ou aux identifiants Drive arbitraires par le navigateur.
- Les modèles et limites de l'API peuvent évoluer : une vérification opérationnelle est nécessaire avant toute mise en production.

## Contrôle du déploiement

### Prérequis, à valider dans l'environnement Apps Script de Pitch Deck

- `OPENAI_API_KEY` est **déjà déclarée présente** dans les paramètres du script par l'administrateur. Ne pas remplacer, recopier ou afficher la valeur. Vérifier uniquement sa disponibilité dans le contexte d'exécution du Pitch Deck, sans exposition du secret.
- Modèle configuré avec accès API autorisé ; aucun secret ne doit être transmis au navigateur.
- Accès Drive, Sheets, UrlFetchApp et Slides permis aux exécutions.
- Schéma `ImportRuns` créé sans destruction des données existantes.
- E-mails et permissions Drive testés sous le rôle réel du porteur de projet.

### Tests d'intégration avant fusion de la PR

- [ ] CI GitHub Actions vert, tests de syntaxe et mocks.
- [ ] Vérifier le statut `apiPitchOpenAIHealth` (présence côté serveur uniquement, aucune valeur secrète retournée).
- [ ] Exécuter une fois `TEST_PITCH_OPENAI_CONNECTION_()` dans l'éditeur Apps Script du Pitch Deck : appel réel OpenAI sans document client, réponse limitée à un statut et au modèle, jamais la clé.
- [ ] Analyser un PDF de test comportant faits, preuves et montants.
- [ ] Analyser un DOCX de test et vérifier la qualité textuelle.
- [ ] Refuser un document malformé, non autorisé ou trop volumineux.
- [ ] Reprendre le projet et relire une analyse `READY`.
- [ ] Valider uniquement deux champs sélectionnés ; préserver tous les autres.
- [ ] Confirmer qu'une réponse humaine préexistante ne change jamais.
- [ ] Faire échouer volontairement l'appel OpenAI ; aucun champ ne doit être modifié.
- [ ] Contrôler les rapports d'audit et l'absence de PII dans les logs.
- [ ] Générer 12 slides + 1 PDF sans doublon et vérifier les permissions du porteur de projet.
- [ ] Simuler un échec de génération puis valider rollback et reprise.

## Limites connues

Le moteur est un **import avec validation humaine**, pas un service de fact-checking externe.
Les PDF peuvent fournir texte et images de pages, les DOC/DOCX du texte ; des graphiques intégrés dans Word risquent de ne pas être exploités. <https://developers.openai.com/api/docs/guides/file-inputs>
Les fichiers sont limités à 8 Mio pour limiter les risques et coûts ; ce n'est pas une protection antivirus.
Les documents sont envoyés au service OpenAI uniquement lorsque l'utilisateur sélectionne **« Analyser avec GreenIN AI »** et accepte l'avertissement.
