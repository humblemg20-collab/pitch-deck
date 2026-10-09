# AfriGreen24 PitchStudio V2.2 — OpenAI Storytelling Engine

## Transformation

Remplacer le copier-coller du questionnaire par une narration OpenAI adaptée aux 12 slides, sans changer la source canonique Projects.dataJson dans Google Sheets. Les projets repris par lien restent compatibles.

## Exécution

1. Le porteur clique sur « Améliorer les 12 slides avec OpenAI » et valide explicitement la transmission. Le serveur exige encore consent=true.
2. apiPreparePitchNarrative vérifie le token, récupère les faits utiles du questionnaire, calcule une empreinte SHA-256 incluant modèle et version, et cherche une version déjà prête.
3. Une réservation RUNNING est effectuée sous script lock, puis un unique appel OpenAI Responses API avec store:false et un JSON Schema strict.
4. Après validation des retours, le résultat est persisté dans Google Drive (generated/narratives), référencé dans la nouvelle feuille NarrativeRuns ; sinon FAILED/STALE et logs d'erreur structurés.
5. Générer ou Régénérer le deck réutilise la version READY correspondant aux réponses actuelles. Sinon le moteur déterministe fonctionne toujours gratuitement.

## Garde-fous

- Données transmises : champs factuels autorisés du questionnaire. Exclusion des emails contacts, tokens de reprise, déclarations et documents importés.
- Champs modifiables par l'IA : narratifs limités, pas les montants, sources, métriques, contacts, statut commercial ou nombre de slides.
- Chiffres nouveaux, URL/HTML ou affirmations contractuelles sensibles non étayées sont refusés.
- Les contrôles déterministes sont partiels : une relecture humaine reste nécessaire pour les nuances sémantiques.
- Quotas OpenAI sous lock : trois tentatives par empreinte, quatre requêtes par projet/24 h et cent requêtes globales/24 h.
- Préservation des versions et du questionnaire original. Modifications des réponses => nouvel identifiant de contenu, donc ancien texte reformulé non réutilisé.
- Pas de paiement, pas de modification des règles d'accès ni des schémas Projects.

## Déploiement contrôlé

Prérequis : propriété Apps Script OPENAI_API_KEY ; propriété AG24_PITCH_OPENAI_MODEL facultative (défaut gpt-4.1-mini).

GitHub main canonique -> tests -> sauvegarde du projet Apps Script réel -> audit/staging -> push HEAD -> smoke tests de consentement et génération Google Slides -> publication /exec sur nouvelle version seulement après validation.

Cas de recette : reprendre le même projet Humble MG via son lien, lancer la reformulation, vérifier l'état READY, régénérer les 12 slides et comparer visuellement avec les deux PDF fournis. Aucune taille de marché, contrat, allocation budgétaire ou preuve ne doit être inventée. Le succès CI seul ne prouve pas un déploiement réel.
