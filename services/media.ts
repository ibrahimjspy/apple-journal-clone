/**
 * Media Persistence Service
 * Copies images and audio from temp picker/recorder URIs to the app's
 * document directory so they survive cache clears and app updates.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { generateId } from '@/utils/id';

const MEDIA_DIR = `${FileSystem.documentDirectory}media/`;
const IMAGES_DIR = `${MEDIA_DIR}images/`;
const AUDIO_DIR = `${MEDIA_DIR}audio/`;

async function ensureDirectories(): Promise<void> {
  for (const dir of [MEDIA_DIR, IMAGES_DIR, AUDIO_DIR]) {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  }
}

/** Copies a picker image from its temp URI to the app's persistent images directory. Returns the new URI. */
export async function saveImageToLocal(tempUri: string): Promise<string> {
  try {
    await ensureDirectories();
    const ext = tempUri.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `${generateId()}.${ext}`;
    const destUri = `${IMAGES_DIR}${filename}`;
    await FileSystem.copyAsync({ from: tempUri, to: destUri });
    return destUri;
  } catch (error) {
    console.error('Failed to persist image:', error);
    throw error;
  }
}

/** Copies a recorder audio file from its temp URI to the app's persistent audio directory. Returns the new URI. */
export async function saveAudioToLocal(tempUri: string): Promise<string> {
  try {
    await ensureDirectories();
    const ext = tempUri.split('.').pop()?.split('?')[0] || 'm4a';
    const filename = `${generateId()}.${ext}`;
    const destUri = `${AUDIO_DIR}${filename}`;
    await FileSystem.copyAsync({ from: tempUri, to: destUri });
    return destUri;
  } catch (error) {
    console.error('Failed to persist audio:', error);
    throw error;
  }
}

/** Safely deletes a media file. Only acts on files under the app's document directory. Never throws. */
export async function deleteMediaFile(uri: string): Promise<void> {
  try {
    if (!uri.startsWith(FileSystem.documentDirectory!)) return;
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri);
    }
  } catch (e) {
    console.error('Error deleting media file:', e);
  }
}
