/**
 * Reusable Content Editor Hook
 * Handles content blocks, media picking, and audio recording
 */

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ContentBlock, AudioEntry } from '@/types/journal';
import { generateId } from '@/services/storage';
import { showAlert } from '@/utils/alert';

export function useContentEditor(initialContent: ContentBlock[] = []) {
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(
    initialContent.length > 0 ? initialContent : [{ id: generateId(), type: 'text', content: '' }]
  );
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  // Reset content
  const resetContent = useCallback((newContent?: ContentBlock[]) => {
    setContentBlocks(
      newContent && newContent.length > 0 
        ? [...newContent] 
        : [{ id: generateId(), type: 'text', content: '' }]
    );
  }, []);

  // Update text content
  const updateTextContent = useCallback((id: string, content: string) => {
    setContentBlocks(prev => 
      prev.map(block => 
        block.id === id ? { ...block, content } : block
      )
    );
  }, []);

  // Pick image from gallery
  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission needed', 'Please grant photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newBlocks: ContentBlock[] = result.assets.map(asset => ({
        id: generateId(),
        type: 'image' as const,
        content: asset.uri,
        imageData: {
          id: generateId(),
          uri: asset.uri,
          width: asset.width || 0,
          height: asset.height || 0,
        },
      }));

      setContentBlocks(prev => [...prev, ...newBlocks]);
    }
  }, []);

  // Take photo with camera
  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission needed', 'Please grant camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const newBlock: ContentBlock = {
        id: generateId(),
        type: 'image',
        content: asset.uri,
        imageData: {
          id: generateId(),
          uri: asset.uri,
          width: asset.width || 0,
          height: asset.height || 0,
        },
      };

      setContentBlocks(prev => [...prev, newBlock]);
    }
  }, []);

  // Handle audio recording complete
  const handleAudioComplete = useCallback((audio: AudioEntry) => {
    const newBlock: ContentBlock = {
      id: generateId(),
      type: 'audio',
      content: audio.uri,
      audioData: audio,
    };

    setContentBlocks(prev => [...prev, newBlock]);
    setShowAudioRecorder(false);
  }, []);

  // Remove content block
  const removeBlock = useCallback((id: string) => {
    setContentBlocks(prev => {
      const filtered = prev.filter(block => block.id !== id);
      if (filtered.length === 0 || !filtered.some(b => b.type === 'text')) {
        return [...filtered, { id: generateId(), type: 'text', content: '' }];
      }
      return filtered;
    });
  }, []);

  // Check if has content
  const hasContent = useCallback(() => {
    return contentBlocks.some(block => 
      (block.type === 'text' && block.content.trim()) ||
      block.type === 'image' ||
      block.type === 'audio'
    );
  }, [contentBlocks]);

  // Get filtered content (remove empty text blocks)
  const getFilteredContent = useCallback(() => {
    return contentBlocks.filter(block =>
      block.type !== 'text' || block.content.trim()
    );
  }, [contentBlocks]);

  return {
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
  };
}

