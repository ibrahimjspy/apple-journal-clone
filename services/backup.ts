/**
 * Backup format: pure serialization helpers.
 *
 * This module knows the on-disk shape of an exported journal — a folder
 * containing a top-level `manifest.json` and one sub-folder per entry
 * with `entry.json`, `content.md`, and `images/` + `audio/` media files.
 *
 * All functions in this file are pure (no I/O, no native deps) so they
 * can be unit-tested in plain Node.
 *
 * See `services/exportImport.ts` for the actual file writing/reading.
 */

import { JournalEntry, ContentBlock } from '@/types/journal';
import { buildEntryFolderName } from '@/utils/slugify';
import { formatDurationMs } from '@/utils/time';

/** Bump when the on-disk format changes in an incompatible way. */
export const BACKUP_FORMAT_VERSION = 1;

/** Top-level manifest.json schema. */
export interface BackupManifest {
  version: number;
  exportedAt: string;
  appVersion: string;
  entries: Array<{
    id: string;
    folderName: string;
  }>;
}

/** entry.json schema (one per entry folder). */
export interface BackupEntry {
  id: string;
  title: string;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
  blocks: BackupBlock[];
}

/** Single content block in entry.json. Media blocks reference local files. */
export type BackupBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; file: string; width?: number; height?: number }
  | { type: 'audio'; file: string; duration: number; waveform: number[] };

/** Build the top-level manifest.json for a list of entries. */
export function buildManifest(entries: readonly JournalEntry[], appVersion: string): BackupManifest {
  return {
    version: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    entries: entries.map(e => ({
      id: e.id,
      folderName: buildEntryFolderName(e.title, e.createdAt),
    })),
  };
}

/**
 * Build the entry.json structure for a single entry.
 * Media blocks reference relative file paths within the entry folder
 * (e.g. `images/01.jpg`), not the original device URIs.
 */
export function buildEntryJson(entry: JournalEntry): BackupEntry {
  let imageIndex = 0;
  let audioIndex = 0;

  const blocks: BackupBlock[] = entry.content.map(block => {
    if (block.type === 'text') {
      return { type: 'text', content: block.content };
    }
    if (block.type === 'image') {
      imageIndex += 1;
      const ext = extractExtension(block.content) || 'jpg';
      return {
        type: 'image',
        file: `images/${pad(imageIndex)}.${ext}`,
        width: block.imageData?.width,
        height: block.imageData?.height,
      };
    }
    // audio
    audioIndex += 1;
    const ext = extractExtension(block.content) || 'm4a';
    return {
      type: 'audio',
      file: `audio/${pad(audioIndex)}.${ext}`,
      duration: block.audioData?.duration ?? 0,
      waveform: block.audioData?.waveform ?? [],
    };
  });

  return {
    id: entry.id,
    title: entry.title,
    isBookmarked: Boolean(entry.isBookmarked),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    blocks,
  };
}

/**
 * Build a human-readable `content.md` for an entry. Used for browsing
 * backups outside the app — does not round-trip back into the app
 * (entry.json is the source of truth on import).
 */
export function buildEntryMarkdown(entry: JournalEntry): string {
  const lines: string[] = [];

  if (entry.title) {
    lines.push(`# ${entry.title}`);
  } else {
    lines.push(`# Untitled`);
  }
  lines.push('');
  lines.push(`_${entry.createdAt.slice(0, 10)}_`);
  if (entry.isBookmarked) {
    lines.push('');
    lines.push('⭐ Bookmarked');
  }
  lines.push('');

  let imageIndex = 0;
  let audioIndex = 0;

  for (const block of entry.content) {
    if (block.type === 'text' && block.content.trim()) {
      lines.push(block.content);
      lines.push('');
    } else if (block.type === 'image') {
      imageIndex += 1;
      const ext = extractExtension(block.content) || 'jpg';
      lines.push(`![image ${imageIndex}](images/${pad(imageIndex)}.${ext})`);
      lines.push('');
    } else if (block.type === 'audio') {
      audioIndex += 1;
      const ext = extractExtension(block.content) || 'm4a';
      const dur = block.audioData?.duration ? formatDurationMs(block.audioData.duration) : '?';
      lines.push(`🎙️ [Voice note (${dur})](audio/${pad(audioIndex)}.${ext})`);
      lines.push('');
    }
  }

  return lines.join('\n').trim() + '\n';
}

/**
 * Parse and validate a manifest.json string. Throws on invalid input
 * with a descriptive message; never returns a partially-valid manifest.
 */
export function parseManifest(jsonString: string): BackupManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Invalid manifest: not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid manifest: expected an object');
  }
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.version !== 'number') {
    throw new Error('Invalid manifest: missing "version"');
  }
  if (obj.version > BACKUP_FORMAT_VERSION) {
    throw new Error(`Backup format v${obj.version} is newer than this app supports (v${BACKUP_FORMAT_VERSION})`);
  }
  if (!Array.isArray(obj.entries)) {
    throw new Error('Invalid manifest: "entries" must be an array');
  }

  const entries = obj.entries.map((e, i) => {
    if (typeof e !== 'object' || e === null) {
      throw new Error(`Invalid manifest: entry[${i}] is not an object`);
    }
    const entry = e as Record<string, unknown>;
    if (typeof entry.id !== 'string' || typeof entry.folderName !== 'string') {
      throw new Error(`Invalid manifest: entry[${i}] missing id or folderName`);
    }
    return { id: entry.id, folderName: entry.folderName };
  });

  return {
    version: obj.version,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    appVersion: typeof obj.appVersion === 'string' ? obj.appVersion : '',
    entries,
  };
}

/**
 * Parse and validate an entry.json string. Throws on invalid input.
 */
export function parseEntryJson(jsonString: string): BackupEntry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid entry.json: not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid entry.json: expected an object');
  }
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.id !== 'string') throw new Error('Invalid entry.json: missing id');
  if (!Array.isArray(obj.blocks)) throw new Error('Invalid entry.json: blocks must be an array');

  const blocks: BackupBlock[] = obj.blocks.map((b, i) => {
    if (typeof b !== 'object' || b === null) {
      throw new Error(`Invalid entry.json: block[${i}] not an object`);
    }
    const block = b as Record<string, unknown>;
    if (block.type === 'text' && typeof block.content === 'string') {
      return { type: 'text', content: block.content };
    }
    if (block.type === 'image' && typeof block.file === 'string') {
      return {
        type: 'image',
        file: block.file,
        width: typeof block.width === 'number' ? block.width : undefined,
        height: typeof block.height === 'number' ? block.height : undefined,
      };
    }
    if (block.type === 'audio' && typeof block.file === 'string') {
      return {
        type: 'audio',
        file: block.file,
        duration: typeof block.duration === 'number' ? block.duration : 0,
        waveform: Array.isArray(block.waveform) ? block.waveform as number[] : [],
      };
    }
    throw new Error(`Invalid entry.json: block[${i}] has unsupported type "${block.type}"`);
  });

  return {
    id: obj.id,
    title: typeof obj.title === 'string' ? obj.title : '',
    isBookmarked: Boolean(obj.isBookmarked),
    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString(),
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
    blocks,
  };
}

// --- helpers ---

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function extractExtension(uriOrPath: string): string | null {
  const match = uriOrPath.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  return match ? match[1].toLowerCase() : null;
}
