# PitchStudio V2.3.1 — Large Media Presentation Engine

**Transformation recherchée :** les photos et portraits sélectionnés par le porteur occupent une véritable place dans la narration visuelle (environ 45 % de la largeur exploitable), au lieu d'être des vignettes.

## Problème racine
Le placement historique utilisait notamment 132 × 134 unités pour les portraits et 242 × 160 pour les images produit, sur une grille de 960 × 540. La V2.3 bloquait en outre les photos non validées pour éviter des visuels hors sujet.

## Chaîne SYSTEMS FIRST
Assets (Google Sheets + Drive, source canonique des fichiers)
→ choix explicite « Afficher en grand dans le Pitch Deck »
→ Projects.data.presentationMedia.approvedAssetIds (source canonique de la décision d'affichage)
→ rapprochement des rôles/diapositives
→ rendu de composition éditoriale
→ ajustement proportionnel de l'image, sans étirement
→ Google Slides et PDF
→ journal DECK_MEDIA_PLAN et DECK_IMAGE_APPROVAL_CHANGED.

Chaque image reste liée à son projet par jeton ; impossible d'approuver un autre projet. La reprise retrouve les décisions d'affichage déjà enregistrées. La modification d'une approbation invalide l'ancienne version du deck mais ne supprime pas les documents archivés.

## Compositions
- Couverture : logo ou photo de couverture approuvés, grande zone visuelle à droite et titre clairement séparé à gauche.
- Solution : image produit/solution approuvée à droite, valeur client à gauche.
- Équipe : portrait fondateur/équipe approuvé à droite, personnes/compétences à gauche.
- Traction : visuel de preuve/impact choisi à droite, métrique déclarée à gauche, **sans considérer la photo comme une preuve indépendante**.
- Les autres diapositives restent en layout investisseur déterministe sans décoration artificielle.

Le cadre visuel standard est ≈ 432–439 unités de large et jusqu'à 326 de haut, au lieu d'environ 132–242 de large précédemment. `contain` respecte entièrement le ratio des photos, y compris portraits. Le bas du cadre reste au-dessus du séparateur de pied de page y=420 ; aucune photo ne recouvre les informations de qualité.

## Sécurité et métier
- Pas de photos automatiquement réintroduites dans des secteurs qui ne leur correspondent pas.
- Les rôles d'upload seuls ne suffisent pas : l'approbation utilisateur explicite est obligatoire.
- Pas de changement du schéma Assets ni de migration Sheets.
- Pas d'appel OpenAI additionnel : l'IA continue la narration ; le moteur déterministe gère placement, droits, géométrie.
- Pas de suppression d'historique Drive, aucune modification des faits, chiffres ou sources.
- Régression : approbation/retrait, reprise, absence d'images non approuvées, proportions 16:9/portrait/carré, pas de chevauchement du footer, maintien du Quality Gate.

**À vérifier en conditions réelles :** sauvegarde de la Web App, synchronisation Apps Script, approbation du visuel réellement pertinent, régénération du même Humble MG puis examen visuel du PDF final.
