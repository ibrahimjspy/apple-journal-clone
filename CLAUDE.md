# CLAUDE.md

Project context for AI coding agents (Claude / Cursor) and humans alike.
Read this before making non-trivial changes.

---

## What This Is

An open-source, **Android-first Apple Journal clone** built with Expo. Aims to
replicate the elegant, focused journaling experience of Apple's iOS Journal app
for users who don't have an iPhone, without paid tiers, ads, or telemetry.

V1 is **fully local** — no cloud sync, no backend, no auth. Entries are stored
on-device in AsyncStorage, and media files (images + voice notes) live in the
app's persistent document directory. The user can export everything to a
folder of their choice (Documents, Downloads, SD card) and restore it later
or on a new phone via the **Settings → Backup** screen.

The product owner currently uses it personally; future versions may add Drive
sync, transcription, and an iOS build.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Expo SDK 54 (`expo` `^54.0.0`) | RN 0.81, React 19.1, New Architecture |
| Language | TypeScript (strict) | Path alias `@/*` resolves to project root |
| Routing | `expo-router` | File-based routes in `app/` |
| Storage (metadata) | `@react-native-async-storage/async-storage` | Single key `journal_entries` |
| Storage (media files) | `expo-file-system/legacy` | App-private `documentDirectory/media/` |
| Audio | `expo-audio` `~1.1.1` | **Not `expo-av`** — deprecated in SDK 54 |
| Images | `expo-image-picker` | Gallery + camera |
| Backup I/O | `expo-file-system` `StorageAccessFramework` | Android-only (SAF) |
| Fonts | `@expo-google-fonts/inter` | Apple's SF Pro is proprietary; Inter is the closest open match |
| Tests | Jest + `jest-expo` + `@testing-library/react-native` | Plain unit tests, no E2E in repo (Maestro flows exist in `.maestro/`) |

---

## Directory Layout

```
app/                       Expo Router routes
├── _layout.tsx              Root layout (font loading, stack)
├── index.tsx                Redirects to /home
├── home.tsx                 Journal entries list + filter pills + FAB
└── settings.tsx             Backup export / import UI

components/                Presentational + container components
├── ActionSheet.tsx          Apple-style sliding action sheet
├── AudioPlayer.tsx          Full + compact waveform players (used in entry view + compose)
├── AudioRecorder.tsx        Live waveform recorder with pause/resume
├── AudioRecorderModal.tsx   Modal wrapper for the recorder
├── AudioTile.tsx            Gradient pill player shown on home cards
├── BottomSheet.tsx          Reusable sliding bottom sheet (Modal-based)
├── CardImageGrid.tsx        Smart 1/2/3/4/5+ image grid (Apple catalog style)
├── ContentBlockRenderer.tsx Renders a text/image/audio content block
├── CreateEntrySheet.tsx     New entry sheet (title + text + media)
├── ViewEntrySheet.tsx       View/edit sheet (read mode ↔ edit mode)
├── MediaToolbar.tsx         Bottom toolbar inside compose sheets (camera, audio, etc.)
├── Icons.tsx                Ionicons wrapper + brand mark + filter icon
└── index.ts                 Barrel — only exports symbols actually consumed

services/                  Side-effectful logic (storage, file I/O, audio)
├── storage.ts               AsyncStorage CRUD + mergeEntries + toggleBookmark, throws CorruptStorageError
├── media.ts                 Persistent media file save/delete (legacy file system)
├── backup.ts                PURE serializers for backup format (no I/O, fully unit-tested)
└── exportImport.ts          SAF-based export/import using backup.ts helpers

utils/                     Pure helpers (no React, no native deps, all unit-tested)
├── alert.ts                 Cross-platform Alert / Confirm
├── id.ts                    generateId() — timestamp + random
├── time.ts                  formatDurationMs / formatDurationSecs
├── imageGrid.ts             planImageGrid() — picks layout pattern by image count
└── slugify.ts               slugify() + buildEntryFolderName() for backup folders (id-suffixed to avoid collisions)

constants/
├── theme.ts                 colors, spacing, borderRadius, typography, fonts, shadows
└── app.ts                   app-wide numeric/string constants (preview caps, audio intervals, etc.)

types/
└── journal.ts               JournalEntry, ContentBlock, AudioEntry, ImageEntry

hooks/
└── useContentEditor.ts      Shared editor state for create + view/edit sheets
                              (text updates, media picking, audio recording → persisted to disk)

__tests__/                 Jest unit tests
.maestro/                  Android E2E test flows (Maestro YAML) — requires Android Studio + Java
.cursor/skills/refactor/   The "refactor" skill — read SKILL.md before any cleanup work
```

