# Take

**Record your screen, then arrange it freely.** Take is a desktop screen recorder and editor for creators, with a zoom that follows what you do and a canvas where every source (screen, webcam) goes exactly where you want it.

> Working name and provisional logo. The final name may change.

## What makes it different

- **Free composition.** Move and resize the screen and the webcam anywhere on the canvas. Snap to the edges, to each other and to an optional grid, with alignment guides. Lock a source so it never moves by accident. Save the layout as a preset for a given format (16:9, 9:16, 1:1, 4:5…).
- **Zoom that follows you.** Automatic zooms on clicks, plus a zoom that stays open while you type in a text field. Only the *moment* of a keystroke is noted, never which key.
- **Shortcuts that work everywhere.** Global start/stop, pause and restart-from-zero (with a short delay to cancel), all editable. Editor shortcuts for export, moving the playhead and muting the preview.
- **Safe video encoding on Windows.** The hardware encoder is tested in the background at startup; if it does not respond, recording falls back to the software encoder automatically.
- **Preview quality.** Full, half or quarter resolution while you edit, without touching the exported file.
- **Everything local.** No account, no cloud, no tracking, no automatic updates.

It also keeps what the project it is built on already does well: timeline editing, cursor polish and motion effects, webcam styling, annotations, local Whisper captions, MP4 and GIF export.

## Platforms

- **Windows 10 (build 19041+) and macOS 14+**: developed and tested.
- **Linux**: inherited from the base project, not tested here.

## Run it from source

```bash
npm install     # downloads FFmpeg and builds the native helpers
npm run dev     # starts the app in development mode
```

Windows needs the Visual Studio Build Tools (C++) and CMake; macOS needs the Xcode command line tools.

```bash
npm run typecheck
npm test
npm run lint
npm run build:win   # or build:mac
```

On macOS, grant Screen Recording, Accessibility and Input Monitoring to the app (in development it appears as *Electron*, or to your Terminal), then restart it.

## Credits and license

Take is **free software under the AGPL-3.0 license** (see [LICENSE.md](LICENSE.md)). It is built on [**Recordly**](https://github.com/webadderallorg/Recordly) by webadderall, which itself started as a fork of the **OpenScreen** project by Siddharth Vaddem. Both are credited in the app (Settings > About) and in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The name and logo of Recordly are not used by Take.

If you distribute Take, or let people use a modified version over a network, the AGPL requires you to make the complete source code, including your changes, available under the same license.

Project notes (decisions, plan, spec) are in [docs/ours](docs/ours).
