/**
 * String slugification helpers used for safe filesystem folder names
 * during backup export.
 */

const MAX_SLUG_LENGTH = 50;
const FALLBACK_SLUG = 'untitled';

/**
 * Convert a free-form string into a filesystem-safe, lowercase, hyphenated slug.
 *
 * - Strips non-alphanumeric characters (keeps spaces and hyphens, then collapses them)
 * - Collapses runs of whitespace/hyphens into a single hyphen
 * - Trims leading/trailing hyphens
 * - Caps length at MAX_SLUG_LENGTH (50)
 * - Returns FALLBACK_SLUG ("untitled") if the result would be empty
 */
export function slugify(input: string): string {
  if (!input) return FALLBACK_SLUG;

  const cleaned = input
    .normalize('NFKD')                 // split accented chars
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')      // keep letters/digits/spaces/hyphens
    .replace(/[\s_-]+/g, '-')          // collapse separators into a single hyphen
    .replace(/^-+|-+$/g, '')           // trim leading/trailing hyphens
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');              // re-trim trailing hyphen after slice

  return cleaned || FALLBACK_SLUG;
}

/**
 * Builds an entry-folder name in the form `YYYY-MM-DD_slug__<suffix>`.
 *
 * Prefix is the calendar day so backups sort chronologically in the
 * Android Files app. Suffix is a short stable token derived from the
 * entry id, included to guarantee uniqueness when two entries on the
 * same day share a title (or slug-collide via stripped characters).
 * Without the suffix, the second export would overwrite the first.
 */
export function buildEntryFolderName(title: string, isoDate: string, entryId: string): string {
  const datePart = isoDate.slice(0, 10); // YYYY-MM-DD
  return `${datePart}_${slugify(title)}__${shortIdSuffix(entryId)}`;
}

/**
 * Returns the last 6 characters of the entry id (the random portion of
 * the generated id `${ts}-${rand}`). Long enough to disambiguate
 * realistic collisions, short enough to keep folder names readable.
 */
function shortIdSuffix(entryId: string): string {
  const tail = entryId.replace(/[^a-zA-Z0-9]/g, '');
  return tail.slice(-6) || 'noid';
}
