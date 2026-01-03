/**
 * Journal Entry Types
 */

export interface AudioEntry {
  id: string;
  uri: string;
  duration: number; // in milliseconds
  waveform: number[]; // normalized amplitude values 0-1
  createdAt: string;
}

export interface ImageEntry {
  id: string;
  uri: string;
  width: number;
  height: number;
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'audio';
  content: string; // text content or uri for media
  // For images
  imageData?: ImageEntry;
  // For audio
  audioData?: AudioEntry;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: ContentBlock[];
  createdAt: string;
  updatedAt: string;
  // Computed for display
  previewText?: string;
  previewImages?: string[];
  hasAudio?: boolean;
}

export type JournalEntryDraft = Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>;

