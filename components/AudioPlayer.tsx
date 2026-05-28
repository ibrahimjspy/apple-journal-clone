/**
 * Apple-style Audio Player with Waveform Display
 * Uses expo-audio (SDK 54 API) for playback.
 */

import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { Icon, IconSize } from './Icons';
import { AudioEntry } from '@/types/journal';
import { formatDurationMs } from '@/utils/time';

interface AudioPlayerProps {
  audio: AudioEntry;
  compact?: boolean;
}

export function AudioPlayer({ audio, compact = false }: AudioPlayerProps) {
  const player = useAudioPlayer({ uri: audio.uri }, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const durationMs = (status.duration ?? 0) * 1000 || audio.duration || 1;
  const currentMs = (status.currentTime ?? 0) * 1000;
  const progress = durationMs > 0 ? Math.min(currentMs / durationMs, 1) : 0;

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      if (progress >= 0.99) {
        player.seekTo(0);
      }
      player.play();
    }
  }, [isPlaying, player, progress]);

  const waveformBars = audio.waveform || new Array(50).fill(0.3);

  if (compact) {
    return (
      <Pressable onPress={togglePlayback} style={styles.compactContainer}>
        <LinearGradient
          colors={[colors.accent, colors.accentSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          <View style={styles.compactPlayButton}>
            <Icon name={isPlaying ? 'pause' : 'play'} size={IconSize.sm} color={colors.accent} />
          </View>
          <View style={styles.compactWaveform}>
            {waveformBars.slice(0, 25).map((level, index) => (
              <View
                key={index}
                style={[
                  styles.compactBar,
                  {
                    height: `${Math.max(20, level * 100)}%`,
                    backgroundColor: index / 25 <= progress
                      ? 'rgba(255,255,255,1)'
                      : 'rgba(255,255,255,0.4)',
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.compactTime}>
            {formatDurationMs(isPlaying ? currentMs : audio.duration)}
          </Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.waveformContainer}>
        {waveformBars.map((level, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: `${Math.max(15, level * 100)}%`,
                backgroundColor: index / waveformBars.length <= progress
                  ? colors.accent
                  : colors.surfaceTertiary,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.controls}>
        <Text style={styles.time}>{formatDurationMs(currentMs)}</Text>
        <Pressable
          onPress={togglePlayback}
          style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={IconSize.lg} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.time}>{formatDurationMs(audio.duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 2,
    marginBottom: spacing.md,
  },
  bar: { width: 3, borderRadius: 1.5, minHeight: 4 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
    width: 40,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { transform: [{ scale: 0.95 }], opacity: 0.9 },
  compactContainer: { flex: 1, borderRadius: borderRadius.lg, overflow: 'hidden' },
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  compactPlayButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactWaveform: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 24, gap: 2 },
  compactBar: { flex: 1, borderRadius: 1, minHeight: 4 },
  compactTime: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    fontWeight: typography.weights.medium,
  },
});
