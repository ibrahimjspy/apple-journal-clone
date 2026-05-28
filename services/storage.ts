/**
 * Local Storage Service using AsyncStorage
 * Handles journal entry CRUD with metadata stored in AsyncStorage.
 * Media files (images, audio) are persisted separately via services/media.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry, JournalEntryDraft, ContentBlock } from '@/types/journal';
import { generateId } from '@/utils/id';
import { deleteMediaFile } from './media';

export { generateId };

const STORAGE_KEYS = {
  ENTRIES: 'journal_entries',
  DRAFT: 'journal_draft',
} as const;

/** Retrieves all entries from AsyncStorage, sorted newest-first. Returns [] on failure. */
export async function getEntries(): Promise<JournalEntry[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
    if (!data) return [];
    
    const entries: JournalEntry[] = JSON.parse(data);
    // Sort by date, newest first
    return entries.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error getting entries:', error);
    return [];
  }
}

/** Persists a new entry, computes preview fields, and clears any saved draft. Throws on failure. */
export async function createEntry(draft: JournalEntryDraft): Promise<JournalEntry> {
  try {
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

    const entries = await getEntries();
    entries.unshift(entry);
    
    await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    
    await clearDraft();
    
    return entry;
  } catch (error) {
    console.error('Error creating entry:', error);
    throw error;
  }
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

/** Deletes an entry and its associated media files from local storage. */
export async function deleteEntry(id: string): Promise<boolean> {
  try {
    const entries = await getEntries();
    const entry = entries.find(e => e.id === id);
    
    if (entry) {
      const mediaUris: string[] = [];
      for (const block of entry.content) {
        if (block.type === 'image' && block.content) mediaUris.push(block.content);
        if (block.type === 'audio' && block.content) mediaUris.push(block.content);
      }
      await Promise.all(mediaUris.map(uri => deleteMediaFile(uri)));
    }
    
    const filtered = entries.filter(e => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting entry:', error);
    return false;
  }
}

async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.DRAFT);
  } catch (error) {
    console.error('Error clearing draft:', error);
  }
}

// Helper: Extract preview text from content blocks
function extractPreviewText(content: ContentBlock[]): string {
  const textBlocks = content.filter(block => block.type === 'text');
  const text = textBlocks.map(block => block.content).join(' ');
  return text.slice(0, 200); // First 200 chars
}

// Helper: Extract preview images from content blocks
function extractPreviewImages(content: ContentBlock[]): string[] {
  return content
    .filter(block => block.type === 'image')
    .map(block => block.content)
    .slice(0, 6); // Max 6 preview images
}

/** Formats an ISO date string for display: "Today", "Yesterday", weekday, or "Weekday, Mon DD". */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short', 
      day: 'numeric' 
    });
  }
}

