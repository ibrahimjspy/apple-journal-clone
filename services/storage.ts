/**
 * Local Storage Service using AsyncStorage.
 *
 * Persists journal entry metadata (id, title, content blocks, timestamps,
 * previews) under a single AsyncStorage key. Media files (images, audio)
 * referenced by content blocks live separately on the file system; see
 * services/media.ts.
 *
 * Critical invariant: never return [] when the underlying data is corrupt,
 * because a subsequent createEntry() would overwrite the user's journal
 * with a single entry. Functions that read entries either return the
 * real list, or throw — they never silently swallow corruption.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry, JournalEntryDraft, ContentBlock } from '@/types/journal';
import { generateId } from '@/utils/id';
import { PREVIEW_TEXT_MAX, PREVIEW_IMAGE_MAX } from '@/constants/app';
import { deleteMediaFile } from './media';

const STORAGE_KEYS = {
  ENTRIES: 'journal_entries',
} as const;

/** Thrown when AsyncStorage contains data we cannot parse. Callers must NOT silently fall back to [] on this — that would risk overwriting the user's journal. */
export class CorruptStorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'CorruptStorageError';
  }
}

/**
 * Retrieves all entries from AsyncStorage, sorted newest-first.
 *
 * Returns `[]` only when storage is genuinely empty. Throws
 * `CorruptStorageError` when the stored JSON is unreadable, so callers
 * can refuse to perform destructive writes against a corrupted store.
 */
export async function getEntries(): Promise<JournalEntry[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
  if (!data) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch (error) {
    throw new CorruptStorageError(
      'journal_entries contains invalid JSON; refusing to read to avoid data loss',
      error
    );
  }
  if (!Array.isArray(parsed)) {
    throw new CorruptStorageError('journal_entries is not an array');
  }

  return (parsed as JournalEntry[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Persists a new entry, computes preview fields, and returns it.
 * Throws on storage failure OR on corrupted existing data (we don't
 * overwrite a journal we can't read).
 */
export async function createEntry(draft: JournalEntryDraft): Promise<JournalEntry> {
  const now = new Date().toISOString();
  const entry: JournalEntry = {
    ...draft,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    previewText: extractPreviewText(draft.content),
    previewImages: extractPreviewImages(draft.content),
    hasAudio: draft.content.some(block => block.type === 'audio'),
  };

  const entries = await getEntries(); // may throw CorruptStorageError — caller surfaces
  entries.unshift(entry);
  await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  return entry;
}

/** Applies partial updates to an entry. Recomputes previews if content changed. Returns null if not found. */
export async function updateEntry(id: string, updates: Partial<JournalEntryDraft>): Promise<JournalEntry | null> {
  try {
    const entries = await getEntries();
    const index = entries.findIndex(e => e.id === id);
    
    if (index === -1) return null;
    
    const updatedEntry: JournalEntry = {
      ...entries[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    // Recompute preview data if content changed
    if (updates.content) {
      updatedEntry.previewText = extractPreviewText(updates.content);
      updatedEntry.previewImages = extractPreviewImages(updates.content);
      updatedEntry.hasAudio = updates.content.some(block => block.type === 'audio');
    }
    
    entries[index] = updatedEntry;
    await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    
    return updatedEntry;
  } catch (error) {
    console.error('Error updating entry:', error);
    return null;
  }
}

/**
 * Toggles the bookmark flag on an entry.
 * Returns the new bookmark state, or null if the entry doesn't exist.
 */
export async function toggleBookmark(id: string): Promise<boolean | null> {
  try {
    const entries = await getEntries();
    const index = entries.findIndex(e => e.id === id);
    if (index === -1) return null;

    const newState = !entries[index].isBookmarked;
    entries[index] = {
      ...entries[index],
      isBookmarked: newState,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    return newState;
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return null;
  }
}

/**
 * Merges a batch of entries into storage, skipping any whose IDs already exist.
 * Used by the backup importer. Returns counts so the caller can report results.
 */
export async function mergeEntries(incoming: JournalEntry[]): Promise<{ added: number; skipped: number }> {
  try {
    const existing = await getEntries();
    const existingIds = new Set(existing.map(e => e.id));
    const toAdd = incoming.filter(e => !existingIds.has(e.id));

    if (toAdd.length === 0) {
      return { added: 0, skipped: incoming.length };
    }

    const merged = [...existing, ...toAdd].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(merged));
    return { added: toAdd.length, skipped: incoming.length - toAdd.length };
  } catch (error) {
    console.error('Error merging entries:', error);
    return { added: 0, skipped: incoming.length };
  }
}

/**
 * Deletes an entry and best-effort cleans up its media files.
 *
 * Order matters: we persist the new entry list FIRST, then delete media.
 * If we did it the other way and the AsyncStorage write failed, the
 * entry would still exist but reference deleted files (broken thumbnails,
 * unplayable audio). Media-delete failures after a successful storage
 * write only leave orphan files on disk, which is harmless and recoverable.
 *
 * Returns:
 *   true  — entry was present and removed
 *   false — entry id not found, OR storage write failed
 */
export async function deleteEntry(id: string): Promise<boolean> {
  let entries: JournalEntry[];
  try {
    entries = await getEntries();
  } catch (error) {
    console.error('Error deleting entry: cannot read storage', error);
    return false;
  }

  const entry = entries.find(e => e.id === id);
  if (!entry) return false;

  const filtered = entries.filter(e => e.id !== id);
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting entry: storage write failed', error);
    return false;
  }

  // Storage is authoritative; media cleanup is best-effort.
  const mediaUris: string[] = [];
  for (const block of entry.content) {
    if ((block.type === 'image' || block.type === 'audio') && block.content) {
      mediaUris.push(block.content);
    }
  }
  await Promise.all(mediaUris.map(uri => deleteMediaFile(uri)));
  return true;
}

/** Extract the first PREVIEW_TEXT_MAX characters of text content for list previews. */
function extractPreviewText(content: ContentBlock[]): string {
  const textBlocks = content.filter(block => block.type === 'text');
  const text = textBlocks.map(block => block.content).join(' ');
  return text.slice(0, PREVIEW_TEXT_MAX);
}

/** Extract up to PREVIEW_IMAGE_MAX image URIs for the card thumbnail grid. */
function extractPreviewImages(content: ContentBlock[]): string[] {
  return content
    .filter(block => block.type === 'image')
    .map(block => block.content)
    .slice(0, PREVIEW_IMAGE_MAX);
}

/**
 * Formats an ISO date string for display: "Today", "Yesterday", a weekday
 * for the past week, or "Weekday, Mon DD" for older dates.
 *
 * Uses CALENDAR-day diffs (not elapsed hours) so an entry written at
 * 11pm and viewed at 1am the next day correctly shows "Yesterday" rather
 * than "Today".
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const diffDays = calendarDaysBetween(date, now);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** Number of whole calendar days between two dates, in the local timezone. */
function calendarDaysBetween(earlier: Date, later: Date): number {
  const a = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate()).getTime();
  const b = new Date(later.getFullYear(), later.getMonth(), later.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