---

## Data Model (read `types/journal.ts`)

```typescript
ContentBlock = { type: 'text' | 'image' | 'audio', content: string, ... }
   // For text: `content` is the actual text.
   // For media: `content` is the persistent file:// URI under documentDirectory/media/...

JournalEntry = {
  id, title, content: ContentBlock[],
  createdAt, updatedAt,
  isBookmarked?: boolean,
  // computed previews (cached at save-time to avoid re-parsing on every render):
  previewText?, previewImages?, hasAudio?
}
```

**Why block-based, not rich-text:** Apple Journal is intentionally a simple
text + media composer, not a rich-text editor. Each block is independent;
the renderer in `ContentBlockRenderer.tsx` just dispatches by `block.type`.

---

## Where Stuff Lives On Disk

### App-private storage
- **Metadata** (entry list) → AsyncStorage key `journal_entries`
- **Image files** → `${FileSystem.documentDirectory}media/images/<id>.<ext>`
- **Audio files** → `${FileSystem.documentDirectory}media/audio/<id>.<ext>`

On Expo Go these go into Expo Go's sandbox; on a standalone build they're
under the app's package. Either way, **uninstalling the app deletes them**.

### Backup folder structure (user-chosen via SAF)

```
AppleJournal/
├── manifest.json              top-level index: format version + entry list
├── 2026-05-28_hello-world/
│   ├── entry.json             machine-readable: blocks reference relative paths
│   ├── content.md             human-readable: title, date, text, ![images], 🎙 audio
│   ├── images/01.jpg
│   ├── images/02.png
│   └── audio/01.m4a
└── 2026-05-27_another-entry/...
```

Folder names: `YYYY-MM-DD_slug` for chronological sort in the Android Files
app. Slug is generated by `utils/slugify.ts` (strips diacritics, emoji,
special chars; caps at 50 chars; falls back to `"untitled"`).

---

## Module Boundaries (Important)

- **`utils/`** is the only place for **pure** logic. No React, no native modules.
  Anything here MUST be unit-testable in plain Node.
- **`services/`** contains side-effectful logic. They depend on `utils/` and
  `types/`, never on `components/` or `app/`.
- **`services/backup.ts`** is the exception: it's pure (no I/O) on purpose, so
  serialization is testable. The matching I/O lives in `services/exportImport.ts`.
- **`components/`** depends on services and utils via the `@/` alias, never
  reaches inside another component's internals.
- **`hooks/useContentEditor.ts`** is the canonical example of how to mix
  React state with services — it owns the editor state and calls into
  `services/media.ts` for persistence.

When adding new logic, ask: "is this pure?" → utils. "Does this touch the
file system / network / device APIs?" → services. "Does this need to live
inside a component tree?" → hook or component.

---

## Key Conventions

### Code style
- **TypeScript strict.** No implicit `any`. Exported functions get explicit
  return types where the signature isn't trivially inferred.
- **JSDoc on the "why", not the "what".** A JSDoc comment should explain
  non-obvious intent, trade-offs, or constraints the code can't convey.
  Do NOT write `/** Renders a button */` on a Button.
- **Prefer pure functions in `utils/`** over class methods. Easier to test,
  reason about, and tree-shake.
- **Module-level JSDoc** at the top of files that orchestrate multiple
  concerns (e.g., `services/storage.ts`, `services/exportImport.ts`).
