/**
 * Apple Journal-style Audio Recorder
 *
 * Minimal UI: a large pulsing record button, a timer, and simple stop/done controls.
 * Uses expo-audio (replaces deprecated expo-av recording API).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  useAudioRecorderState,
} from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { Icon, IconSize } from './Icons';
import { generateId } from '@/utils/id';
import { formatDurationSecs } from '@/utils/time';
import { showAlert } from '@/utils/alert';
import { AudioEntry } from '@/types/journal';

interface AudioRecorderProps {
  onRecordingComplete: (audio: AudioEntry) => void;
  onCancel: () => void;
}

export function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 500);

  const [hasPermission, setHasPermission] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveformSamples = useRef<number[]>([]);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        showAlert('Permission needed', 'Please grant microphone access to record voice notes.');
      } else {
        setHasPermission(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, isPaused, pulseAnim]);

  const startDurationTimer = useCallback(() => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    durationInterval.current = setInterval(() => {
      setDuration(prev => prev + 1);
      waveformSamples.current.push(0.3 + Math.random() * 0.7);
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    durationInterval.current = null;
  }, []);

  const handleRecord = useCallback(async () => {
    if (!hasPermission) {
      showAlert('Permission needed', 'Please grant microphone access.');
      return;
    }
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setIsPaused(false);
      waveformSamples.current = [];
      startDurationTimer();
    } catch (error) {
      console.error('Failed to start recording:', error);
      showAlert('Error', 'Could not start recording.');
    }
  }, [hasPermission, audioRecorder, startDurationTimer]);

  const handlePause = useCallback(async () => {
    try {
      await audioRecorder.pause();
      stopDurationTimer();
      setIsPaused(true);
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  }, [audioRecorder, stopDurationTimer]);

  const handleResume = useCallback(async () => {
    try {
      audioRecorder.record();
      startDurationTimer();
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to resume:', error);
    }
  }, [audioRecorder, startDurationTimer]);

  const handleDone = useCallback(async () => {
    try {
      stopDurationTimer();
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri) {
        const targetLen = 50;
        const samples = waveformSamples.current;
        let waveform: number[];
        if (samples.length === 0) {
          waveform = new Array(targetLen).fill(0.3);
        } else if (samples.length <= targetLen) {
          waveform = [...samples];
          while (waveform.length < targetLen) waveform.push(samples[samples.length - 1]);
        } else {
          waveform = [];
          const step = samples.length / targetLen;
          for (let i = 0; i < targetLen; i++) {
            const start = Math.floor(i * step);
            const end = Math.floor((i + 1) * step);
            const chunk = samples.slice(start, end);
            waveform.push(chunk.reduce((a, b) => a + b, 0) / chunk.length);
          }
        }

        const audioEntry: AudioEntry = {
          id: generateId(),
          uri,
          duration: duration * 1000,
          waveform,
          createdAt: new Date().toISOString(),
        };
        onRecordingComplete(audioEntry);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    } finally {
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
    }
  }, [audioRecorder, duration, onRecordingComplete, stopDurationTimer]);

  const handleCancel = useCallback(async () => {
    stopDurationTimer();
    if (isRecording) {
      try { await audioRecorder.stop(); } catch {}
    }
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    onCancel();
  }, [audioRecorder, isRecording, onCancel, stopDurationTimer]);

  useEffect(() => {
    return () => {
      stopDurationTimer();
    };
  }, [stopDurationTimer]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleCancel} hitSlop={12}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>
          {!isRecording ? 'Voice Note' : isPaused ? 'Paused' : 'Recording'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Center area */}
      <View style={styles.centerArea}>
        {/* Pulsing ring behind record button */}
        {isRecording && !isPaused && (
          <Animated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
        )}

        {!isRecording ? (
          <Pressable
            onPress={handleRecord}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <View style={styles.recordButton}>
              <View style={styles.recordDot} />
            </View>
          </Pressable>
        ) : (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
          </View>
        )}

        {/* Timer */}
        <Text style={styles.timer}>{formatDurationSecs(duration)}</Text>

        {isRecording && (
          <Text style={styles.statusText}>
            {isPaused ? 'Recording paused' : 'Listening...'}
          </Text>
        )}
      </View>

      {/* Bottom controls */}
      {isRecording && (
        <View style={styles.bottomControls}>
          <Pressable
            onPress={isPaused ? handleResume : handlePause}
            style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}
          >
            <Icon
              name={isPaused ? 'mic' : 'pause'}
              size={IconSize.md}
              color={colors.textPrimary}
            />
            <Text style={styles.controlLabel}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDone}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <LinearGradient
              colors={[colors.fabGradientStart, colors.fabGradientEnd]}
              style={styles.doneButton}
            >
              <Icon name="checkmark" size={IconSize.lg} color={colors.textPrimary} />
            </LinearGradient>
            <Text style={styles.controlLabel}>Done</Text>
          </Pressable>
        </View>
      )}

      {!isRecording && (
        <Text style={styles.hint}>Tap to start recording</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelText: {
    color: colors.accent,
    fontSize: typography.sizes.lg,
    width: 60,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  recordButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.textTertiary,
  },
  recordDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error,
  },
  recordingIndicator: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingDot: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  timer: {
    fontSize: 48,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: typography.sizes.md,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
  },
  controlLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  doneButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    textAlign: 'center',
    fontSize: typography.sizes.md,
    color: colors.textTertiary,
    paddingBottom: spacing.xxl,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
