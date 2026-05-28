/**
 * Smart adaptive image grid for journal cards.
 *
 * Renders a different layout based on the number of images, mirroring
 * Apple Journal's behaviour. See utils/imageGrid.ts for the layout planner.
 */

import { View, Image, Text, StyleSheet } from 'react-native';
import { planImageGrid } from '@/utils/imageGrid';
import { colors, borderRadius, fonts, typography } from '@/constants/theme';

interface CardImageGridProps {
  /** All preview image URIs for the entry. */
  images: string[];
}

/** Gap (px) between adjacent image cells in any layout. */
const GAP = 2;

/** Fixed total height (px) for multi-image layouts (single uses aspect ratio). */
const MULTI_HEIGHT = 200;

/** Aspect ratio (width / height) for single-image hero cells. */
const SINGLE_ASPECT = 4 / 3;

/**
 * Adaptive grid that picks a layout based on image count.
 * Returns null if there are no images.
 */
export function CardImageGrid({ images }: CardImageGridProps) {
  const spec = planImageGrid(images);

  if (spec.displayImages.length === 0) {
    return null;
  }

  if (spec.pattern === 'single') {
    return (
      <View style={[styles.container, styles.singleContainer]}>
        <Image
          source={{ uri: spec.displayImages[0] }}
          style={styles.fullCell}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (spec.pattern === 'pair') {
    const [a, b] = spec.displayImages;
    return (
      <View style={[styles.container, styles.multiContainer, styles.row]}>
        <View style={styles.flex1}>
          <Image source={{ uri: a }} style={styles.fullCell} resizeMode="cover" />
        </View>
        <View style={styles.flex1}>
          <Image source={{ uri: b }} style={styles.fullCell} resizeMode="cover" />
        </View>
      </View>
    );
  }

  if (spec.pattern === 'one-plus-two') {
    const [a, b, c] = spec.displayImages;
    return (
      <View style={[styles.container, styles.multiContainer, styles.row]}>
        <View style={[styles.flex1, styles.leftBigCell]}>
          <Image source={{ uri: a }} style={styles.fullCell} resizeMode="cover" />
        </View>
        <View style={styles.flex1}>
          <View style={[styles.flex1, styles.stackedTopCell]}>
            <Image source={{ uri: b }} style={styles.fullCell} resizeMode="cover" />
          </View>
          <View style={styles.flex1}>
            <Image source={{ uri: c }} style={styles.fullCell} resizeMode="cover" />
          </View>
        </View>
      </View>
    );
  }

  if (spec.pattern === 'two-by-two') {
    const [a, b, c, d] = spec.displayImages;
    return (
      <View style={[styles.container, styles.multiContainer]}>
        <View style={[styles.row, styles.flex1, styles.gridTopRow]}>
          <View style={[styles.flex1, styles.gridLeftCell]}>
            <Image source={{ uri: a }} style={styles.fullCell} resizeMode="cover" />
          </View>
          <View style={styles.flex1}>
            <Image source={{ uri: b }} style={styles.fullCell} resizeMode="cover" />
          </View>
        </View>
        <View style={[styles.row, styles.flex1]}>
          <View style={[styles.flex1, styles.gridLeftCell]}>
            <Image source={{ uri: c }} style={styles.fullCell} resizeMode="cover" />
          </View>
          <View style={styles.flex1}>
            <Image source={{ uri: d }} style={styles.fullCell} resizeMode="cover" />
          </View>
        </View>
      </View>
    );
  }

  // mosaic-with-badge: 1 big hero on left + 2x2 mosaic on right
  const [hero, ...rest] = spec.displayImages;
  return (
    <View style={[styles.container, styles.multiContainer, styles.row]}>
      <View style={[styles.flex1, styles.leftBigCell]}>
        <Image source={{ uri: hero }} style={styles.fullCell} resizeMode="cover" />
      </View>
      <View style={styles.flex1}>
        <View style={[styles.row, styles.flex1, styles.gridTopRow]}>
          {rest.slice(0, 2).map((uri, i) => (
            <View key={i} style={[styles.flex1, i === 0 && styles.gridLeftCell]}>
              <Image source={{ uri }} style={styles.fullCell} resizeMode="cover" />
            </View>
          ))}
        </View>
        <View style={[styles.row, styles.flex1]}>
          {rest.slice(2, 4).map((uri, i) => {
            const isLast = i === 1;
            return (
              <View key={i} style={[styles.flex1, i === 0 && styles.gridLeftCell]}>
                <Image source={{ uri }} style={styles.fullCell} resizeMode="cover" />
                {isLast && spec.showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>+{spec.badgeCount}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceTertiary,
  },
  singleContainer: {
    aspectRatio: SINGLE_ASPECT,
  },
  multiContainer: {
    height: MULTI_HEIGHT,
  },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  fullCell: { width: '100%', height: '100%' },

  // Gap helpers (we use margins instead of `gap` for better RN compatibility)
  leftBigCell: { marginRight: GAP },
  stackedTopCell: { marginBottom: GAP },
  gridLeftCell: { marginRight: GAP },
  gridTopRow: { marginBottom: GAP },

  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontFamily: fonts.semibold,
  },
});
