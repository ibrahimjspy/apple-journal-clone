# Apple Journal Clone

> An open-source Apple Journal clone for Android users who deserve a beautiful journaling experience without the $100/year price tag.

![Platform](https://img.shields.io/badge/platform-Android-green)
![Framework](https://img.shields.io/badge/framework-Expo%20React%20Native-blue)
![License](https://img.shields.io/badge/license-MIT-purple)

---

## 🎯 Why This Exists

Apple's Journal app is genuinely beautiful—especially the audio journaling experience. But if you're on Android? Your options are:

- **Paid apps** charging $100+/year for basic features
- **Free apps** with cluttered UIs and aggressive ads
- **"Premium" apps** that feel like they were designed in 2010

This project aims to bring the elegant, focused journaling experience of Apple Journal to Android—**completely free and open source**.

---

## 🏗️ Architecture Philosophy

### Zero Backend. Zero Servers. Your Data is Yours.

```
┌─────────────────────────────────────────────────────────┐
│                      Open Journal                        │
├─────────────────────────────────────────────────────────┤
│  Local Storage (Quick Access)  ←→  Google Drive (Sync)  │
└─────────────────────────────────────────────────────────┘
```

- **No backend API** — Everything runs on-device
- **No database servers** — We don't store your journals
- **Google Drive integration** — Your entries sync to YOUR Google Drive
- **Local caching** — Fast access with in-app memory

Your journal entries live in your Google Drive folder. Uninstall the app? Your data remains safe in your cloud.

---

## ✨ Core Features

### Main Screen
- Beautiful journal entry cards in a scrollable feed
- Dark theme (Apple-inspired aesthetic)
- Quick access to recent entries

### Journal Entry Creation
| Feature | Description |
|---------|-------------|
| **Title** | Simple, clean title input |
| **Text** | Plain text content (no rich text complexity) |
| **Images** | Inline images within text — place photos exactly where they make sense contextually |
| **Audio** | 🎤 Apple-style audio recording with beautiful waveform visualization |

### Audio Journaling (Priority Feature)
The audio experience is what sets Apple Journal apart. We're replicating:
- Tap-to-record simplicity
- Visual waveform feedback
- Inline audio players in entries
- Seamless playback experience

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo React Native |
| Language | TypeScript |
| Storage | AsyncStorage + Google Drive API |
| Auth | Google OAuth (for Drive access) |
| Theme | Dark mode only (for now) |


## 🚫 Intentionally Out of Scope

To keep this focused and maintainable:

| Feature | Why Not |
|---------|---------|
| Rich text editing | Adds complexity, journals should be simple |
| Export functionality | Your data is already in Google Drive |
| Backend/API | Privacy-first, no servers needed |
| Social features | This is personal journaling |
| Premium tier | Forever free, forever open |

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/open-journal.git
cd open-journal

# Install dependencies
npm install

# Start the Expo development server
npx expo start

# Run on Android
npx expo run:android
```

---

## 🤝 Contributing

We welcome contributions! Whether it's:
- 🐛 Bug fixes
- ✨ Feature implementations
- 🎨 Design improvements
- 📝 Documentation

Please read our contributing guidelines before submitting PRs.

---

## 📄 License

MIT License — Use it, fork it, make it yours.

---

## 💭 Philosophy

> "The best journal is the one you actually use."

We're not trying to build the most feature-rich journaling app. We're building one that's **beautiful enough to open daily** and **simple enough to actually write in**.

---

<p align="center">
  <i>Built with ❤️ for Android users who just want to journal in peace.</i>
</p>

