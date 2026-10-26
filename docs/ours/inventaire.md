# Inventaire : notre spec v1 contre le code de Recordly (v1.4.0)

Établi le 26/10/2026 **en lisant le code** (recherches ciblées, sans lancer l'application). « Existe » veut dire : le code est là. Ce n'est pas la preuve que le comportement correspond à la spec. Les lignes marquées **à tester** demandent un essai sur le PC ou le Mac.

Légende : ✅ existe · 🟡 partiel ou différent · ❌ manque

## Capture (spec §1 à §3)

| Spec | État | Constat |
|---|---|---|
| Écran entier, fenêtre | ✅ | `sourceType: "screen" \| "window"` |
| Zone libre | ❓ à vérifier | pas trouvé en recherche rapide |
| Résolution native jusqu'à 4K | ✅ à tester | testé par le propriétaire en 4K (enregistrement et export OK le 26/10) |
| 60 i/s | ✅ | `TARGET_FRAME_RATE = 60` |
| Windows : WGC + encodeur matériel | 🟡 | oui, mais **aucun secours logiciel** si l'encodeur ne répond pas (`mf_encoder.cpp`) |
| Horloge commune images / souris / clics | ✅ à tester | télémétrie du curseur en place |
| Suivi des images perdues avec alerte | ❓ | non vérifié |
| Micro + son système en pistes séparées | ✅ | `microphoneEnabled`, `systemAudioEnabled`, `systemAudioTrack` |
| Volume par piste dans l'éditeur | ✅ | champ `volume`, dossier `audio/` |
| Coupure micro / son système par **raccourci** pendant l'enregistrement | ❌ | pas de raccourci global trouvé (`globalShortcut` absent) |
| Webcam : une seule, piste séparée | ✅ | |
| Webcam : position, taille, forme, arrondi, ombre, recadrage, miroir | ✅ | `webcamPositionPreset`, `webcamSize`, `webcamRadius`, `webcamShadow`, `webcamCrop`, `webcamMirror` |
| Webcam : contour | ❓ | non trouvé |

## Zoom et curseur (§4, §5)

| Spec | État | Constat |
|---|---|---|
| Zoom automatique sur les clics | ✅ | `zoomSuggestionUtils.ts` : clics, double-clics, champs de texte, menus |
| Zoom manuel / retouche (déplacer, allonger, supprimer, ajouter) | ✅ | timeline des zooms, raccourci `Z` |
| Suivi du curseur sans clic | ✅ | `zoomResponsePerSecond`, zone sûre |
| Regroupement des clics proches | 🟡 | logique de « dwell » (arrêt), pas de réglage de regroupement comme dans notre spec |
| Avance (lead) et durée réglables | ❌ à vérifier | pas de réglage équivalent trouvé |
| La frappe garde un zoom ouvert | ❌ | Recordly n'enregistre **pas** les frappes (seulement souris et clics) |
| Curseur : taille, style, lissage, animation au clic | ✅ | nombreux réglages `cursor…`, flou de mouvement du curseur |

## Habillage, canevas, compositions (§6 à §8)

| Spec | État | Constat |
|---|---|---|
| Fond : wallpaper, dégradé, couleur, image perso | ✅ | `WallpaperGrid`, fonds personnalisés |
| Marge, arrondi, ombre, contour de l'écran | ✅ | |
| Flou de mouvement | ✅ | |
| Proportions : native, 16:9, 9:16, 1:1, 4:5 | ✅ | existent (et 4:3, personnalisé en plus) |
| Webcam : 9 positions prédéfinies | ✅ | coins, centres, centre |
| **Déplacer et redimensionner chaque source librement sur le canevas** | ❌ | position de la webcam par préréglages, pas de glisser-déposer libre complet pour toutes les sources |
| **Grille, magnétisme, guides d'alignement** | ❌ | |
| **Verrou de position par source + verrou global** | ❌ | |
| Compositions sauvegardées | 🟡 | `EditorPreset` : sauvegarde de réglages (habillage, webcam, sous-titres), mais pas une composition au sens de notre spec (zones indépendantes de la vidéo) |
| Presets par défaut long / court / webcam plein écran | ❌ | à créer (modèles dans `docs/ours/compositions-par-defaut/`) |
| Un changement de proportion ne déplace pas les zones | ❓ à tester | |

## Sous-titres (§9)

| Spec | État | Constat |
|---|---|---|
| Transcription locale par Whisper, à la demande | ✅ | `captions.ts`, chemin et modèle Whisper dans les préférences |
| Texte éditable dans la timeline | ✅ | `CaptionListPanel`, `captionEditing` |
| Export SRT / VTT séparé | ❓ | non vérifié (incrustation dans la vidéo : ✅ `captionRenderer`) |

## Aperçu, export, projets (§10 à §12)

| Spec | État | Constat |
|---|---|---|
| Qualité d'aperçu Full / 1/2 / 1/4 | ❌ | aucune trace |
| MP4 et GIF | ✅ | |
| Fréquence 24 / 30 / 60 | ✅ | `ExportMp4FrameRate` |
| Résolution en pourcentage du canevas (100/90/75/60 %) | 🟡 | autre échelle : `medium`, `good`, `high`, `source` |
| Qualité haute / standard / légère = débit + encodage | 🟡 | modes `fast`/`balanced`/`quality` existent mais débits calculés autrement, **différents de notre tableau** |
| Un seul export à la fois, progression | 🟡 à tester | état d'export présent, blocage à vérifier |
| Fermer l'appli pendant un export : confirmation | ❓ | |
| Projets : nommage, liste par date, dossiers | 🟡 | tableau de bord avec dossiers (notre v1 : sans dossiers, mais ça ne gêne pas) |
| Reprise après arrêt brutal | 🟡 | récupération pour la capture Mac, à vérifier ailleurs |
| Fichier projet | ✅ | `.recordly` (à renommer plus tard) |

## Raccourcis (§14)

| Spec | État | Constat |
|---|---|---|
| Raccourcis de l'éditeur | ✅ | configurables (`ShortcutsConfigDialog`) : Z zoom, C couper, Espace lecture… |
| Raccourcis globaux démarrer/arrêter, pause | ❓ | non vérifié (via la barre ou le crochet clavier `uiohook`) |
| Raccourcis globaux couper micro / son système | ❌ | |

## Vie privée

| Spec | État | Constat |
|---|---|---|
| Codes de touches jamais enregistrés | ✅ à confirmer | souris et clics seulement, pas de frappes |

## Hors spec : ce que Recordly a en plus (à garder ou retirer)

À garder (utile, déjà fait) : extensions de l'éditeur ? (à décider), annotations, accélération/ralenti, découpe de clips, accélération de l'export par carte graphique, traductions (11 langues dont le français), thème.

À retirer plus tard : compte et connexion, onglet « Shared » (partage en ligne), annonces, retour d'information, mises à jour automatiques, marketplace d'extensions, nom et logo de Recordly.

## Ce qu'on construit, dans l'ordre

1. **Éditeur de composition libre** (déplacer, grille, magnétisme, verrous, compositions sauvegardées, trois compositions par défaut). Rien d'équivalent dans le code.
2. **Secours d'encodeur Windows** (essai du matériel, bascule logicielle). À proposer aussi à Recordly.
3. **Raccourcis globaux de coupure du son**, journalisés sans effacer l'audio.
4. **Frappe qui garde le zoom ouvert** + réglages de regroupement, d'avance et de durée. Demande d'enregistrer *qu'une frappe a eu lieu* (sans le code de la touche).
5. **Qualité d'aperçu** (Full / 1/2 / 1/4).
6. **Export selon la spec §11** : pourcentages de résolution et tableau de débits.
7. Retrait des services de Recordly et changement de nom.

## À tester sur machine avant de décider

- Zone libre : existe-t-elle ?
- Changer de proportion déplace-t-il les zones ?
- Export pendant un export : bloqué ?
- Arrêt brutal pendant l'enregistrement sur Windows : récupération ?
