# Changement de cap : partir d'un fork de Recordly

Décidé le 26/10/2026 avec le propriétaire du projet.

## Décisions

1. **Licence : AGPL-3.0.** Recordly est sous AGPL ; tout fork l'hérite. Notre code existant (ce dépôt, MIT) appartient au propriétaire et peut être relicencié.
2. **Option A : un fork à nous**, avec un **autre nom et un autre logo** (on n'a pas le droit de garder « Recordly »). Le nom viendra plus tard ; en attendant, le fork porte un nom de travail.
3. On **garde ce que Recordly fait déjà bien**, on **n'écrit pas deux fois** ce qui existe dans les deux projets, on **ajoute ce qui est propre à notre spec**. On pourra reverser à Recordly les corrections utiles à tous (par exemple le secours d'encodeur Windows).
4. Ce dépôt (Tauri/Rust) devient la **référence** : spec, format de projet, enseignements. Son code Rust n'est pas repris tel quel (Recordly est en Electron, TypeScript et C++).

## Ce que Recordly fait déjà (d'après son README et son code, 17/10/2026)

Enregistrement écran ou fenêtre, micro et son système (ScreenCaptureKit sur Mac, Windows Graphics Capture + WASAPI sur Windows) ; zoom automatique et manuel ; curseur (taille, lissage, flou, animation au clic) ; webcam en bulle (taille, position prédéfinie ou libre en X/Y, arrondi, ombre, miroir) ; habillage (fonds d'écran, dégradés, couleurs, image perso, marges, arrondi, ombre, flou) ; formats prédéfinis dont 9:16 ; sous-titres avec Whisper en local ; export MP4 et GIF ; raccourcis modifiables ; projets `.recordly` ; interface traduite (dont le français) ; en plus : coupes, accélérations, annotations, extensions.

## Ce qui est propre à notre projet (à ajouter)

### 1. Composition libre à plusieurs sources (la grande différence)
Recordly n'a ni grille, ni magnétisme, ni verrouillage, ni composition à plusieurs sources (vérifié dans son code : aucune occurrence). À construire :
- **Déplacer et redimensionner chaque source directement sur le canevas** (écran, webcam, et plus tard d'autres sources), à la souris.
- **Grille d'alignement** avec **magnétisme** : les sources s'accrochent à la grille et aux bords des autres sources ; guides visibles pendant le déplacement. Dispositions rapides : côte à côte, l'une au-dessus de l'autre, etc.
- **Verrouillage de position** : un cadenas par source (pas de verrou général, décision du 27/10). Une source verrouillée ne bouge plus, ni à la souris ni par accident, ni quand on change de format ; sa position et ses marges restent exactes.
- **Compositions sauvegardées et réutilisables** (fichier de composition, indépendant de la vidéo source) : on retrouve exactement les mêmes emplacements d'un projet à l'autre. **Pas de composition par défaut** (décision du 27/10) : les compositions sont créées et sauvegardées par l'utilisateur. Les modèles de `compositions-par-defaut/` ne servent que de référence.
- Règle de la spec §7 : changer de format ne déplace pas les sources ; on les replace soi-même (et les sources verrouillées restent où elles sont).

### 2. Encodage Windows robuste
Essai de l'encodeur matériel avant chaque enregistrement, bascule automatique vers l'encodeur logiciel s'il ne répond pas (Recordly n'a pas de secours : son éditeur ne s'ouvre jamais quand l'encodeur bloque). Code de référence : `src-tauri/src/capture/windows/` dans ce dépôt (Sink Writer, essai de 12 images, garde-fou de retard, rapport des puces et encodeurs). Idée à reverser à Recordly.

### 3. Autres écarts avec notre spec (à confirmer par un inventaire précis)
- Frappe au clavier qui garde un zoom ouvert (`zoom::compute`, testé dans ce dépôt) ; réglages de regroupement des clics, d'avance et de durée.
- Coupure du micro et du son système par raccourci pendant l'enregistrement, journalisée sans effacer l'audio brut (`muteSpans`).
- Qualité d'aperçu de l'éditeur (pleine, 1/2, 1/4).
- Export tel que décrit à la spec §11 : résolution en pourcentage du canevas, trois niveaux de qualité à débits de référence (`encode::bitrate_bps`), un seul export à la fois.
- Touches enregistrées sans leur code (vie privée).
- Reprise après arrêt brutal (Recordly en a une version ; comparer).

### Décisions de produit, élément 1 (composition libre), 27/10/2026
1. Un nouveau projet démarre comme chez Recordly (écran centré avec marges, webcam en coin). Le mode libre s'active quand on déplace une source.
2. Une composition sauvegardée est liée à son format (16:9, 9:16…) et n'est proposée que sur ce format.
3. La grille n'apparaît que si on l'allume. Magnétisme et guides d'alignement toujours actifs pendant un déplacement ; une touche (Alt) les coupe momentanément.
4. Un cadenas par source : position et taille bloquées, habillage (arrondi, ombre, contour) toujours modifiable. Pas de cadenas global.
5. Sources : on garde ce que Recordly propose déjà (écran, webcam, annotations inchangées).
6. Redimensionner l'écran garde les proportions de la vidéo ; le recadrage reste un réglage séparé.

## Plan

1. **Mise en place** : le propriétaire crée le fork sur GitHub (bouton Fork, nom de travail au choix) ; on l'ajoute à la session ; on vérifie qu'il se construit et tourne sur Windows et Mac.
2. **Inventaire précis** : comparer la spec au code de Recordly, point par point (existe / partiel / manque), dans un tableau.
3. **Nouveau nom, logo, retrait des services Recordly** (compte, marketplace, mises à jour automatiques, annonces, liens de retour d'information) ; mentions de licence AGPL et d'attribution conservées.
4. **Ajouts, par priorité** : (a) composition libre avec grille, magnétisme, verrouillage et compositions sauvegardées ; (b) secours d'encodeur Windows ; (c) frappe et zoom, coupure du son par raccourci ; (d) qualité d'aperçu. **L'export reste celui de Recordly** (décision du 27/10).
5. **Rester à jour** : récupérer régulièrement les nouveautés de Recordly ; reverser ce qui est utile à tous.

## À ne pas oublier

- **Attribution et licence** : garder le fichier `LICENSE` AGPL et les mentions d'origine ; indiquer clairement que le projet dérive de Recordly.
- **Nom et logo** : ne pas utiliser ceux de Recordly.
- **Publication du code** : toute version distribuée doit rester accessible en code source (AGPL).
