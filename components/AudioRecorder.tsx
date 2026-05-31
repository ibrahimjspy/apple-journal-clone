/**
 * Apple Journal-inspired Audio Recorder
 *
 * Full-screen recording modal with:
 * - Large pulsing red record button (Voice Memos style)
 * - Clean centered timer with SF-like typography
 * - Minimal waveform visualization while recording
 * - Pause/resume and finish controls
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { colors, spacing, borderRadius, typography, fonts } from '@/constants/theme';
import { Icon, IconSize } from './Icons';
import { generateId } from '@/utils/id';
import { formatDurationSecs } from '@/utils/time';
import { showAlert } from '@/utils/alert';
import { AudioEntry } from '@/types/journal';
import {
  RECORDER_LIVE_BAR_COUNT,
  STORED_WAVEFORM_SAMPLE_COUNT,
  AUDIO_RECORDER_STATE_INTERVAL_MS,
} from '@/constants/app';

const NUM_BARS = RECORDER_LIVE_BAR_COUNT;

interface AudioRecorderProps {
  onRecordingComplete: (audio: AudioEntry) => void;
  onCancel: () => void;
}

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

export function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(audioRecorder, AUDIO_RECORDER_STATE_INTERVAL_MS);

  const [hasPermission, setHasPermission] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(new Array(NUM_BARS).fill(0.08));

  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformSamples = useRef<number[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const barAnims = useRef(
    new Array(NUM_BARS).fill(0).map(() => new Animated.Value(0.08))
  ).current;

  useEffect(() => {
    (async () => {
      const status = await requestRecordingPermissionsAsync();
      if (!status.granted) {
        showAlert('Permission needed', 'Please grant microphone access to record voice notes.');
      } else {
        setHasPermission(true);
      }
    })();
  }, []);

  // Pulsing record button animation
  useEffect(() => {
    if (isRecording && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      const ring = Animated.loop(
        Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      ring.start();
      return () => { pulse.stop(); ring.stop(); };
    } else {
      pulseAnim.setValue(1);
      ringOpacity.setValue(0);
    }
  }, [isRecording, isPaused, pulseAnim, ringOpacity]);

  // Drive waveform from real metering data
  const lastMetering = useRef<number>(-160);
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const metering = recorderState.metering ?? -160;
    if (metering === lastMetering.current) return;
    lastMetering.current = metering;

    // Android metering typically ranges -60 (silence) to 0 (max)
    // iOS is similar but can go to -160 for silence
    const minDb = -60;
    const maxDb = 0;
    const clamped = Math.max(minDb, Math.min(maxDb, metering));
    const normalized = (clamped - minDb) / (maxDb - minDb); // 0..1
    // Apply curve to make louder sounds more dramatic
    const curved = Math.pow(normalized, 0.6);
    const variation = (Math.random() - 0.5) * 0.08;
    const level = Math.max(0.05, Math.min(1, curved + variation));

    waveformSamples.current.push(level);

    setWaveformLevels(prev => {
      const next = [...prev.slice(1), level];
      next.forEach((val, i) => {
        Animated.timing(barAnims[i], {
          toValue: val,
          duration: 60,
          useNativeDriver: false,
        }).start();
      });
      return next;
    });
  }, [isRecording, isPaused, recorderState.metering, barAnims]);

  const startDurationTimer = useCallback(() => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    durationInterval.current = setInterval(() => setDuration(prev => prev + 1), 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    durationInterval.current = null;
  }, []);

  const handleRecord = useCallback(async () => {
    if (!hasPermission) { showAlert('Permission needed', 'Please grant microphone access.'); return; }
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setIsPaused(false);
      waveformSamples.current = [];
      setWaveformLevels(new Array(NUM_BARS).fill(0.08));
      startDurationTimer();
    } catch (error) {
      console.error('Failed to start recording:', error);
      showAlert('Error', 'Could not start recording.');
    }
  }, [hasPermission, audioRecorder, startDurationTimer]);

  const handlePause = useCallback(async () => {
    try { await audioRecorder.pause(); stopDurationTimer(); setIsPaused(true); } catch (e) { console.error(e); }
  }, [audioRecorder, stopDurationTimer]);

  const handleResume = useCallback(async () => {
    try { audioRecorder.record(); startDurationTimer(); setIsPaused(false); } catch (e) { console.error(e); }
  }, [audioRecorder, startDurationTimer]);

  const handleDone = useCallback(async () => {
    try {
      stopDurationTimer();
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        const samples = waveformSamples.current;
        const targetLen = STORED_WAVEFORM_SAMPLE_COUNT;
        let waveform: number[];
        if (samples.length <= targetLen) {
          waveform = [...samples];
          while (waveform.length < targetLen) waveform.push(samples[samples.length - 1] || 0.3);
        } else {
          waveform = [];
          const step = samples.length / targetLen;
          for (let i = 0; i < targetLen; i++) {
            const s = Math.floor(i * step);
            const e = Math.floor((i + 1) * step);
            const chunk = samples.slice(s, e);
            waveform.push(chunk.reduce((a, b) => a + b, 0) / chunk.length);
          }
        }
        onRecordingComplete({ id: generateId(), uri, duration: duration * 1000, waveform, createdAt: new Date().toISOString() });
      }
    } catch (error) { console.error('Failed to stop recording:', error); }
    finally { setIsRecording(false); setIsPaused(false); setDuration(0); }
  }, [audioRecorder, duration, onRecordingComplete, stopDurationTimer]);

  const handleCancel = useCallback(async () => {
    stopDurationTimer();
    if (isRecording) { try { await audioRecorder.stop(); } catch {} }
    setIsRecording(false); setIsPaused(false); setDuration(0);
    onCancel();
  }, [audioRecorder, isRecording, onCancel, stopDurationTimer]);

  useEffect(() => { return () => { stopDurationTimer(); }; }, [stopDurationTimer]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleCancel} hitSlop={16}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {!isRecording ? 'Voice Note' : isPaused ? 'Paused' : 'Recording'}
        </Text>
        {isRecording ? (
          <Pressable onPress={handleDone} hitSlop={16}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      {/* Waveform visualization */}
      <View style={styles.waveformArea}>
        {isRecording ? (
          <View style={styles.waveform}>
            {barAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: anim.interpolate({
                      inputRange: [0, 0.3, 0.6, 1],
                      outputRange: [4, 20, 50, 100],
                    }),
                    backgroundColor: isPaused ? colors.textTertiary : colors.accent,
                  },
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.waveform}>
            {new Array(NUM_BARS).fill(0).map((_, i) => (
              <View key={i} style={[styles.waveBar, { height: 4, backgroundColor: colors.surfaceTertiary }]} />
            ))}
          </View>
        )}
      </View>

      {/* Timer */}
      <Text style={styles.timer}>{formatDurationSecs(duration)}</Text>

      {/* Main control area */}
      <View style={styles.controlArea}>
        {!isRecording ? (
          <Pressable onPress={handleRecord} style={({ pressed }) => [pressed && styles.pressed]}>
            <Animated.View style={[styles.recordButton, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.recordInner} />
            </Animated.View>
          </Pressable>
        ) : (
          <View style={styles.recordingControls}>
            <Pressable
              onPress={isPaused ? handleResume : handlePause}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Icon name={isPaused ? 'mic' : 'pause'} size={IconSize.md} color={colors.textPrimary} />
            </Pressable>

            <Pressable onPress={handleDone} style={({ pressed }) => [pressed && styles.pressed]}>
              <Animated.View style={[styles.stopButton, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.stopInner} />
              </Animated.View>
            </Pressable>

            <View style={{ width: 52 }} />
          </View>
        )}
      </View>

      <Text style={styles.hint}>
        {!isRecording ? 'Tap to start recording' : isPaused ? 'Tap mic to resume' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, paddingTop: spacing.lg,
  },
  cancelText: { color: colors.accent, fontSize: typography.sizes.lg, fontFamily: fonts.regular, width: 50 },
  headerTitle: { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: fonts.semibold, textAlign: 'center' },
  doneText: { color: colors.accent, fontSize: typography.sizes.lg, fontFamily: fonts.semibold, width: 50, textAlign: 'right' },

  waveformArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  waveform: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 120, width: '100%', gap: 3 },
  waveBar: { width: 3, borderRadius: 1.5, minHeight: 3 },

  timer: {
    textAlign: 'center', fontSize: 56, fontFamily: fonts.medium,
    color: colors.textPrimary, fontVariant: ['tabular-nums'],
    marginBottom: spacing.xl, letterSpacing: -1,
  },

  controlArea: { alignItems: 'center', paddingBottom: spacing.lg },
  recordButton: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  recordInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.error },
  stopButton: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: 'rgba(248, 113, 113, 0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  stopInner: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.error },

  recordingControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxl },
  secondaryButton: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
  },

  hint: { textAlign: 'center', fontSize: typography.sizes.sm, fontFamily: fonts.regular, color: colors.textTertiary, paddingBottom: spacing.xl, minHeight: 30 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
});
