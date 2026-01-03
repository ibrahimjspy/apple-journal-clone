/**
 * View/Edit Entry Bottom Sheet - Apple Journal Style
 * Refactored to use shared components
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';
import { Icon, IconSize } from './Icons';
import { BottomSheet } from './BottomSheet';
import { MediaToolbar } from './MediaToolbar';
import { ContentBlockRenderer } from './ContentBlockRenderer';
import { AudioRecorderModal } from './AudioRecorderModal';
import { useContentEditor } from '@/hooks/useContentEditor';
import { updateEntry, deleteEntry, formatDate } from '@/services/storage';
import { JournalEntry } from '@/types/journal';
import { confirmAction, showAlert } from '@/utils/alert';

interface ViewEntrySheetProps {
  entry: JournalEntry | null;
  visible: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function ViewEntrySheet({ entry, visible, onClose, onUpdated, onDeleted }: ViewEntrySheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const {
    contentBlocks,
    showAudioRecorder,
    setShowAudioRecorder,
    resetContent,
    updateTextContent,
    pickImage,
    takePhoto,
    handleAudioComplete,
    removeBlock,
    getFilteredContent,
  } = useContentEditor(entry?.content || []);

  // Reset content when entry changes
  useEffect(() => {
    if (entry) {
      resetContent(entry.content);
      setIsEditing(false);
    }
  }, [entry, resetContent]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!entry) return;

    setIsSaving(true);
    try {
      await updateEntry(entry.id, { content: getFilteredContent() });
      setIsEditing(false);
      onUpdated();
    } catch (error) {
      console.error('Error saving entry:', error);
      showAlert('Error', 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  }, [entry, getFilteredContent, onUpdated]);

  // Delete entry
  const handleDelete = useCallback(() => {
    confirmAction(
      {
        title: 'Delete Entry',
        message: 'Are you sure? This cannot be undone.',
        confirmText: 'Delete',
        destructive: true,
      },
      async () => {
        if (entry) {
          await deleteEntry(entry.id);
          onDeleted();
          onClose();
        }
      }
    );
  }, [entry, onDeleted, onClose]);

  // Close sheet
  const handleClose = useCallback(() => {
    if (isEditing) {
      confirmAction(
        {
          title: 'Discard Changes?',
          message: 'You have unsaved changes.',
          confirmText: 'Discard',
          cancelText: 'Keep Editing',
          destructive: true,
        },
        () => {
          setIsEditing(false);
          if (entry) resetContent(entry.content);
          onClose();
        }
      );
    } else {
      onClose();
    }
  }, [isEditing, entry, resetContent, onClose]);

  if (!entry) return null;

  return (
    <>
      <BottomSheet visible={visible} onClose={handleClose}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleDelete} style={styles.headerButton}>
            <Icon name="trash-outline" size={IconSize.md} color={colors.error} />
          </Pressable>
          
          <View style={styles.headerCenter}>
            <Text style={styles.dateText}>{formatDate(entry.createdAt)}</Text>
          </View>
          
          {isEditing ? (
            <Pressable 
              onPress={handleSave} 
              style={styles.headerButton}
              disabled={isSaving}
            >
              <Text style={[styles.doneText, isSaving && styles.doneTextDisabled]}>
                {isSaving ? 'Saving...' : 'Done'}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setIsEditing(true)} style={styles.headerButton}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          )}
        </View>

        {/* Content Area */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {contentBlocks.map((block) => (
              <View key={block.id}>
                <ContentBlockRenderer
                  block={block}
                  isEditing={isEditing}
                  onUpdateText={updateTextContent}
                  onRemove={removeBlock}
                />
              </View>
            ))}
          </ScrollView>

          {isEditing && (
            <MediaToolbar
              onPickImage={pickImage}
              onTakePhoto={takePhoto}
              onRecordAudio={() => setShowAudioRecorder(true)}
            />
          )}
        </KeyboardAvoidingView>
      </BottomSheet>

      <AudioRecorderModal
        visible={showAudioRecorder}
        onComplete={handleAudioComplete}
        onCancel={() => setShowAudioRecorder(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerButton: {
    minWidth: 60,
    paddingVertical: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  doneText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
    textAlign: 'right',
  },
  doneTextDisabled: {
    opacity: 0.5,
  },
  editText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.accent,
    textAlign: 'right',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 20,
  },
});
