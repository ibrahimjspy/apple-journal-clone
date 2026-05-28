/**
 * Home Screen - Journal Entries List
 * Features bottom sheet for creating entries and audio tiles with waveforms
 */

import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { colors, spacing, typography, borderRadius, shadows, fonts } from '@/constants/theme';
import { Icon, JournalBrandIcon, FilterIcon, IconSize } from '@/components/Icons';
import { AudioTile, CreateEntrySheet, ViewEntrySheet, CardImageGrid, ActionSheet, ActionSheetItem } from '@/components';
import { getEntries, deleteEntry, toggleBookmark, formatDate } from '@/services/storage';
import { JournalEntry } from '@/types/journal';
import { confirmAction } from '@/utils/alert';

type FilterType = 'all' | 'photos' | 'audio';

/** Filter definitions in display order with their icons. */
const FILTERS: Array<{ id: FilterType; label: string; icon: 'apps-outline' | 'images-outline' | 'mic-outline' }> = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'photos', label: 'Photos', icon: 'images-outline' },
  { id: 'audio', label: 'Audio', icon: 'mic-outline' },
];

export default function HomeScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Load entries on focus
  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  const loadEntries = useCallback(async () => {
    const data = await getEntries();
    setEntries(data);
    setIsLoading(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadEntries();
    setIsRefreshing(false);
  }, [loadEntries]);

  const handleEntrySaved = useCallback(() => {
    loadEntries();
  }, [loadEntries]);

  const filteredEntries = useMemo(() => 
    entries.filter((entry) => {
      if (activeFilter === 'photos') return (entry.previewImages?.length || 0) > 0;
      if (activeFilter === 'audio') return entry.hasAudio;
      return true;
    }),
    [entries, activeFilter]
  );

  const hasEntries = entries.length > 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Journal</Text>
          <Pressable 
            testID="filter-button"
            style={styles.filterButton}
            onPress={() => setShowFilters(prev => !prev)}
          >
            <FilterIcon size={22} color={activeFilter !== 'all' ? colors.accent : colors.textSecondary} />
          </Pressable>
        </View>

        {showFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map(({ id, label, icon }) => {
              const isActive = activeFilter === id;
              return (
                <Pressable
                  key={id}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setActiveFilter(id)}
                >
                  <Icon
                    name={icon}
                    size={14}
                    color={isActive ? colors.textPrimary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.filterPillText,
                      isActive && styles.filterPillTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {hasEntries ? (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.accent}
              />
            }
          >
            {filteredEntries.map((entry) => (
              <JournalCard
                key={entry.id}
                entry={entry}
                onPress={() => setSelectedEntry(entry)}
                onChange={loadEntries}
              />
            ))}
          </ScrollView>
        ) : (
          <EmptyState />
        )}

        {/* Floating Action Button */}
        <View style={styles.fabContainer}>
          <Pressable 
            style={({ pressed }) => [
              styles.fab,
              pressed && styles.fabPressed
            ]}
            onPress={() => setShowCreateSheet(true)}
            testID="create-entry-fab"
          >
            <LinearGradient
              colors={[colors.fabGradientStart, colors.fabGradientEnd]}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="add" size={IconSize.xl} color={colors.textPrimary} />
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Create Entry Bottom Sheet */}
      <CreateEntrySheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSaved={handleEntrySaved}
      />

      {/* View/Edit Entry Bottom Sheet */}
      <ViewEntrySheet
        entry={selectedEntry}
        visible={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        onUpdated={loadEntries}
        onDeleted={loadEntries}
      />
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <JournalBrandIcon size={80} />
      <Text style={styles.emptyTitle}>Start Journaling</Text>
      <Text style={styles.emptySubtitle}>
        Create your personal journal.{'\n'}
        Tap the plus button to get started.
      </Text>
    </View>
  );
}

interface JournalCardProps {
  entry: JournalEntry;
  onPress: () => void;
  /** Called after any mutation (delete, bookmark toggle) to refresh the list. */
  onChange: () => void;
}

function JournalCard({ entry, onPress, onChange }: JournalCardProps) {
  const [showActions, setShowActions] = useState(false);
  const images = entry.previewImages || [];
  const audioBlock = entry.content.find(block => block.type === 'audio' && block.audioData);

  const handleBookmark = useCallback(async () => {
    await toggleBookmark(entry.id);
    onChange();
  }, [entry.id, onChange]);

  const handleDelete = useCallback(() => {
    confirmAction(
      {
        title: 'Delete Entry',
        message: 'Are you sure? This cannot be undone.',
        confirmText: 'Delete',
        destructive: true,
      },
      async () => {
        await deleteEntry(entry.id);
        onChange();
      }
    );
  }, [entry.id, onChange]);

  const actions: ActionSheetItem[] = useMemo(() => [
    {
      id: 'bookmark',
      label: entry.isBookmarked ? 'Remove Bookmark' : 'Bookmark',
      icon: entry.isBookmarked ? 'bookmark' : 'bookmark-outline',
      onPress: handleBookmark,
    },
    {
      id: 'delete',
      label: 'Delete Entry',
      icon: 'trash-outline',
      destructive: true,
      onPress: handleDelete,
    },
  ], [entry.isBookmarked, handleBookmark, handleDelete]);

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={onPress}
      >
        {/* Bookmark indicator */}
        {entry.isBookmarked && (
          <View style={styles.bookmarkIndicator}>
            <Icon name="bookmark" size={14} color={colors.accent} />
          </View>
        )}

        {/* Adaptive image grid (returns null when no images) */}
        {images.length > 0 && (
          <View style={styles.imageGridWrapper}>
            <CardImageGrid images={images} />
          </View>
        )}

        {/* Title */}
        {entry.title ? (
          <Text style={styles.cardTitle} numberOfLines={2}>
            {entry.title}
          </Text>
        ) : null}

        {/* Content */}
        {entry.previewText ? (
          <Text style={styles.cardContent} numberOfLines={entry.title ? 2 : 4}>
            {entry.previewText}
          </Text>
        ) : null}

        {/* Audio Tile - Apple Style */}
        {audioBlock?.audioData && (
          <AudioTile audio={audioBlock.audioData} />
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formatDate(entry.createdAt)}</Text>
          <Pressable
            testID="entry-more-button"
            style={styles.moreButton}
            onPress={() => setShowActions(true)}
            hitSlop={12}
          >
            <Icon name="ellipsis-horizontal" size={IconSize.sm} color={colors.textTertiary} />
          </Pressable>
        </View>
      </Pressable>

      <ActionSheet
        visible={showActions}
        items={actions}
        onClose={() => setShowActions(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxxl,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: spacing.md,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterPillText: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Journal Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  imageGridWrapper: {
    marginBottom: spacing.sm,
  },
  bookmarkIndicator: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardContent: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cardDate: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
  },
  moreButton: {
    padding: spacing.xs,
  },
  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.lg,
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
