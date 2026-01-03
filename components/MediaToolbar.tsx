/**
 * Reusable Media Toolbar Component
 * Bottom toolbar with media action buttons
 */

import { View, StyleSheet, Pressable } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { Icon, IconSize } from './Icons';

interface MediaToolbarProps {
  onPickImage: () => void;
  onTakePhoto: () => void;
  onRecordAudio: () => void;
}

export function MediaToolbar({ onPickImage, onTakePhoto, onRecordAudio }: MediaToolbarProps) {
  return (
    <View style={styles.toolbar}>
      <Pressable style={styles.toolButton}>
        <Icon name="sparkles" size={IconSize.md} color={colors.textSecondary} />
      </Pressable>
      
      <Pressable style={styles.toolButton} onPress={onPickImage}>
        <Icon name="images-outline" size={IconSize.md} color={colors.textSecondary} />
      </Pressable>
      
      <Pressable style={styles.toolButton} onPress={onTakePhoto}>
        <Icon name="camera-outline" size={IconSize.md} color={colors.textSecondary} />
      </Pressable>
      
      <Pressable style={styles.toolButton} onPress={onRecordAudio}>
        <Icon name="pulse" size={IconSize.md} color={colors.textSecondary} />
      </Pressable>
      
      <Pressable style={styles.toolButton}>
        <Icon name="location-outline" size={IconSize.md} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  toolButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

