/**
 * Apple-style Audio Recorder with Waveform Visualization
 * Shows real-time audio levels as animated bars
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { Icon, IconSize } from './Icons';
import { generateId } from '@/utils/id';
import { formatDurationSecs } from '@/utils/time';
import { showAlert } from '@/utils/alert';
import { AudioEntry } from '@/types/journal';

const NUM_BARS = 32; // Fewer bars for better visibility on mobile
const UPDATE_INTERVAL = 50; // ms

interface AudioRecorderProps {
  onRecordingComplete: (audio: AudioEntry) => void;
  onCancel: () => void;
}

export function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(NUM_BARS).fill(0.1));
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const meteringInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformHistory = useRef<number[]>([]);
  
  // Animated values for each bar
  const barAnimations = useRef<Animated.Value[]>(
    new Array(NUM_BARS).fill(0).map(() => new Animated.Value(0.1))
  ).current;

  // Update waveform with new metering value
  const updateWaveform = useCallback((level: number) => {
    // Add slight variation for more organic feel
    const variation = (Math.random() - 0.5) * 0.15;
    const adjustedLevel = Math.max(0.1, Math.min(1, level + variation));
    
    // Store for final waveform
    waveformHistory.current.push(adjustedLevel);
    
    // Update display - shift left and add new value
    setWaveformData(prev => {
      const newData = [...prev.slice(1), adjustedLevel];
      
      // Animate bars with faster response
      newData.forEach((value, index) => {
        Animated.timing(barAnimations[index], {
          toValue: value,
          duration: 50,
          useNativeDriver: false,
        }).start();
      });
      
      return newData;
    });
  }, [barAnimations]);

  const startTimers = useCallback(() => {
    if (meteringInterval.current) clearInterval(meteringInterval.current);
    if (durationInterval.current) clearInterval(durationInterval.current);

    meteringInterval.current = setInterval(async () => {
      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording) {
            const metering = status.metering ?? -160;
            const minDb = -50;
            const maxDb = -5;
            const normalizedLevel = Math.max(0, Math.min(1, (metering - minDb) / (maxDb - minDb)));
            updateWaveform(normalizedLevel);
          }
        } catch (e) {
          // Ignore status errors during recording
        }
      }
    }, UPDATE_INTERVAL);

    durationInterval.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  }, [updateWaveform]);

  const pauseTimers = useCallback(() => {
    if (meteringInterval.current) clearInterval(meteringInterval.current);
    if (durationInterval.current) clearInterval(durationInterval.current);
    meteringInterval.current = null;
    durationInterval.current = null;
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission needed', 'Please grant microphone access to record voice notes.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        }
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setIsPaused(false);
      waveformHistory.current = [];

      startTimers();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [startTimers]);

  const pauseRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.pauseAsync();
      pauseTimers();
      setIsPaused(true);
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  }, [pauseTimers]);

  const resumeRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.startAsync();
      startTimers();
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  }, [startTimers]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      // Clear intervals
      if (meteringInterval.current) clearInterval(meteringInterval.current);
      if (durationInterval.current) clearInterval(durationInterval.current);

      // Stop and get URI
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (uri) {
        // Downsample waveform history to fixed size for storage
        const finalWaveform = downsampleWaveform(waveformHistory.current, 50);
        
        const audioEntry: AudioEntry = {
          id: generateId(),
          uri,
          duration: duration * 1000, // Convert to ms
          waveform: finalWaveform,
          createdAt: new Date().toISOString(),
        };
        
        onRecordingComplete(audioEntry);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    } finally {
      recordingRef.current = null;
      setIsRecording(false);
      setDuration(0);
    }
  }, [duration, onRecordingComplete]);

  // Cancel recording
  const cancelRecording = useCallback(async () => {
    if (recordingRef.current) {
      if (meteringInterval.current) clearInterval(meteringInterval.current);
      if (durationInterval.current) clearInterval(durationInterval.current);
      
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        // Ignore errors on cancel
      }
      recordingRef.current = null;
    }
    
    setIsRecording(false);
    setDuration(0);
    setWaveformData(new Array(NUM_BARS).fill(0.1));
    onCancel();
  }, [onCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (meteringInterval.current) clearInterval(meteringInterval.current);
      if (durationInterval.current) clearInterval(durationInterval.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={cancelRecording} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>
          {!isRecording ? 'Voice Note' : isPaused ? 'Paused' : 'Recording'}
        </Text>
        <View style={styles.cancelButton} />
      </View>

      {/* Waveform Visualization */}
      <View style={styles.waveformContainer}>
        <View style={styles.waveform}>
          {barAnimations.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.bar,
                {
                  height: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['5%', '100%'],
                  }),
                  opacity: anim.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [0.4, 0.8, 1],
                  }),
                  backgroundColor: isRecording ? colors.accent : colors.textTertiary,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Duration */}
      <Text style={styles.duration}>{formatDurationSecs(duration)}</Text>

      {/* Controls */}
      <View style={styles.controls}>
        {!isRecording ? (
          <Pressable 
            onPress={startRecording}
            style={({ pressed }) => [
              styles.recordButton,
              pressed && styles.buttonPressed
            ]}
          >
            <LinearGradient
              colors={[colors.error, '#DC2626']}
              style={styles.recordButtonGradient}
            >
              <View style={styles.recordDot} />
            </LinearGradient>
          </Pressable>
        ) : (
          <View style={styles.recordingControls}>
            <Pressable 
              onPress={isPaused ? resumeRecording : pauseRecording}
              style={({ pressed }) => [
                styles.pauseButton,
                pressed && styles.buttonPressed
              ]}
            >
              <Icon 
                name={isPaused ? 'mic' : 'pause'} 
                size={IconSize.lg} 
                color={colors.textPrimary} 
              />
            </Pressable>

            <Pressable 
              onPress={stopRecording}
              style={({ pressed }) => [
                styles.stopButton,
                pressed && styles.buttonPressed
              ]}
            >
              <LinearGradient
                colors={[colors.fabGradientStart, colors.fabGradientEnd]}
                style={styles.stopButtonGradient}
              >
                <Icon name="checkmark" size={IconSize.lg} color={colors.textPrimary} />
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </View>

      {/* Hint text */}
      <Text style={styles.hint}>
        {!isRecording 
          ? 'Tap to start recording'
          : isPaused
            ? 'Paused — tap mic to resume'
            : 'Tap pause or finish when done'}
      </Text>
    </View>
  );
}

// Downsample waveform to fixed number of points
function downsampleWaveform(data: number[], targetLength: number): number[] {
  if (data.length === 0) return new Array(targetLength).fill(0.1);
  if (data.length <= targetLength) {
    // Pad with last value if too short
    const padded = [...data];
    while (padded.length < targetLength) {
      padded.push(data[data.length - 1] || 0.1);
    }
    return padded;
  }
  
  const result: number[] = [];
  const step = data.length / targetLength;
  
  for (let i = 0; i < targetLength; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    const chunk = data.slice(start, end);
    const avg = chunk.reduce((a, b) => a + b, 0) / chunk.length;
    result.push(avg);
  }
  
  return result;
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
  cancelButton: {
    width: 70,
  },
  cancelText: {
    color: colors.accent,
    fontSize: typography.sizes.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
    width: '100%',
    gap: 4,
  },
  bar: {
    width: 5,
    borderRadius: 2.5,
    minHeight: 10,
  },
  duration: {
    textAlign: 'center',
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  recordButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textPrimary,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  pauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  stopButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  hint: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginBottom: spacing.xl,
  },
});

