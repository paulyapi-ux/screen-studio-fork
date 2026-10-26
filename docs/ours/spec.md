# Spec : outil de screen recording (v1)

Outil de capture et de montage d'écran, open source, pour Mac et Windows. Objectif : produire des vidéos fluides et nettes avec zoom automatique, en formats long et vertical, avec webcam et habillage réglables par élément.

---

## 1. Capture

- **Sources** : écran entier, fenêtre ou zone libre.
- **Résolution de capture** : native, jusqu'à 4K.
- **Fréquence de capture** : 60 fps maximum (plafond v1, à lever plus tard).
- **Moteur** : ScreenCaptureKit (macOS), Windows Graphics Capture (Windows).
- **Encodage pendant la capture** : matériel (VideoToolbox sur Mac ; NVENC, Quick Sync ou AMF sur Windows).
- **Horodatage** : chaque image, position de souris et clic partagent une même horloge.
- **Suivi** : nombre d'images perdues enregistré, avec alerte à l'utilisateur en cas de problème.

## 2. Audio

- **Micro** et **son système** (tout l'ordinateur), en pistes séparées.
- Volume réglable par piste dans l'éditeur.
- Coupure du micro et du son système pendant l'enregistrement, par raccourci (bascule simple, sans fondu).

## 3. Webcam

- Une seule webcam à la fois.
- Capturée en pleine résolution, en piste séparée.
- Position, taille, forme, arrondi, contour et masquage réglés **au rendu**, pas pendant la capture.
- Recadrage au rendu.

## 4. Zoom

- **Automatique** sur les clics, avec avance et durée réglables.
- **Suivi du curseur** quand il n'y a pas de clic.
- **Regroupement** des clics proches en un seul zoom.
- **Déclencheurs v1** : clics uniquement. Pas de zoom sur la frappe ni sur les arrêts de souris.
- La frappe ne ferme pas un zoom déjà ouvert, pour que le texte saisi reste lisible.
- Chaque zoom est **automatique ou manuel**, retouchable dans l'éditeur (déplacer, allonger, supprimer, ajouter), avec un réglage de glide en mode manuel.

## 5. Curseur

- Taille et style modifiables.
- Lissage du mouvement, désactivable.
- Animation visuelle au clic.

## 6. Habillage

- **Fond** : wallpaper, dégradé, couleur, image personnelle.
- **Par élément** (écran et webcam) : marge, arrondi, ombre, contour, forme, position, taille, recadrage.
- **Flou de mouvement** : activé par défaut, réglable.
- **Hors v1** : cadre d'appareil, inset.

## 7. Canevas

- **Proportions** : native, 16:9, 9:16, 1:1, 4:5. Choisies dans l'éditeur, à tout moment.
- **Taille du canevas 9:16** : 1080×1920.
- Un changement de proportion n'ajuste pas les zones : l'utilisateur les replace lui-même.
- Le canevas est défini en **proportions**, la résolution de sortie est choisie à l'export.

## 8. Presets et compositions

- **Presets par défaut** : long form (16:9), short form (9:16), webcam plein écran.
- Une **composition** est un canevas avec ses zones, leur habillage et le fond. Elle est indépendante de la vidéo source.
- Une composition peut être sauvegardée et réutilisée.
- **Hors v1** : bibliothèque de presets créés par l'utilisateur (à venir).

## 9. Sous-titres

- **Pas de génération automatique** à l'arrêt de l'enregistrement.
- Transcription **lancée à la demande** depuis l'éditeur.
- Moteur : whisper-rs (Whisper), exécuté en local. Parakeet possible comme option CPU.
- Texte **éditable** dans la timeline.
- **Export** : fichier SRT ou VTT séparé, ou incrustation dans la vidéo.

## 10. Aperçu de l'éditeur

- Qualité d'aperçu : **Full quality** (par défaut), **1/2**, **1/4**.
- N'affecte pas le fichier exporté.

## 11. Export

- **Format** : MP4 ou GIF.
- **Résolution** : en pourcentage de la taille du canevas. Originale (100 %), Élevée (90 %), Moyenne (75 %), Faible (60 %).
- **Images par seconde** : 24, 30 ou 60 (60 par défaut).
- **Qualité** : haute, standard (par défaut) ou légère. Un seul réglage, qui fixe à la fois le débit et l'encodage.
  - Haute : encodage Quality. Standard : encodage Balanced. Légère : encodage Fast.
- **Débits de référence à 60 fps** :

| Qualité | 1080p | 4K |
|---|---|---|
| Haute | 16 Mbps | 68 Mbps |
| Standard | 12 Mbps | 53 Mbps |
| Légère | 8 Mbps | 35 Mbps |

- **Codec** : H.264 en v1, non proposé à l'utilisateur.
- **Un seul export à la fois.** Le lancement est bloqué pendant un rendu, avec sa progression affichée.
- L'export est un **rendu** du projet : l'utilisateur peut continuer à travailler dans l'éditeur pendant le rendu, ou fermer l'éditeur.
- Fermer l'application pendant un export demande confirmation et annule le rendu.

## 12. Projets

- **Nommage** automatique à la création, renommable.
- **Liste** triée par date, sans dossiers en v1.
- **Reprise** après arrêt brutal : détection et récupération des enregistrements inachevés.
- Le projet est la source de vérité : vidéo brute, événements souris, zooms, sous-titres, composition. Enregistrer le projet ne déclenche pas d'export.

## 13. Parcours utilisateur

1. Choisir un preset (ou une composition) avec aperçu, puis choisir les sources : écran, fenêtre ou zone, micro, son système, webcam.
2. Lancer l'enregistrement.
3. Arrêter. L'outil calcule le zoom automatique et le lissage du curseur, puis enregistre le projet. Pas de transcription.
4. Ouvrir l'éditeur : retouche des zooms, lancement de la transcription si besoin, retouche des calques.
5. Exporter, dans le format du canevas, en un seul export à la fois.

## 14. Raccourcis

**Globaux** (fonctionnent en arrière-plan)

| Action | macOS | Windows |
|---|---|---|
| Démarrer / arrêter | ⌘ ⇧ R | Ctrl ⇧ R |
| Pause / reprendre | ⌘ ⇧ P | Ctrl ⇧ P |
| Couper / rétablir le micro | ⌘ ⇧ M | Ctrl ⇧ M |
| Couper / rétablir le son système | ⌘ ⇧ S | Ctrl ⇧ S |

**Éditeur**

| Action | macOS | Windows |
|---|---|---|
| Lecture / pause | Espace | Espace |
| Ajouter un zoom au point courant | Z | Z |
| Supprimer l'élément sélectionné | Suppr | Suppr |
| Annuler / rétablir | ⌘ Z / ⌘ ⇧ Z | Ctrl Z / Ctrl Y |
| Enregistrer le projet | ⌘ S | Ctrl S |
| Exporter | ⌘ E | Ctrl E |

## 15. Plateformes et licence

- **Plateformes** : macOS et Windows.
- **Licence** : open source, à choisir (permissive type MIT ou Apache 2.0, ou copyleft type AGPL).
- **Stack** : à choisir après validation de la spec. Tauri (Rust et web) est une option cohérente avec whisper-rs.

## 16. Hors v1

- Cadre d'appareil et inset.
- Dossiers de projets.
- Export multi-format en une fois.
- Zoom sur la frappe et sur les arrêts de souris.
- Presets créés par l'utilisateur.
- Capture au-delà de 60 fps, et export à 120 fps.
- Sous-titres animés, styles multiples, traduction.
- Plusieurs webcams.
- Masquage de la webcam pendant la capture.

## 17. Points ouverts

- Les raccourcis sont-ils modifiables par l'utilisateur ?
- Faut-il un raccourci pour lancer la transcription des sous-titres ?
- Estimation du temps de rendu affichée avant l'export ?
- Disposition du texte de l'écran en 9:16, à valider sur de vraies captures.
- Débits : à valider par tests sur du texte petit (9 à 11 pt).
- Stack et licence.
