/**
 * Backup export/import using Android's Storage Access Framework (SAF).
 *
 * Lets the user save their journal to a folder of their choice
 * (Documents, SD card, etc.) where every entry becomes a sub-folder
 * containing `entry.json`, `content.md`, and `images/` + `audio/`
 * media files. Importing reverses this process and merges entries
 * back into local storage (skipping any IDs that already exist).
 *
 * iOS is not supported in V1 — Android SAF has no iOS equivalent.
 * The pure data-shape logic lives in services/backup.ts so it can be
 * unit-tested without touching the file system.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework, EncodingType } from 'expo-file-system/legacy';
import {
  buildManifest,
  buildEntryJson,
  buildEntryMarkdown,
  parseManifest,
  parseEntryJson,
} from './backup';
import { getEntries, mergeEntries } from './storage';
import { JournalEntry, ContentBlock } from '@/types/journal';
import { generateId } from '@/utils/id';

/** Name of the top-level folder we create inside the user's chosen directory. */
const ROOT_FOLDER_NAME = 'AppleJournal';

/** App version embedded in manifest.json (informational; not used for migrations yet). */
const APP_VERSION = '1.0.0';

/** Result of an export attempt. */
export interface ExportResult {
  success: boolean;
  entryCount: number;
  /** SAF URI of the root folder we wrote to (when successful). */
  folderUri?: string;
  /** Human-readable error when success is false. */
  error?: string;
  /** True when the user cancelled the SAF directory picker. */
  cancelled?: boolean;
}

/** Result of an import attempt. */
export interface ImportResult {
  success: boolean;
  restoredCount: number;
  skippedCount: number;
  error?: string;
  cancelled?: boolean;
}

/**
 * Lets the user pick a directory and writes a full backup into it.
 * Returns counts and any error in a structured result (never throws).
 */
