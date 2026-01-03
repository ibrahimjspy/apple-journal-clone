/**
 * Reusable Audio Recorder Modal
 */

import { View, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';
import { AudioRecorder } from './AudioRecorder';
import { AudioEntry } from '@/types/journal';

interface AudioRecorderModalProps {
  visible: boolean;
  onComplete: (audio: AudioEntry) => void;
  onCancel: () => void;
}

export function AudioRecorderModal({ visible, onComplete, onCancel }: AudioRecorderModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <AudioRecorder
          onRecordingComplete={onComplete}
          onCancel={onCancel}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

