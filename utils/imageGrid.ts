/**
 * Smart image grid layout planner.
 *
 * Decides which visual pattern a journal card should use based on the
 * number of preview images. Patterns mirror Apple Journal's approach:
 * each count gets an idiomatic layout instead of a fixed 5-slot grid.
 */

/** Visual layout pattern produced by {@link planImageGrid}. */
export type ImageGridPattern =
  | 'single'
  | 'pair'
  | 'one-plus-two'
  | 'two-by-two'
  | 'mosaic-with-badge';

/** Layout specification returned for a given list of images. */
export interface ImageGridSpec {
  /** Visual pattern the renderer should use. */
  pattern: ImageGridPattern;
  /** Images to actually display (others are folded into the badge). */
  displayImages: string[];
  /** Whether to render a "+N" overlay on the last cell. */
  showBadge: boolean;
  /** Number to display in the badge ("+5" → 5). Zero when there is no badge. */
  badgeCount: number;
}

/**
 * Pick a grid layout for a list of preview image URIs.
 *
 * - 0 images: returns an empty `single` spec (caller should skip rendering).
 * - 1 image: full-width hero.
 * - 2 images: 50/50 side-by-side.
 * - 3 images: one big left + two stacked right.
 * - 4 images: 2x2 grid.
 * - 5+ images: hero + 2x2 mosaic with "+N" badge on the last cell.
 */
export function planImageGrid(allImages: readonly string[]): ImageGridSpec {
  const count = allImages.length;

  if (count === 0) {
    return { pattern: 'single', displayImages: [], showBadge: false, badgeCount: 0 };
  }
  if (count === 1) {
    return { pattern: 'single', displayImages: [...allImages], showBadge: false, badgeCount: 0 };
  }
  if (count === 2) {
    return { pattern: 'pair', displayImages: [...allImages], showBadge: false, badgeCount: 0 };
  }
  if (count === 3) {
    return { pattern: 'one-plus-two', displayImages: [...allImages], showBadge: false, badgeCount: 0 };
  }
  if (count === 4) {
    return { pattern: 'two-by-two', displayImages: [...allImages], showBadge: false, badgeCount: 0 };
  }

  // 5+ images: show first 5, badge counts the remainder.
  return {
    pattern: 'mosaic-with-badge',
    displayImages: allImages.slice(0, 5),
    showBadge: count > 5,
    badgeCount: count > 5 ? count - 5 : 0,
  };
}
