# GreenIN AI — gestion robuste des réponses trop longues (V2.2.1)

Cause confirmée par le diagnostic Apps Script : STORY_TEXT_TOO_LONG, déclenchée si un seul champ reformulé dépasse 240 caractères.

Le moteur ne doit plus rejeter 12 diapositives pour un champ trop long. Il vérifie d'abord le schéma, les champs autorisés, les chiffres et les affirmations à risque, puis **écarte uniquement les textes trop longs**. Les champs non acceptés gardent exactement la version déterministe issue du questionnaire.

- Aucun texte reformulé n'est tronqué au milieu d'une phrase : cela pourrait supprimer une réserve ou changer le sens.
- Les autres champs reformulés valides sont enregistrés et utilisés.
- Les sorties dépassant la limite sont comptées dans `discardedOverlong`, conservées dans le fichier privé Drive avec le contenu validé et affichées dans le statut GreenIN AI.
- Si **aucun** texte n'est exploitable, échec explicite `STORY_NO_USABLE_EDITS` ; le deck gratuit reste toujours générable.
- Les nombres et affirmations non sourcés restent bloqués, **même dans un texte trop long**.
- Aucun appel OpenAI supplémentaire pour corriger une seule phrase ; la mise en page et les limites de coûts restent stables.
- Version `pitch_story_v2_2_1` : nouveau hash, donc les échecs V2.2.0 ne bloquent pas le recalcul légitime sur le même dossier (les quotas journaliers demeurent).

Recette : reprendre le même projet après déploiement, autoriser GreenIN AI, vérifier le statut READY/compteur de propositions écartées et régénérer PDF. Les tests GitHub sont des tests simulés ; le contrôle réel Google Apps Script et la qualité du PDF restent nécessaires.
