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
  const textInputRef = useRef<TextInput>(null);
  
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
      setTimeout(() => textInputRef.current?.focus(), 300);
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
    if (!hasContent()) {
      handleClose();
      return;
    }

    setIsSaving(true);
    try {
      const draft: JournalEntryDraft = {
        title: '',
        content: getFilteredContent(),
      };

      await createEntry(draft);
      onSaved();
      handleClose();
    } catch (error) {
      console.error('Error saving entry:', error);
      showAlert('Error', 'Failed to save entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [hasContent, getFilteredContent, onSaved]);

  // Close and reset
  const handleClose = useCallback(() => {
    resetContent();
    setShowAudioRecorder(false);
    onClose();
  }, [onClose, resetContent, setShowAudioRecorder]);

  // Cancel with confirmation if has content
  const handleCancel = useCallback(() => {
    if (hasContent()) {
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
          <Pressable onPress={handleCancel} style={styles.headerButton}>
            <Icon name="bookmark-outline" size={IconSize.md} color={colors.accent} />
          </Pressable>
          
          <View style={styles.headerCenter}>
            <Text style={styles.dateText}>{getCurrentDate()}</Text>
          </View>
          
          <Pressable 
            onPress={handleDone} 
            style={styles.headerButton}
            disabled={isSaving}
          >
            <Text style={[styles.doneText, isSaving && styles.doneTextDisabled]}>
              Done
            </Text>
          </Pressable>
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