- **No shallow code.** Every async call has error handling. Every effect has
  cleanup. Every render handles missing data. See
  `.cursor/skills/refactor/SKILL.md` Phase 5 for examples.

### Naming
- Components: `PascalCase.tsx`
- Hooks: `useFooBar.ts`
- Services / utils: `kebabCase.ts` (single concept per file)
- Test files: `<source>.test.ts` colocated under `__tests__/`

### Imports
- Use the `@/` path alias for cross-folder imports.
  ✅ `import { generateId } from '@/utils/id'`
  ❌ `import { generateId } from '../../utils/id'`
- Barrel files (`components/index.ts`, `services/index.ts`) only re-export
  symbols that are actually consumed. Don't re-export everything by reflex.

### Styling
- All colors, spacing, fonts, etc. live in `constants/theme.ts`. No raw hex
  values in component styles.
- Inter font family via `fonts.regular / medium / semibold / bold`. Never use
  `fontWeight` directly — it doesn't apply to custom font files on Android.

---

## Gotchas / Hard-Won Lessons

### `expo-audio`, not `expo-av`
SDK 53 deprecated `expo-av`; SDK 54 removed it from Expo Go. We use
`expo-audio` `~1.1.1`. The API for **this exact version** is:
- `useAudioRecorder(options, statusListener?)` — pass `isMeteringEnabled: true`
  in options or **the live waveform stays flat** (the `HIGH_QUALITY` preset
  does NOT include metering)
- `useAudioPlayer(source, options)` — note: second arg is an **options object**
  `{ updateInterval: 500 }`, NOT a number (that was the SDK 53/54-pre-1.1 API)
- `requestRecordingPermissionsAsync()` is a top-level export (not under
  `AudioModule.*` like in SDK 55)

If you see `Received N arguments, but M was expected` from a useAudio* call,
the npm version of `expo-audio` and the bundled native module in Expo Go are
mismatched. Run `npx expo install expo-audio` to align versions.

### `expo-file-system/legacy`
SDK 54 introduced a new `File` / `Directory` class-based API and deprecated
the top-level functions (`getInfoAsync`, `copyAsync`, `writeAsStringAsync`).
We import from `expo-file-system/legacy` everywhere for now. If you migrate,
do it module by module and update tests.

### Bottom sheet + keyboard
The `BottomSheet` is a `Modal`. `KeyboardAvoidingView` inside an Android
Modal does NOT work — the Modal has its own dimensions independent of the
window. Our solution (in `components/BottomSheet.tsx`): listen to `Keyboard`
events and shift the sheet up by `bottom: keyboardHeight`, shrinking its
height to fit. Do not wrap children in `KeyboardAvoidingView`.

### Storage Access Framework is Android-only
`StorageAccessFramework` has no iOS equivalent. iOS Files behaves differently
and would need `expo-sharing` to share archives. V1 backup is Android-only;
iOS gracefully shows "Not supported" messages in the Settings screen.

### Fonts must finish loading before render
`app/_layout.tsx` blocks render with `if (!fontsLoaded) return null` and uses
`expo-splash-screen.preventAutoHideAsync()` until Inter is ready. Removing
this causes a brief flash of system font (very visible on Android).

---

## Testing

### Running
```bash
npm test                          # full suite (Jest)
npx jest __tests__/backup.test.ts # single file
npx jest --watch                  # watch mode
```

### Conventions
- **Mock at the module boundary**: e.g. `jest.mock('@react-native-async-storage/async-storage', ...)`
  not at the consuming file.
- **One assertion per behaviour.** Test names describe the behaviour
  (`"returns null for non-existent entry"`), not the implementation.
- **Test pure logic, not React internals.** Component snapshot tests are
  generally avoided. The exception is `LoginScreen.test.tsx` which tests
  the index → home redirect.
- **Round-trip tests for serializers**: `parse(build(x))` should equal `build(x)`.

