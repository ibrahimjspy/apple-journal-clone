/**
 * Core data model for journal entries.
 *
 * Entries use a block-based content model: an ordered list of ContentBlocks,
 * each being text, image, or audio. This keeps the editor simple (no rich text)
 * while allowing mixed media in a single entry.
 *
 * Media URIs point to files persisted in the app's document directory
 * (see services/media.ts). They survive cache clears but are device-local.
 */

/** A recorded voice note with its waveform data for visual playback. */
export interface AudioEntry {
  id: string;
  /** Persistent local file URI (document directory). */
  uri: string;
  /** Duration in milliseconds. */
  duration: number;
  /** Downsampled amplitude values (0–1), typically 50 samples, for waveform rendering. */
  waveform: number[];
  createdAt: string;
}

/** Metadata for a persisted image. */
export interface ImageEntry {
  id: string;
  /** Persistent local file URI (document directory). */
  uri: string;
  width: number;
  height: number;
}

/**
 * A single content block within a journal entry.
 * `content` holds plain text for text blocks, or the file URI for media blocks.
 */
export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'audio';
  content: string;
  imageData?: ImageEntry;
  audioData?: AudioEntry;
}

/**
 * A persisted journal entry. Preview fields are computed at save time
 * to avoid re-parsing content on every list render.
 */
export interface JournalEntry {
  id: string;
  title: string;
  content: ContentBlock[];
  createdAt: string;
  updatedAt: string;
  /** Whether the user has bookmarked this entry. */
  isBookmarked?: boolean;
  previewText?: string;
  previewImages?: string[];
  hasAudio?: boolean;
}

/** Draft shape used when creating or updating an entry; the storage layer assigns id and timestamps on save. */
export type JournalEntryDraft = Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>;

