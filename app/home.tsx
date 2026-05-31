/**
 * Home Screen — the journal feed.
 *
 * Loads entries on focus, supports filter by All / With Photos / With Audio,
 * pull-to-refresh, and surfaces the create-entry bottom sheet via a FAB.
 * Each card has a three-dots menu (bookmark / delete via ActionSheet) and
 * a single audio tile per entry (the first audio block — see the
 * "1+ voice notes" badge for entries with multiple).
 */

import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { colors, spacing, typography, borderRadius, shadows, fonts } from '@/constants/theme';
import { Icon, JournalBrandIcon, FilterIcon, IconSize } from '@/components/Icons';
import { AudioTile, CreateEntrySheet, ViewEntrySheet, CardImageGrid, ActionSheet, ActionSheetItem } from '@/components';
import { getEntries, deleteEntry, toggleBookmark, formatDate, CorruptStorageError } from '@/services/storage';
import { JournalEntry } from '@/types/journal';
import { confirmAction, showAlert } from '@/utils/alert';

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

  const insets = useSafeAreaInsets();

  const loadEntries = useCallback(async () => {
    try {
      const data = await getEntries();
      setEntries(data);
    } catch (error) {
      if (error instanceof CorruptStorageError) {
        // Surface the bad state explicitly so the user knows their data is
        // unreadable (rather than silently appearing as an empty journal,
        // which would invite them to write new entries that overwrite it).
        showAlert(
          'Journal data corrupted',
          'We could not read your saved entries. Please contact support before creating new entries (creating now may overwrite recoverable data).'
        );
      } else {
        console.error('Failed to load entries:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

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
  const hasFilteredEntries = filteredEntries.length > 0;

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
          <View style={styles.headerActions}>
            <Pressable
              testID="filter-button"
              style={styles.headerIconButton}
              onPress={() => setShowFilters(prev => !prev)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Filter entries. Active filter: ${activeFilter}`}
              accessibilityState={{ expanded: showFilters }}
            >
              <FilterIcon
                size={22}
                color={activeFilter !== 'all' ? colors.accent : colors.textSecondary}
              />
            </Pressable>
            <Pressable
              testID="settings-button"
              style={styles.headerIconButton}
              onPress={() => router.push('/settings')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Icon name="settings-outline" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {showFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
            accessibilityRole="tablist"
          >
            {FILTERS.map(({ id, label, icon }) => {
              const isActive = activeFilter === id;
              return (
                <Pressable
                  key={id}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setActiveFilter(id)}
                  accessibilityRole="tab"
                  accessibilityLabel={`Show ${label.toLowerCase()} entries`}
                  accessibilityState={{ selected: isActive }}
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

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : !hasEntries ? (
          <EmptyState />
        ) : !hasFilteredEntries ? (
          <FilterEmptyState activeFilter={activeFilter} onClear={() => setActiveFilter('all')} />
        ) : (
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
        )}

        {/* Floating Action Button — bottom honours gesture-nav safe area */}
        <View style={[styles.fabContainer, { bottom: Math.max(insets.bottom, spacing.md) + 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              pressed && styles.fabPressed,
            ]}
            onPress={() => setShowCreateSheet(true)}
            testID="create-entry-fab"
            accessibilityRole="button"
            accessibilityLabel="Create new entry"
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

interface FilterEmptyStateProps {
  activeFilter: FilterType;
  onClear: () => void;
}

/** Shown when the user has entries but the active filter excludes all of them. */
function FilterEmptyState({ activeFilter, onClear }: FilterEmptyStateProps) {
  const label = FILTERS.find(f => f.id === activeFilter)?.label.toLowerCase() ?? activeFilter;
  return (
    <View style={styles.emptyState}>
      <Icon name="search-outline" size={48} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>No entries with {label}</Text>
      <Text style={styles.emptySubtitle}>
        Try a different filter or create a new entry.
      </Text>
      <Pressable
        style={styles.emptyAction}
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel="Show all entries"
      >
        <Text style={styles.emptyActionText}>Show all entries</Text>
      </Pressable>
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
  // First audio block is shown inline; any extra ones surface as a "+N more"
  // pill below the tile so multi-recording entries are discoverable.
  const audioBlocks = entry.content.filter(b => b.type === 'audio' && b.audioData);
  const audioBlock = audioBlocks[0];
  const extraAudioCount = Math.max(0, audioBlocks.length - 1);

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
        {extraAudioCount > 0 && (
          <View style={styles.extraAudioPill}>
            <Icon name="mic" size={12} color={colors.textSecondary} />
            <Text style={styles.extraAudioText}>
              {extraAudioCount} more voice {extraAudioCount === 1 ? 'note' : 'notes'}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formatDate(entry.createdAt)}</Text>
          <Pressable
            testID="entry-more-button"
            style={styles.moreButton}
            onPress={() => setShowActions(true)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Entry options"
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconButton: {
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
  // Loading state
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAction: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
  },
  emptyActionText: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
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
  extraAudioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    marginBottom: spacing.sm,
  },
  extraAudioText: {
    fontSize: typography.sizes.xs,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  // FAB — `bottom` is set inline using safe-area insets so it sits above
  // gesture-nav home indicators on modern Android phones.
  fabContainer: {
    position: 'absolute',
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
