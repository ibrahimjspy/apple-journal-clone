/**
 * App-wide constants that aren't theme tokens.
 *
 * Keep this file small and well-named. If a value appears in two or more
 * places OR encodes domain knowledge that isn't obvious from context,
 * it belongs here.
 *
 * Theme tokens (colors, spacing, typography, fonts) live in theme.ts.
 */

// ---- Previews on list/cards ----

/** Maximum characters of preview text shown on a card. */
export const PREVIEW_TEXT_MAX = 200;

/** Maximum preview image URIs cached on an entry for card thumbnails. */
export const PREVIEW_IMAGE_MAX = 6;

// ---- Audio ----

/** Polling interval (ms) for useAudioPlayer status updates. */
export const AUDIO_STATUS_INTERVAL_MS = 500;

/** Polling interval (ms) for useAudioRecorderState while recording. */
export const AUDIO_RECORDER_STATE_INTERVAL_MS = 80;

/** Number of animated waveform bars shown live while recording. */
export const RECORDER_LIVE_BAR_COUNT = 40;

/** Number of waveform samples persisted with each saved audio entry. */
export const STORED_WAVEFORM_SAMPLE_COUNT = 50;

// ---- Image picker ----

/** Compression quality (0-1) requested from expo-image-picker. */
export const IMAGE_PICKER_QUALITY = 0.8;

// ---- Bottom sheet ----

/** Fractional height of the screen the bottom sheet takes when keyboard is closed (0-1). */
export const BOTTOM_SHEET_HEIGHT_RATIO = 0.85;

// ---- Card image grid ----

/** Gap (px) between adjacent image cells in card grids. */
export const CARD_IMAGE_GRID_GAP = 2;

/** Fixed total height (px) for multi-image card grids. */
export const CARD_IMAGE_MULTI_HEIGHT = 200;

/** Aspect ratio (width / height) for single-image hero cells on cards. */
export const CARD_IMAGE_SINGLE_ASPECT = 4 / 3;
