/**
 * Reusable Content Block Renderer
 * Renders text, image, and audio blocks with optional edit mode
 */

import { View, Text, TextInput, Image, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { Icon, IconSize } from './Icons';
import { AudioPlayer } from './AudioPlayer';
import { AudioTile } from './AudioTile';
import { ContentBlock } from '@/types/journal';

interface ContentBlockRendererProps {
  block: ContentBlock;
  isEditing?: boolean;
  onUpdateText?: (id: string, content: string) => void;
  onRemove?: (id: string) => void;
  textInputRef?: React.RefObject<TextInput>;
  useCompactAudio?: boolean;
}

export function ContentBlockRenderer({ 
  block, 
  isEditing = true, 
  onUpdateText, 
  onRemove,
  textInputRef,
  useCompactAudio = false,
}: ContentBlockRendererProps) {
  if (block.type === 'text') {
    if (isEditing) {
      return (
        <TextInput
          ref={textInputRef}
          style={styles.textInput}
          placeholder="Start writing..."
          placeholderTextColor={colors.textTertiary}
          value={block.content}
          onChangeText={(text) => onUpdateText?.(block.id, text)}
          multiline
          textAlignVertical="top"
        />
      );
    }
    return block.content ? (
      <Text style={styles.textContent}>{block.content}</Text>
    ) : null;
  }

  if (block.type === 'image') {
    return (
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: block.content }} 
          style={styles.image}
          resizeMode="cover"
        />
        {isEditing && onRemove && (
          <Pressable 
            style={styles.removeButton}
            onPress={() => onRemove(block.id)}
          >
            <Icon name="close" size={IconSize.sm} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>
    );
  }

  if (block.type === 'audio' && block.audioData) {
    return (
      <View style={styles.audioContainer}>
        {useCompactAudio ? (
          <AudioPlayer audio={block.audioData} compact />
        ) : (
          <AudioTile audio={block.audioData} />
        )}
        {isEditing && onRemove && (
          <Pressable 
            style={styles.removeAudioButton}
            onPress={() => onRemove(block.id)}
          >
            <Icon name="close-circle" size={IconSize.sm} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  textInput: {
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    lineHeight: 26,
    minHeight: 100,
    padding: 0,
  },
  textContent: {
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    lineHeight: 28,
    marginBottom: spacing.md,
  },
  imageContainer: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioContainer: {
    marginVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  removeAudioButton: {
    padding: spacing.xs,
  },
});

