# Documents propres à notre projet

Ce dépôt est un **fork de [Recordly](https://github.com/webadderallorg/Recordly)** (AGPL-3.0). Ce dossier regroupe ce qui appartient à notre projet et pas à Recordly.

- `spec.md` : notre spécification v1 (écrite avant le fork).
- `pivot-fork-recordly.md` : pourquoi on part de Recordly, ce qui existe déjà, ce qu'on ajoute, le plan.
- `compositions-par-defaut/` : trois compositions par défaut (long 16:9, court 9:16, webcam plein écran), au format JSON de notre prototype. À réutiliser comme modèle pour les compositions sauvegardées.

Le prototype d'origine (Tauri, Rust) reste dans le dépôt `paulyapi-ux/screen-record-project`, comme **référence** : format de projet, moteur de zoom, logique de secours d'encodeur Windows (`src-tauri/src/capture/windows/`), débits d'export.