export async function exportEntriesToFolder(): Promise<ExportResult> {
  if (Platform.OS !== 'android') {
    return {
      success: false,
      entryCount: 0,
      error: 'Folder export is currently Android-only.',
    };
  }

  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!perm.granted) {
    return { success: false, entryCount: 0, cancelled: true, error: 'No folder selected.' };
  }

  try {
    const entries = await getEntries();
    const rootUri = await StorageAccessFramework.makeDirectoryAsync(perm.directoryUri, ROOT_FOLDER_NAME);

    // manifest.json
    const manifest = buildManifest(entries, APP_VERSION);
    await writeJson(rootUri, 'manifest', manifest);

    for (const entry of entries) {
      const folderName = manifest.entries.find(e => e.id === entry.id)?.folderName;
      if (!folderName) continue;

      const entryFolderUri = await StorageAccessFramework.makeDirectoryAsync(rootUri, folderName);

      // entry.json
      await writeJson(entryFolderUri, 'entry', buildEntryJson(entry));

      // content.md
      const mdUri = await StorageAccessFramework.createFileAsync(
        entryFolderUri,
        'content',
        'text/markdown'
      );
      await StorageAccessFramework.writeAsStringAsync(mdUri, buildEntryMarkdown(entry));

      // Media files
      await writeEntryMedia(entryFolderUri, entry);
    }

    return { success: true, entryCount: entries.length, folderUri: rootUri };
  } catch (error) {
    console.error('Export failed:', error);
    return {
      success: false,
      entryCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Lets the user pick an existing AppleJournal backup folder and merges
 * its entries into the app. Entries whose IDs already exist are skipped
 * (no silent overwrites).
 */
export async function importEntriesFromFolder(): Promise<ImportResult> {
  if (Platform.OS !== 'android') {
    return {
      success: false,
      restoredCount: 0,
      skippedCount: 0,
      error: 'Folder import is currently Android-only.',
    };
  }

  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!perm.granted) {
    return { success: false, restoredCount: 0, skippedCount: 0, cancelled: true, error: 'No folder selected.' };
  }

  try {
    const rootContents = await StorageAccessFramework.readDirectoryAsync(perm.directoryUri);
    const manifestUri = findChildByName(rootContents, 'manifest.json');
    if (!manifestUri) {
      return {
        success: false,
        restoredCount: 0,
        skippedCount: 0,
        error: 'No manifest.json found. Please pick the root AppleJournal backup folder.',
      };
    }

    const manifestText = await StorageAccessFramework.readAsStringAsync(manifestUri);
    const manifest = parseManifest(manifestText);

    const restored: JournalEntry[] = [];

    for (const entryRef of manifest.entries) {
      const entryFolderUri = findChildByName(rootContents, entryRef.folderName);
      if (!entryFolderUri) continue;

      const restoredEntry = await readEntryFolder(entryFolderUri, entryRef.id);
      if (restoredEntry) {
        restored.push(restoredEntry);
      }
    }

    const { added, skipped } = await mergeEntries(restored);

    return {
      success: true,
      restoredCount: added,
      skippedCount: skipped + (manifest.entries.length - restored.length),
    };
  } catch (error) {
    console.error('Import failed:', error);
    return {
      success: false,
      restoredCount: 0,
      skippedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// --- internal helpers ---

/** Write a JSON file under `parentUri` with the given base name (extension auto-appended by SAF). */
async function writeJson(parentUri: string, baseName: string, data: unknown): Promise<void> {
  const fileUri = await StorageAccessFramework.createFileAsync(parentUri, baseName, 'application/json');
  await StorageAccessFramework.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
}

/** Copy all image and audio media for an entry into the SAF entry folder. */
async function writeEntryMedia(entryFolderUri: string, entry: JournalEntry): Promise<void> {
  const imageBlocks = entry.content.filter(b => b.type === 'image');
  const audioBlocks = entry.content.filter(b => b.type === 'audio');

  if (imageBlocks.length > 0) {
    const dir = await StorageAccessFramework.makeDirectoryAsync(entryFolderUri, 'images');
    for (let i = 0; i < imageBlocks.length; i++) {
      const block = imageBlocks[i];
      const ext = extensionFromUri(block.content, 'jpg');
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      await copyLocalToSaf(block.content, dir, padIndex(i + 1), mime);
    }
  }

  if (audioBlocks.length > 0) {
    const dir = await StorageAccessFramework.makeDirectoryAsync(entryFolderUri, 'audio');
    for (let i = 0; i < audioBlocks.length; i++) {
      const block = audioBlocks[i];
      const ext = extensionFromUri(block.content, 'm4a');
      const mime = ext === 'mp3' ? 'audio/mpeg' : 'audio/mp4'; // m4a/mp4 default
      await copyLocalToSaf(block.content, dir, padIndex(i + 1), mime);
    }
  }
}

/** Copy a file from app-private storage into a SAF directory. */
async function copyLocalToSaf(sourceUri: string, dirUri: string, baseName: string, mime: string): Promise<void> {
  const data = await FileSystem.readAsStringAsync(sourceUri, { encoding: EncodingType.Base64 });
  const fileUri = await StorageAccessFramework.createFileAsync(dirUri, baseName, mime);
  await StorageAccessFramework.writeAsStringAsync(fileUri, data, { encoding: EncodingType.Base64 });
}

/**
 * Read an entry folder back into a JournalEntry. Returns null if entry.json
 * is missing or media files referenced in it can't be found.
 */
async function readEntryFolder(folderUri: string, expectedId: string): Promise<JournalEntry | null> {
  const folderContents = await StorageAccessFramework.readDirectoryAsync(folderUri);
  const entryJsonUri = findChildByName(folderContents, 'entry.json');
  if (!entryJsonUri) return null;

  const entryJsonText = await StorageAccessFramework.readAsStringAsync(entryJsonUri);
  const entryData = parseEntryJson(entryJsonText);

  if (entryData.id !== expectedId) {
    // Manifest and entry.json disagree — trust entry.json's id.
  }

  // Map "images/01.jpg" → SAF URI by listing the images/ and audio/ subfolders.
  const fileMap = new Map<string, string>();
  await collectMediaFiles(folderContents, 'images', fileMap);
  await collectMediaFiles(folderContents, 'audio', fileMap);

  const restoredBlocks: ContentBlock[] = [];

  for (const block of entryData.blocks) {
    if (block.type === 'text') {
      restoredBlocks.push({ id: generateId(), type: 'text', content: block.content });
      continue;
    }
    const safUri = fileMap.get(block.file);
    if (!safUri) continue; // skip blocks whose media couldn't be located

    if (block.type === 'image') {
      const localUri = await copySafToLocal(safUri, 'images', extensionFromName(block.file, 'jpg'));
      restoredBlocks.push({
        id: generateId(),
        type: 'image',
        content: localUri,
        imageData: {
          id: generateId(),
          uri: localUri,
          width: block.width || 0,
          height: block.height || 0,
        },
      });
    } else if (block.type === 'audio') {
      const localUri = await copySafToLocal(safUri, 'audio', extensionFromName(block.file, 'm4a'));
      restoredBlocks.push({
        id: generateId(),
        type: 'audio',
        content: localUri,
        audioData: {
          id: generateId(),
          uri: localUri,
          duration: block.duration,
          waveform: block.waveform,
          createdAt: entryData.createdAt,
        },
      });
    }
  }

  return {
    id: entryData.id,
    title: entryData.title,
    isBookmarked: entryData.isBookmarked,
    createdAt: entryData.createdAt,
    updatedAt: entryData.updatedAt,
    content: restoredBlocks,
    previewText: restoredBlocks
      .filter(b => b.type === 'text')
      .map(b => b.content)
      .join(' ')
      .slice(0, 200),
    previewImages: restoredBlocks
      .filter(b => b.type === 'image')
      .map(b => b.content)
      .slice(0, 6),
    hasAudio: restoredBlocks.some(b => b.type === 'audio'),
  };
}

/** Read a media file from SAF and write it into the app's persistent media directory. */
async function copySafToLocal(safUri: string, kind: 'images' | 'audio', ext: string): Promise<string> {
  const data = await StorageAccessFramework.readAsStringAsync(safUri, { encoding: EncodingType.Base64 });
  const dir = `${FileSystem.documentDirectory}media/${kind}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const localUri = `${dir}${generateId()}.${ext}`;
  await FileSystem.writeAsStringAsync(localUri, data, { encoding: EncodingType.Base64 });
  return localUri;
}

/** Find a single child URI inside a list whose displayed name matches `targetName`. */
function findChildByName(uris: string[], targetName: string): string | undefined {
  const target = targetName.toLowerCase();
  for (const uri of uris) {
    const name = nameFromSafUri(uri);
    if (name.toLowerCase() === target) return uri;
  }
  return undefined;
}

/**
 * For each file inside the named subdirectory, store a `kind/filename` → SAF URI mapping.
 * Used to resolve `images/01.jpg` references from entry.json back to real content URIs.
 */
async function collectMediaFiles(
  folderContents: string[],
  subdirName: string,
  out: Map<string, string>
): Promise<void> {
  const subdirUri = findChildByName(folderContents, subdirName);
  if (!subdirUri) return;
  const files = await StorageAccessFramework.readDirectoryAsync(subdirUri);
  for (const fileUri of files) {
    const fileName = nameFromSafUri(fileUri);
    out.set(`${subdirName}/${fileName}`, fileUri);
  }
}

/**
 * Extract the display name (last path segment) from a SAF `content://` URI.
 * SAF URIs URL-encode the document ID which contains the actual file path.
 */
function nameFromSafUri(uri: string): string {
  const decoded = decodeURIComponent(uri);
  const segments = decoded.split('/');
  return segments[segments.length - 1] || '';
}

function extensionFromUri(uri: string, fallback: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  return match ? match[1].toLowerCase() : fallback;
}

function extensionFromName(name: string, fallback: string): string {
  const idx = name.lastIndexOf('.');
  if (idx < 0) return fallback;
  return name.slice(idx + 1).toLowerCase();
}

function padIndex(n: number): string {
  return n.toString().padStart(2, '0');
}
