# AfriGreen24 AI × PitchStudio — synchronisation ZIP / GitHub

Reprise contrôlée du connecteur v1.0.1 et des diagnostics du ZIP fourni le 9 octobre 2026. GitHub main reste canonique ; les fichiers obsolètes du ZIP ne remplacent pas les corrections de sécurité.

## Protocole serveur

Le backend AfriGreen AI envoie une requête JSON POST à l'URL Apps Script avec une propriété privée PITCH_AFRIGREEN_CONNECTOR_SECRET (secret aléatoire d'au moins 32 caractères, configuré côté PitchStudio ET côté serveur AfriGreen AI, jamais dans le navigateur ni GitHub).

Actions : HEALTH ; OPEN_OR_CREATE_PITCH_PROJECT ; GET_GENERATED_PITCH.

Champs pour les deux dernières actions : action, secret, email, projectName, sourceProjectId (identifiant CANONIQUE du projet AfriGreen AI), éventuellement pitchProjectId déjà associé. Les clients anciens peuvent utiliser email + projectName uniquement si la correspondance est sans ambiguïté.

## Garanties

- Table ConnectorLinks : sourceProjectId → pitchProjectId, avec réservation durable sous LockService ; retries ne créent pas de nouvel identifiant.
- Vérification systématique de l'adresse email du projet associé et refus des collisions.
- Limites de création standard de PitchStudio ; pas de paiement.
- Code de reprise chiffré/haché par projet : hashValue_(projectId + '|' + recoveryCode).
- URL de lancement : #project=...&token=... dans le fragment. Rotation du jeton lors d'une nouvelle ouverture (anciens liens invalidés).
- GET_GENERATED_PITCH strictement en lecture seule : ne renomme pas le projet, ne partage pas les fichiers et ne modifie pas les permissions Drive.
- La fonction TEST_PITCH_STUDIO_GLOBAL_V2_ est réservée à l'éditeur Apps Script ; les secrets ne sont jamais affichés.

**Prérequis avant activation réelle :** vérifier le scriptId, sauvegarder le projet Apps Script, configurer les deux secrets privés, valider un projet test sans divulguer de jeton, et vérifier le comportement des anciennes URLs après rotation. Les tests GitHub CI ne remplacent pas les tests Apps Script réels.

## Release Engine

La branche source est main ; la procédure reste sauvegarde → audit → staging → contrôles de sécurité → push HEAD → vérification → rollback si nécessaire. Un push HEAD ne met pas à jour à lui seul l'URL de production /exec. Aucun déploiement live n'est autorisé sans accès OAuth et identité cible vérifiée.
