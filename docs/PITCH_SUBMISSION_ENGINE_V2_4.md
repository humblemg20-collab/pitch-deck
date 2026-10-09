# PitchStudio V2.4 — contrôleur de soumission aux financeurs

## Transformation : document transmissible, sans manipulation de la vérité

Le PDF n°5 Humble MG présente encore : `BROUILLON • DONNÉES À VÉRIFIER` (12 pages), `VISUEL FOURNI ET SÉLECTIONNÉ PAR LE PORTEUR`, `OBJECTIF À VALIDER`, 10 000 sans devise, « la population » comme clientèle, « technologie avancée » comme avantage, source de marché absente, montant de 1 000 000 EUR non ventilé, et des visuels agriculture/marketing dans un projet de création web.

**Interdiction** : supprimer ces avertissements pour donner l'apparence que le projet est éligible. La préparation investisseur doit être conditionnée aux données réelles.

## Moteur réutilisable

Événement (dossier enregistré)
→ évaluation déterministe `AG24_SUBMISSION_gate_`
→ rapport de blocages (section, code, action)
→ correction des seules informations réellement manquantes dans le questionnaire canonique
→ déclaration de revue finale du porteur
→ contrôle serveur à nouveau sous verrou
→ génération Google Slides/PDF `SUBMISSION`
→ contenu sans annotations internes
→ journal de génération et fichiers de sortie conservés.

Le brouillon `STANDARD` gratuit reste toujours accessible (même si l'export financeur est bloqué) ; les montants et descriptions ne sont pas reformulés ni inventés par le contrôleur.

## Préconditions de soumission

- Problème et bénéficiaire identifiés, marché ciblé et source référencée.
- Proposition de valeur et avantage défendables, modèle économique explicite, tarif avec devise/unité.
- Chiffres de traction étayés si revendiqués.
- Montant demandé strictement positif, type de financement et ventilation (au moins deux postes chiffrés totalisant le montant ou 100 %).
- Plusieurs jalons mesurables/datables, contact professionnel et déclaration de sincérité.
- Relecture finale explicite des textes, chiffres, références et visuels. Toute nouvelle réponse ou nouvelle approbation de visuel invalide la précédente attestation. Un hash SHA-256 des sections canoniques et des médias approuvés lie l'attestation à un dossier précis, y compris en cas de mise à jour via import documentaire.

## Nettoyage du mode soumis

- Pied de page discret au nom du projet, pagination conservée, plus de marqueurs « BROUILLON » ou signature « Pitch Studio ».
- Annotations d'édition « VISUEL FOURNI », « OBJECTIF À VALIDER », et placeholders de financement supprimés de la sortie **validée seulement**.
- Informations de traction non chiffrées non présentées comme métriques.
- Titre/montant de financement non répété dans les gabarits FOCUS ; priorité aux postes concrets.
- Visuels approuvés uniquement ; l'approbation humaine de leur pertinence reste essentielle.
- Export explicite « Pitch Deck Investisseur ». Le PDF standard demeure séparé dans le flux utilisateur et dans l'historique Drive.

## Limites

La validation déterministe teste la complétude et certaines incohérences (notamment somme du budget) : elle **ne vérifie pas l'authenticité** des preuves ni les conditions propres à chaque plateforme. Aucun montant n'est garanti ou présenté comme vérifié par un tiers.

## Conditions de release

CI Node et PowerShell réussies, aucun changement du schéma Assets, pas de migration des données et aucun effacement de documents antérieurs. Après synchronisation Google Apps Script, recette sur projet existant, puis revue humaine du PDF (visuels, ratios, sources et cohérence économique). Le merge GitHub n'est pas le déploiement /exec.
