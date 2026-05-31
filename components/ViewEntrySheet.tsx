/**
 * View/Edit Entry Bottom Sheet - Apple Journal Style
 * Refactored to use shared components
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput,
  StyleSheet, 
  ScrollView, 
  Pressable,
} from 'react-native';
import { colors, spacing, typography, fonts } from '@/constants/theme';
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
  const [entryTitle, setEntryTitle] = useState(entry?.title || '');
  
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
      setEntryTitle(entry.title || '');
      setIsEditing(false);
    }
  }, [entry, resetContent]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!entry) return;

    setIsSaving(true);
    try {
      const result = await updateEntry(entry.id, {
        title: entryTitle.trim(),
        content: getFilteredContent(),
      });
      if (result === null) {
        // updateEntry never throws; null means not-found or storage error.
        // Do NOT exit edit mode — user keeps their unsaved work.
        showAlert('Error', 'Failed to save changes. Please try again.');
        return;
      }
      setIsEditing(false);
      onUpdated();
    } catch (error) {
      console.error('Error saving entry:', error);
      showAlert('Error', 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  }, [entry, getFilteredContent, onUpdated, entryTitle]);

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
        <View style={styles.keyboardView}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isEditing ? (
              <TextInput
                style={styles.titleInput}
                placeholder="Title (optional)"
                placeholderTextColor={colors.textTertiary}
                value={entryTitle}
                onChangeText={setEntryTitle}
                returnKeyType="next"
              />
            ) : entryTitle ? (
              <Text style={styles.titleText}>{entryTitle}</Text>
            ) : null}

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
        </View>
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
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  doneText: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.semibold,
    color: colors.accent,
    textAlign: 'right',
  },
  doneTextDisabled: {
    opacity: 0.5,
  },
  editText: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.medium,
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
  titleInput: {
    fontSize: typography.sizes.xl,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    padding: 0,
  },
  titleText: {
    fontSize: typography.sizes.xl,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
});