### Current Coverage (as of last commit)
| Suite | Tests | Focus |
|-------|------:|-------|
| `utils.test.ts` | 9 | id generation, duration formatting |
| `slugify.test.ts` | 16 | slug edge cases, folder name uniqueness via id suffix |
| `imageGrid.test.ts` | 9 | layout pattern per image count |
| `backup.test.ts` | 24 | manifest + entry.json + markdown serializers, parser validation, round-trips |
| `storage.test.ts` | 23 | CRUD, corrupt-storage guard, deleteEntry ordering, bookmark toggle, merge semantics, calendar-day date formatting |
| `media.test.ts` | 9 | image/audio persistence, delete safety |
| `IndexRedirect.test.tsx` | 1 | index redirects to /home |
| **Total** | **91** | All passing |

### E2E (Maestro)
Flows in `.maestro/` cover home loads, create entry, view/edit, delete,
filter, and discard flow. Running requires Android Studio + Java + an
emulator. Not part of CI; useful for manual smoke tests before releases.

---

## Common Commands

```bash
# Development
npm start                           # start Metro bundler, scan QR with Expo Go
npm run android                     # native build + install (needs JDK 17 + Android Studio)
npm run ios                         # native build + install (macOS + Xcode)

# Testing
npm test                            # all Jest tests
npx jest <pattern>                  # filter

# Backup feature local test
# 1. Add some entries with images/audio in the app
# 2. Settings → Export to Folder → pick Documents
# 3. Open Files app → Documents/AppleJournal/ → verify structure
# 4. Settings → Restore from Folder → pick same folder → verify merge
```

---

## The "refactor" Skill

`.cursor/skills/refactor/SKILL.md` defines an 8-phase systematic refactoring
workflow used in this repo. **Read it before any large cleanup or refactor**:

1. **Audit** — tag every issue (DUP, SHARED, TYPE, TEST, PERF, BUG, DOC, SHALLOW, MODULE)
2. **Shared extraction** — move duplicated logic to `utils/` or `services/`
3. **Type hardening** — kill `any`, add return types, use library types
4. **Bug + perf fixes** — stale closures, missing memo, real bugs
5. **Shallow-code hardening** — error handling, cleanup, guards
6. **JSDoc for design decisions** — module-level docs + exported APIs
7. **Tests** — at least the core paths
8. **Final review** — linter, circular deps, barrel cleanup

The skill emphasises:
- **DRY** — extract before duplicating
- **Single responsibility** per file/function
- **Singleton services** — modules with state are singletons, not per-component classes
- **Types over runtime checks** when TypeScript can prevent the invalid state

---

## Intentionally Out of Scope (V1)

| Feature | Why Not |
|---------|---------|
| Cloud sync (Drive / iCloud) | Keep V1 simple; folder export covers backup |
| Rich text editing | Apple Journal is plain text; block-based is enough |
| iOS native build | Android-first; iOS would need separate folder backup story |
| Social features | This is personal journaling |
| Transcription | Future — would need on-device ML model |
| Multiple journals | Future — single journal in V1 |
| Lock / passcode | Future — Android Keystore-based |

---

## Project Health Signals

When making changes, you can quickly check the codebase is healthy by:
- `npm test` → all 80 tests should pass
- `npm start` → Metro should bundle without warnings about missing deps
- No imports from `expo-av` anywhere (`rg "from 'expo-av'"` should return nothing)
- No imports of `KeyboardAvoidingView` inside `Modal` (it's broken on Android)
- No direct AsyncStorage access outside `services/storage.ts`
- No raw `file://` paths or hard-coded SDK paths in components

---

## When You're Stuck

- **Audio not working** → check `expo-audio` version matches Expo Go's bundled
  module (`npx expo install expo-audio`)
- **Build failing on Android** → verify JDK 17 (not 21+), Kotlin 1.9.25
- **Tests failing after package upgrade** → check `jest-expo` version matches SDK,
  and that `react-native-worklets` is installed (Reanimated v4 dep)
- **Filter pills stretching vertically** → horizontal `ScrollView` needs
  `flexGrow: 0` (see `home.tsx` `filterScroll` style for the pattern)
- **Files showing as deprecated warnings from expo-file-system** → ensure you
  import from `expo-file-system/legacy` not the main entry
