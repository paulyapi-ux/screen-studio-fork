# CLAUDE.md : fork de Recordly (nom définitif à venir)

Fork de **Recordly** (https://github.com/webadderallorg/Recordly, licence **AGPL-3.0**), repris le 26/10/2026 au commit `109ca3a` (v1.4.0, 17/10/2026). Application de bureau en Electron, React, TypeScript, avec des assistants natifs en C++ (capture Windows et Mac, export GPU).

**Lire d'abord** : `docs/ours/pivot-fork-recordly.md` (décisions, plan) et `docs/ours/spec.md` (notre spec v1).

**État au 27/10/2026** : le fork se lance et enregistre sur le PC Windows du propriétaire (compte Recordly non requis). Les six éléments de différenciation sont **décidés** (voir `docs/ours/pivot-fork-recordly.md`, sections « Décisions » et « Ordre de construction »). **Aucun n'est construit** : le code de composition essayé trop tôt a été annulé. Ne rien construire sans son accord ; une étape à la fois.

## Le propriétaire du projet

- Il parle français et **n'est pas développeur** : expliquer simplement, sans jargon, en disant ce qui est vérifié et ce qui ne l'est pas.
- Il a délégué les choix techniques (« bonnes pratiques »). Lui demander seulement ce qui change le produit.
- Machines : PC Windows (AMD Radeon RX 9070 XT + puce intégrée AMD, écran 4K) et Mac (M4).
- Branche de travail : `claude/sleepy-lamport-52ogfk`. Ne pas pousser sur `main` ni créer de pull request sans qu'il le demande.

## Règles propres au fork

- **Licence AGPL-3.0** : garder `LICENSE.md`, `THIRD_PARTY_NOTICES.md` et les mentions d'origine. Dire clairement que le projet dérive de Recordly.
- **Nom et logo de Recordly interdits dans notre produit** : à remplacer (le nom viendra plus tard). Ne pas ajouter de nouveau texte ou fichier qui dit « Recordly » dans l'interface.
- **Retirer plus tard** ce qui est lié aux services de Recordly : compte, marketplace d'extensions, mises à jour automatiques, annonces, liens de retour d'information.
- **Ne pas casser ce qui marche** : le code de Recordly a 1600 tests. Les garder verts. Reverser à Recordly les corrections utiles à tous (par exemple le secours d'encodeur Windows) quand c'est possible.
- **Ce qu'on ajoute** (voir le plan) : surtout la **composition libre** (déplacer chaque source sur le canevas, grille avec magnétisme, verrou de position, compositions sauvegardées), le secours d'encodeur Windows, le zoom qui reste ouvert pendant la frappe, la coupure du son par raccourci, la qualité d'aperçu, l'export selon notre spec.

## État de départ (vérifié sur Linux le 26/10)

- `npm ci --ignore-scripts` : OK. `npm run typecheck` : OK.
- `npm test` : **1601 réussis, 3 échecs** qui ne sont pas de vrais échecs : le binaire FFmpeg n'est pas téléchargé quand on saute les scripts d'installation (`ffmpeg-static`). Avec un `npm install` normal ils doivent passer.
- Construction native non testée ici (Windows et Mac nécessaires).

## Commandes

```bash
npm install            # télécharge FFmpeg, compile les assistants natifs (Windows : Visual Studio Build Tools + CMake)
npm run dev            # lance l'application en développement
npm run typecheck
npm test               # vitest
npm run lint           # biome
npm run i18n:check     # vérifie les traductions (le français existe déjà)
npm run build:win | build:mac
```

Windows : outils à installer une fois : `winget install Kitware.CMake` (Build Tools C++ déjà installés chez le propriétaire).

## Où est quoi

- `electron/` : processus principal, IPC, capture, export (`electron/ipc/`), assistants natifs C++ (`electron/native/wgc-capture`, `windows-capture`, `gpu-export-probe`, …).
- `src/components/video-editor/` : l'éditeur (préférences, export, panneaux de réglages, lecture). `src/lib/exporter/` : export.
- `src/i18n/locales/` : traductions (de, en, es, fr, it, ko, nl, pt-BR, ru, zh-CN, zh-TW).
- Encodage vidéo Windows de leur capture : `electron/native/wgc-capture/src/mf_encoder.cpp` (Sink Writer, encodeur matériel sans secours : c'est ici qu'ajouter l'essai de l'encodeur matériel).

## Règles de travail

- Avant chaque commit : `npm run typecheck`, `npm test`, `npm run lint`. Ne jamais pousser du code qui ne compile pas ; en shell Unix utiliser `set -eo pipefail`.
- Dates et durées : voir la remarque sur les microsecondes entières dans le prototype ; ici les unités sont celles de Recordly, les respecter.
- Le curseur n'est pas filmé : il est redessiné par l'éditeur (comme chez Recordly).
- Les touches : ne jamais enregistrer leur code (vie privée), seulement qu'une frappe a eu lieu.
