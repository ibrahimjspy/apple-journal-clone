/**
 * Settings screen — currently just hosts the Backup section.
 * Lets the user export journal entries to a folder on their device and
 * import (merge) them back from a previously exported folder.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { colors, spacing, typography, borderRadius, fonts } from '@/constants/theme';
import { Icon, IconSize } from '@/components/Icons';
import { exportEntriesToFolder, importEntriesFromFolder } from '@/services/exportImport';
import { showAlert } from '@/utils/alert';

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; action: 'export' | 'import' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export default function SettingsScreen() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const handleExport = async () => {
    if (Platform.OS !== 'android') {
      showAlert('Not supported', 'Folder export is currently Android-only.');
      return;
    }
    setStatus({ kind: 'busy', action: 'export' });
    const result = await exportEntriesToFolder();
    if (result.cancelled) {
      setStatus({ kind: 'idle' });
      return;
    }
    if (result.success) {
      setStatus({
        kind: 'success',
        message: `Exported ${result.entryCount} ${pluralize(result.entryCount, 'entry', 'entries')} to AppleJournal/.`,
      });
    } else {
      setStatus({ kind: 'error', message: result.error || 'Export failed.' });
    }
  };

  const handleImport = async () => {
    if (Platform.OS !== 'android') {
      showAlert('Not supported', 'Folder import is currently Android-only.');
      return;
    }
    setStatus({ kind: 'busy', action: 'import' });
    const result = await importEntriesFromFolder();
    if (result.cancelled) {
      setStatus({ kind: 'idle' });
      return;
    }
    if (result.success) {
      const skippedNote = result.skippedCount
        ? ` (skipped ${result.skippedCount} already in your journal)`
        : '';
      setStatus({
        kind: 'success',
        message: `Restored ${result.restoredCount} ${pluralize(result.restoredCount, 'entry', 'entries')}${skippedNote}.`,
      });
    } else {
      setStatus({ kind: 'error', message: result.error || 'Import failed.' });
    }
  };

  const isBusy = status.kind === 'busy';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Icon name="chevron-back" size={IconSize.md} color={colors.accent} />
            <Text style={styles.backText}>Journal</Text>
          </Pressable>
          <Text style={styles.title}>Settings</Text>
          <View style={{ width: 80 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionHeader}>BACKUP</Text>

          <View style={styles.section}>
            <SettingRow
              icon="cloud-upload-outline"
              title="Export to Folder"
              subtitle="Save all entries as a browsable folder on your device"
              disabled={isBusy}
              loading={status.kind === 'busy' && status.action === 'export'}
              onPress={handleExport}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="cloud-download-outline"
              title="Restore from Folder"
              subtitle="Merge entries from a previously exported folder"
              disabled={isBusy}
              loading={status.kind === 'busy' && status.action === 'import'}
              onPress={handleImport}
            />
          </View>

          {/* Status message */}
          {status.kind === 'success' && (
            <View style={[styles.banner, styles.bannerSuccess]}>
              <Icon name="checkmark-circle" size={IconSize.sm} color={colors.success} />
              <Text style={styles.bannerText}>{status.message}</Text>
            </View>
          )}
          {status.kind === 'error' && (
            <View style={[styles.banner, styles.bannerError]}>
              <Icon name="alert-circle" size={IconSize.sm} color={colors.error} />
              <Text style={styles.bannerText}>{status.message}</Text>
            </View>
          )}

          <Text style={styles.helpText}>
            Backups are stored as one folder per entry, with text in
            <Text style={styles.code}> content.md </Text>
            and media files alongside it. You can copy the folder to a new
            phone and import it back here.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

interface SettingRowProps {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  title: string;
  subtitle: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}

function SettingRow({ icon, title, subtitle, disabled, loading, onPress }: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={styles.rowIcon}>
        <Icon name={icon} size={IconSize.md} color={colors.accent} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Icon name="chevron-forward" size={IconSize.sm} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

function pluralize(n: number, singular: string, plural: string) {
  return n === 1 ? singular : plural;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', width: 80 },
  backText: {
    color: colors.accent,
    fontSize: typography.sizes.lg,
    fontFamily: fonts.regular,
    marginLeft: -2,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  content: { padding: spacing.lg, paddingTop: 0 },
  sectionHeader: {
    fontSize: typography.sizes.xs,
    fontFamily: fonts.semibold,
    color: colors.textTertiary,
    letterSpacing: 1,
    marginLeft: spacing.sm,
    marginBottom: spacing.sm,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  rowPressed: { backgroundColor: colors.surfaceSecondary },
  rowDisabled: { opacity: 0.5 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 36 + spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  bannerSuccess: { backgroundColor: 'rgba(74, 222, 128, 0.12)' },
  bannerError: { backgroundColor: 'rgba(248, 113, 113, 0.12)' },
  bannerText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  helpText: {
    fontSize: typography.sizes.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
    lineHeight: 20,
  },
  code: {
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
});
