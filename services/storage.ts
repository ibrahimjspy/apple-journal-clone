/**
 * Local Storage Service using AsyncStorage
 * This will be the foundation before Google Drive sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry, JournalEntryDraft, ContentBlock } from '@/types/journal';

const STORAGE_KEYS = {
  ENTRIES: 'journal_entries',
  DRAFT: 'journal_draft',
} as const;

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get all journal entries
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

// Get a single entry by ID
export async function getEntry(id: string): Promise<JournalEntry | null> {
  try {
    const entries = await getEntries();
    return entries.find(e => e.id === id) || null;
  } catch (error) {
    console.error('Error getting entry:', error);
    return null;
  }
}

// Create a new journal entry
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

  const entries = await getEntries();
  entries.unshift(entry);
  
  await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  
  // Clear draft after saving
  await clearDraft();
  
  return entry;
}

// Update an existing entry
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

// Delete an entry
export async function deleteEntry(id: string): Promise<boolean> {
  try {
    const entries = await getEntries();
    const filtered = entries.filter(e => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting entry:', error);
    return false;
  }
}

// Save draft (auto-save while editing)
export async function saveDraft(draft: JournalEntryDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(draft));
  } catch (error) {
    console.error('Error saving draft:', error);
  }
}

// Get draft
export async function getDraft(): Promise<JournalEntryDraft | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DRAFT);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting draft:', error);
    return null;
  }
}

// Clear draft
export async function clearDraft(): Promise<void> {
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

// Format date for display
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

