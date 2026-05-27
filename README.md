# Quanta — Atomic Learning App

A personal knowledge app built around the forgetting curve. Write atomic notes, link concepts, and let spaced repetition tell you exactly when to review — so nothing you learn is lost.

## Features

- **Atomic notes** — one concept per note, linked to others
- **Spaced repetition** — SM-2 algorithm schedules reviews based on your recall quality
- **Forgetting curve visualisation** — see your retention % per topic
- **Insight capture** — record the moment a connection clicks, in your own words
- **Knowledge graph** — see your concepts as a connected constellation
- **PWA** — install on your laptop like a native app
- **Web notifications** — get reminded when notes are due, even when the app is closed
- **Export/import** — back up your entire knowledge base as JSON

## Stack

- React 18 + Vite
- IndexedDB via `idb` (fully local, no backend)
- PWA via `vite-plugin-pwa`
- Web Notifications API

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build for production

```bash
npm run build
npm run preview
```

## Installing as a desktop app (PWA)

After running `npm run build` and serving the `dist` folder, open the app in Chrome or Edge and click the install icon in the address bar. The app will appear in your taskbar and run in its own window.

## Data

All notes are stored in your browser's IndexedDB. Use **Progress → Export backup** regularly to save a JSON backup. Your data never leaves your device.
