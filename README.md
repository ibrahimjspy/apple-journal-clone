# Apple Journal Clone

> An open-source Apple Journal clone for Android users who deserve a beautiful journaling experience.

![Platform](https://img.shields.io/badge/platform-Android-green)
![Framework](https://img.shields.io/badge/framework-Expo%20React%20Native-blue)
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
┌─────────────────────────────────────────┐
│         Apple Journal Clone             │
├─────────────────────────────────────────┤
│  AsyncStorage (entries metadata)        │
│  Device Storage (images & audio files)  │
└─────────────────────────────────────────┘
```

- **No backend API** — Everything runs on-device
- **No database servers** — We don't store your journals
- **Local file storage** — Images and audio are saved to the app's persistent document directory
- **AsyncStorage** — Entry metadata and content blocks

---

## Features

### Journal Feed
- Beautiful entry cards in a scrollable feed
- Dark theme (Apple-inspired aesthetic)
- Image grid previews on cards
- Audio tiles with waveform visualization
- Filter by: All, With Photos, With Audio

### Journal Entry Creation
| Feature | Description |
|---------|-------------|
| **Title** | Optional title for each entry |
| **Text** | Plain text content blocks |
| **Images** | Pick from gallery (multi-select) or take with camera — persisted to local storage |
| **Audio** | Tap-to-record with live waveform, pause/resume, inline playback |

### Audio Journaling
The audio experience is what sets Apple Journal apart. We've replicated:
- Tap-to-record simplicity
- Pause and resume while recording
- Visual waveform feedback (real-time metering)
- Compact and full waveform playback
- Inline audio players in entries
- Audio tiles on home cards with animated bars

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 52 + React Native 0.76 |
| Language | TypeScript |
| Routing | expo-router (file-based) |
| Storage | AsyncStorage (metadata) + expo-file-system (media) |
| Audio | expo-av (record + playback) |
| Images | expo-image-picker |
| Theme | Dark mode only (for now) |

---

## Intentionally Out of Scope (V1)

| Feature | Why Not |
|---------|---------|
| Cloud sync / Google Drive | Keeping V1 simple and local-only |
| Rich text editing | Adds complexity, journals should be simple |
| Social features | This is personal journaling |
| Premium tier | Forever free, forever open |

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/apple-journal-clone.git
cd apple-journal-clone

# Install dependencies
npm install

# Start the Expo development server
npx expo start

# Run on Android
npx expo run:android
```

---

## Contributing

We welcome contributions! Whether it's:
- Bug fixes
- Feature implementations
- Design improvements
- Documentation

Please read our contributing guidelines before submitting PRs.

---

## License

MIT License — Use it, fork it, make it yours.

---

## Philosophy

> "The best journal is the one you actually use."

We're not trying to build the most feature-rich journaling app. We're building one that's **beautiful enough to open daily** and **simple enough to actually write in**.

---

<p align="center">
  <i>Built for Android users who just want to journal in peace.</i>
</p>
