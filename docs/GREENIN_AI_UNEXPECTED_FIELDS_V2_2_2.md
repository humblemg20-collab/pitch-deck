# GreenIN AI — correctif STORY_UNEXPECTED_FIELD (V2.2.2)

Défaut observé le 9 octobre 2026 sur un projet repris : la réponse OpenAI remplit parfois des champs `title`, `subtitle` ou `body` interdits pour une slide spécifique, ce qui provoque un rejet global `STORY_UNEXPECTED_FIELD`.

## Solution déterministe

- La matrice canonique `AG24_STORY.EDITS` continue d'indiquer les seuls champs narratifs modifiables sur chacune des 12 slides.
- Tout texte retourné sur un champ **non autorisé** est écarté AVANT l'application sur une slide. Son contenu n'est ni conservé dans la copie finale ni écrit dans les données projet.
- Les textes autorisés continuent de subir la validation des chiffres, des affirmations sensibles, de l'absence d'URL/HTML et de la limite des 240 caractères.
- Les éléments autorisés validés sont conservés dans Drive privé et utilisés lors de la régénération.
- `discardedUnexpected` est persisté dans le résultat, journalisé et présenté au porteur. Un message explique les reprises partielles.
- Aucune sortie applicable à une slide ? `STORY_NO_USABLE_EDITS` : pas de faux succès ; le deck déterministe reste disponible gratuitement.
- La version `pitch_story_v2_2_2` renouvelle l'empreinte de cache ; les anciennes erreurs et le plafond par empreinte n'empêchent pas de traiter une nouvelle version. Les plafonds journaliers globaux et par projet restent inchangés.

La sauvegarde et la publication Apps Script /dev ou /exec sont **distinctes de la fusion GitHub**. Exécuter ensuite le test sur le projet repris, vérifier le statut READY, les compteurs et le PDF réellement généré. Aucun chiffrement, contrôle d'accès ni donnée canonique n'est modifié par cette correction.
