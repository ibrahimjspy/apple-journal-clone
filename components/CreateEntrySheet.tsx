/**
 * Create Entry Bottom Sheet - Apple Journal Style
 * Refactored to use shared components
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  Pressable,
} from 'react-native';
import { colors, spacing, typography, fonts } from '@/constants/theme';
import { BottomSheet } from './BottomSheet';
import { MediaToolbar } from './MediaToolbar';
import { ContentBlockRenderer } from './ContentBlockRenderer';
import { AudioRecorderModal } from './AudioRecorderModal';
import { useContentEditor } from '@/hooks/useContentEditor';
import { createEntry } from '@/services/storage';
import { JournalEntryDraft } from '@/types/journal';
import { confirmAction, showAlert } from '@/utils/alert';

interface CreateEntrySheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CreateEntrySheet({ visible, onClose, onSaved }: CreateEntrySheetProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const textInputRef = useRef<TextInput>(null);
  // savingRef guards against double-tap creating duplicate entries before
  // the async setIsSaving has had a chance to flip and disable the button.
  const savingRef = useRef(false);
  
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
    hasContent,
    getFilteredContent,
  } = useContentEditor();

  // Focus text input when sheet opens
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => textInputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Get current date formatted
  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Save entry
  const handleDone = useCallback(async () => {
    if (savingRef.current) return; // double-tap guard
    if (!hasContent()) {
      handleClose();
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      const draft: JournalEntryDraft = {
        title: title.trim(),
        content: getFilteredContent(),
      };

      await createEntry(draft);
      onSaved();
      handleClose();
    } catch (error) {
      console.error('Error saving entry:', error);
      showAlert('Error', 'Failed to save entry. Please try again.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [hasContent, getFilteredContent, onSaved, title, handleClose]);

  // Close and reset
  const handleClose = useCallback(() => {
    resetContent();
    setTitle('');
    setShowAudioRecorder(false);
    onClose();
  }, [onClose, resetContent, setShowAudioRecorder]);

  // Cancel with confirmation if has content
  const handleCancel = useCallback(() => {
    if (hasContent() || title.trim()) {
      confirmAction(
        {
          title: 'Discard Entry?',
          message: 'You have unsaved changes.',
          confirmText: 'Discard',
          cancelText: 'Keep Editing',
          destructive: true,
        },
        handleClose
      );
    } else {
      handleClose();
    }
  }, [hasContent, handleClose]);

  return (
    <>
      <BottomSheet visible={visible} onClose={handleCancel}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleCancel}
            style={styles.headerButton}
            accessibilityLabel="Cancel"
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          
          <View style={styles.headerCenter}>
            <Text style={styles.dateText}>{getCurrentDate()}</Text>
          </View>
          
          <Pressable
            onPress={handleDone}
            style={styles.headerButton}
            disabled={isSaving}
            accessibilityLabel="Save entry"
            accessibilityRole="button"
            accessibilityState={{ disabled: isSaving }}
          >
            <Text style={[styles.doneText, isSaving && styles.doneTextDisabled]}>
              {isSaving ? 'Saving…' : 'Done'}
            </Text>
          </Pressable>
        </View>

        {/* Content Area */}
        <View style={styles.keyboardView}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              style={styles.titleInput}
              placeholder="Title (optional)"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />

            {contentBlocks.map((block, index) => (
              <View key={block.id}>
                <ContentBlockRenderer
                  block={block}
                  isEditing={true}
                  onUpdateText={updateTextContent}
                  onRemove={removeBlock}
                  textInputRef={index === 0 ? textInputRef : undefined}
                  useCompactAudio={true}
                />
              </View>
            ))}
          </ScrollView>

          <MediaToolbar
            onPickImage={pickImage}
            onTakePhoto={takePhoto}
            onRecordAudio={() => setShowAudioRecorder(true)}
          />
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
  cancelText: {
    fontSize: typography.sizes.lg,
    fontFamily: fonts.regular,
    color: colors.accent,
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
  dateText: {
    fontSize: typography.sizes.md,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
});
