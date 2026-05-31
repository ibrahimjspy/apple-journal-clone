# Apple Journal Clone

> An open-source Apple Journal clone for Android users who deserve a beautiful journaling experience.

![Platform](https://img.shields.io/badge/platform-Android-green)
![Framework](https://img.shields.io/badge/framework-Expo%20SDK%2054-blue)
![License](https://img.shields.io/badge/license-MIT-purple)

---

## Why This Exists

Apple's Journal app is genuinely beautiful — especially the audio journaling experience. But if you're on Android? Your options are:

- **Paid apps** charging $100+/year for basic features
- **Free apps** with cluttered UIs and aggressive ads
- **"Premium" apps** that feel like they were designed in 2010

This project brings the elegant, focused journaling experience of Apple Journal to Android — **completely free and open source**.

---

## Architecture

### Local-First. Your Data is Yours.

```
┌────────────────────────────────────────────────────────────┐
│                  Apple Journal Clone                       │
├────────────────────────────────────────────────────────────┤
│  AsyncStorage         — entries metadata (single JSON key) │
│  Document directory   — image & audio files                │
│  Storage Access Fwk   — exports/imports to user folders    │
└────────────────────────────────────────────────────────────┘
```

- **No backend API.** Everything runs on-device.
- **Local file storage.** Images and audio live in the app's persistent document directory.
- **Manual cloud-free backups.** Settings → Backup exports a browsable `AppleJournal/` folder you can copy to another phone or to Google Drive yourself.

---

## Features

### Journal Feed
- Beautiful entry cards in a scrollable feed (dark theme, Apple-inspired)
- Smart adaptive image grids (1/2/3/4/5+ patterns) on cards
- Audio tile per entry with waveform playback (and a "+N more" badge for multi-recording entries)
- Filter by: **All**, **Photos**, **Audio**
- Pull to refresh, three-dots action sheet (Bookmark / Delete)

### Create / Edit
- Optional title + plain text content blocks
- Add images from gallery (multi-select) or camera
- Voice notes with **pause/resume**, live waveform from real metering, and inline playback
- Bookmark toggle, delete with confirmation

### Backup (Android)
- **Export to Folder** — picks a user-chosen directory (via SAF) and writes one folder per entry containing `entry.json`, `content.md`, and `images/` + `audio/` files
- **Restore from Folder** — reads a previously exported folder and **merges** entries (never overwrites existing ones)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54 + React Native 0.81 + React 19.1 |
| Language | TypeScript (strict) |
| Routing | `expo-router` (file-based) |
| Metadata storage | `@react-native-async-storage/async-storage` |
| Media storage | `expo-file-system/legacy` |
| Backup I/O | `expo-file-system` `StorageAccessFramework` |
| Audio | `expo-audio` (record + playback) |
| Images | `expo-image-picker` |
| Fonts | Inter via `@expo-google-fonts/inter` (closest open match to SF Pro) |
| Tests | Jest + `jest-expo` + `@testing-library/react-native` |
| Theme | Dark mode (only) |

---

## Intentionally Out of Scope (V1)

| Feature | Why Not |
|---------|---------|
| Cloud sync (Drive / iCloud) | Local-only V1; folder export covers backup needs |
| Rich text editing | Apple Journal is plain text + blocks; we follow suit |
| iOS native build | Android-first; SAF backup has no iOS equivalent |
| Transcription | Future — would need on-device ML model |
| Multiple journals | Future — single journal in V1 |
| Lock / passcode | Future — would use Android Keystore |

---

## Getting Started

```bash
git clone https://github.com/ibrahimjspy/apple-journal-clone.git
cd apple-journal-clone

npm install --legacy-peer-deps

# Start dev server, then scan QR with Expo Go on your Android phone
npx expo start

# Or build a native development client (needs JDK 17 + Android Studio)
npx expo run:android
```

---

## Tests

```bash
npm test                  # full Jest suite
npx jest <pattern>        # filter
```

91 unit tests across 7 suites covering storage CRUD (including
corrupt-storage guards and merge semantics), media file persistence,
backup format serializers, layout planners, and shared utilities.

End-to-end flows for Maestro live in `.maestro/`. Running them needs
Android Studio + Java + a connected device.

---

## Project Conventions

If you plan to contribute or extend this app, **read `CLAUDE.md`** first —
it documents the module boundaries (`utils/` is pure, `services/` does
I/O, components depend on both via `@/` alias), key conventions
(JSDoc on why-not-what, theme tokens for all spacing/colours/fonts),
and the hard-won lessons around `expo-audio` versioning, SDK-54
file-system migration, and bottom-sheet keyboard handling inside
React Native Modals.

The repo also ships two Cursor-skill workflows used to vet recent work:
- `.cursor/skills/refactor/` — 8-phase systematic refactoring
- (`~/.cursor/skills/productionalise/` + `~/.cursor/skills/bug-hunter/`
  are global skills the maintainer uses pre-release)

---

## License

MIT License — Use it, fork it, make it yours.

---

## Philosophy

> "The best journal is the one you actually use."

We're not trying to build the most feature-rich journaling app. We're
building one that's **beautiful enough to open daily** and **simple
enough to actually write in**.

---

<p align="center">
  <i>Built for Android users who just want to journal in peace.</i>
</p>
