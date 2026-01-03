/**
 * Home Screen - Journal Entries List
 * Features bottom sheet for creating entries and audio tiles with waveforms
 */

import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { Icon, JournalBrandIcon, FilterIcon, IconSize } from '@/components/Icons';
import { AudioTile, CreateEntrySheet, ViewEntrySheet } from '@/components';
import { getEntries, deleteEntry, formatDate } from '@/services/storage';
import { JournalEntry } from '@/types/journal';
import { confirmAction } from '@/utils/alert';

export default function HomeScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Load entries on focus
  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  const loadEntries = async () => {
    const data = await getEntries();
    setEntries(data);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadEntries();
    setIsRefreshing(false);
  };

  const handleEntrySaved = () => {
    loadEntries();
  };

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
          <Pressable style={styles.filterButton}>
            <FilterIcon size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

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
            {entries.map((entry) => (
              <JournalCard 
                key={entry.id} 
                entry={entry} 
                onPress={() => setSelectedEntry(entry)}
                onDelete={loadEntries} 
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

function JournalCard({ entry, onPress, onDelete }: { entry: JournalEntry; onPress: () => void; onDelete: () => void }) {
  const imageCount = entry.previewImages?.length || 0;
  const showBadge = imageCount > 5;
  const displayImages = entry.previewImages?.slice(0, 5) || [];
  
  // Find first audio block for display
  const audioBlock = entry.content.find(block => block.type === 'audio' && block.audioData);

  const handleMorePress = () => {
    confirmAction(
      {
        title: 'Delete Entry',
        message: 'Are you sure you want to delete this entry?',
        confirmText: 'Delete',
        destructive: true,
      },
      async () => {
        await deleteEntry(entry.id);
        onDelete();
      }
    );
  };

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
      onPress={onPress}
    >
      {/* Image Grid */}
      {imageCount > 0 && (
        <View style={styles.imageGrid}>
          <View style={styles.imageGridLeft}>
            <Image 
              source={{ uri: displayImages[0] }} 
              style={styles.imagePrimary}
              resizeMode="cover"
            />
          </View>
          {imageCount > 1 && (
            <View style={styles.imageGridRight}>
              {[1, 2, 3, 4].map((index) => (
                <View key={index} style={styles.smallImageContainer}>
                  {displayImages[index] ? (
                    <Image 
                      source={{ uri: displayImages[index] }} 
                      style={styles.smallImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.smallImagePlaceholder} />
                  )}
                  {index === 4 && showBadge && (
                    <View style={styles.imageBadge}>
                      <Text style={styles.imageBadgeText}>+{imageCount - 5}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Content */}
      {entry.previewText && (
        <Text style={styles.cardContent} numberOfLines={4}>
          {entry.previewText}
        </Text>
      )}

      {/* Audio Tile - Apple Style */}
      {audioBlock?.audioData && (
        <AudioTile audio={audioBlock.audioData} />
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{formatDate(entry.createdAt)}</Text>
        <Pressable style={styles.moreButton} onPress={handleMorePress}>
          <Icon name="ellipsis-horizontal" size={IconSize.sm} color={colors.textTertiary} />
        </Pressable>
      </View>
    </Pressable>
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
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
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
  imageGrid: {
    flexDirection: 'row',
    height: 140,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    gap: 2,
  },
  imageGridLeft: {
    flex: 0.6,
  },
  imageGridRight: {
    flex: 0.4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  imagePrimary: {
    flex: 1,
    borderRadius: borderRadius.sm,
  },
  smallImageContainer: {
    width: '48%',
    height: '48%',
    position: 'relative',
  },
  smallImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  smallImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceTertiary,
    borderRadius: borderRadius.sm,
  },
  imageBadge: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.badge,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  imageBadgeText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  cardContent: {
    fontSize: typography.sizes.md,
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
